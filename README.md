# Local development with Docker

Keep the `personal-content` repository next to this one (`../personal-content`). Docker and Docker Compose are required.

```sh
make up
```

The site is available at http://localhost:8081. Changes to the web app reload automatically, and changes in `../personal-content` are imported within a few seconds. Rebuild with `make up` after changing dependencies. Use `make logs` to inspect containers and `make down` to stop them. The local SQLite database stays in a Docker volume until removed explicitly.

## Post dates and images

Home, blog, category and tag lists show posts from most recently updated to least recently
updated using the frontmatter `updated_at`. The importer normalizes timestamps to UTC for
chronological sorting. If `updated_at` is absent, it uses `date`, which falls back to Obsidian's
`created_at`. The displayed publication date still comes from `date`:

```yaml
date: 2026-11-08
updated_at: 2026-11-08T12:30:00-03:00
```

The home page features the latest entry with its frontmatter `image` and title, followed by
the next five entries without repeating the featured post. Save the hero file in
`personal-content/assets/` and reference its public path in the post:

```yaml
image: /assets/my-photo.jpg
```

Use `%20` for spaces in the path. An absent or empty `image` keeps a text-only hero; an empty
collection leaves the latest-entry list empty. The article template includes an empty `image`
property ready to fill in.

Store images in `personal-content/assets/` (subfolders are supported). Posts and portfolio pages
can keep Obsidian image embeds, including spaces and optional dimensions:

```markdown
![[Pasted image 20261108005033.png]]
![[assets/photos/example.jpg|640]]
![[example.jpg|640x480]]
```

The importer converts them to web image URLs in the generated copies without modifying the
source notes. Bare filenames must identify a unique image under `assets/`; use an explicit
`assets/subfolder/image.png` path for duplicate filenames. Missing or ambiguous images stop
the import with an error. Code examples and note embeds are preserved.

Standard Markdown with a root-relative `/assets/` URL also works. Encode spaces as `%20`:

```markdown
![Article illustration](/assets/Pasted%20image%2020261108005033.png)
```

`scripts/prepare-content.ts` generates the site configuration, imports the content and converts
Obsidian images and dates before the web app's `dev`, `build` and `generate` commands start.
Docker uses the same pipeline. To prepare content manually from the repository root:

```sh
pnpm content:prepare
```

Local imports refresh automatically while the Docker stack is running; production regenerates
and publishes pages with `make prod`, using prebuilt images.
Run preparation checks with `node --import tsx --test scripts/*.test.ts`.

## Post navigation and RSS

Each article links to the previous (older) and next (newer) published entry by `updated_at`.
Drafts are excluded, and the first and last entries show only the neighbor that exists.
Navigation updates the article body, title and audio source without requiring a reload.

The RSS 2.0 feed is available at `/rss.xml` (`https://nicolasvillarroel.cl/rss.xml` in production).
It contains published post titles, summaries, canonical links and publication dates, ordered by
their latest update. A footer link and an HTML alternate-feed link expose it to readers.
The feed is regenerated with the static site when content changes.

Caddy serves each route's generated `index.html` before falling back to Nuxt's `200.html`,
so direct loads and reloads retain the requested page. Publish a new web image when Caddy changes.
Check the served site, including adjacent links, reload payloads and RSS discovery, with:

```sh
python3 scripts/check_blog_navigation.py http://localhost:8081
```

## Image optimization and build caches

Content preparation converts PNG and JPEG assets to WebP at quality 80, limits both dimensions
to 1600 pixels without enlarging smaller images, applies EXIF orientation and removes metadata.
Original files in `personal-content` remain unchanged. Hero/frontmatter images, Obsidian embeds,
standard `/assets/` URLs and generated site configuration point to the optimized files.
GIF, SVG and existing WebP files are copied unchanged.

ImageMagick 7 with WebP support is required for preparation and script tests; both web Docker
images declare it. Conversion results live in `.cache/images`, keyed by source bytes, encoder
version and compression settings. Unchanged images are reused; changed images get new hashed
URLs, which also prevent stale browser/CDN responses. Local Docker keeps this cache in the
`web_image_cache` volume.

Production uses the same persistent `personal-site_web_image_cache` volume for image conversion.
Dependencies and build tools are already installed in the renderer image; neither content nor
generated audio is baked into runtime images. GitHub Actions caches image build layers separately.
Nuxt still generates the complete static site when publishing content; unchanged image conversions
and narration are reused. The first generation after migration may have a cold image cache because
the previous production cache lived inside the container builder.

## Production with reusable GHCR images

The site repository's **Publish Runtime Images** workflow builds four Linux amd64 images whenever
`main` changes, then dispatches deployment only after every image is published:

| Image under `ghcr.io/themakunga/` | Purpose                                                                            |
| --------------------------------- | ---------------------------------------------------------------------------------- |
| `personal-site-renderer`          | Installed Node dependencies, ImageMagick, application source and static generation |
| `personal-site-tts`               | Piper, Opus encoding and the narration script                                      |
| `personal-site-comments-api`      | Persistent comments and authentication service                                     |
| `personal-site-web`               | Caddy configuration and static HTTP serving                                        |

Images use `sha-<full personal-site commit>` tags. `make` selects the current site commit by default;
`SITE_IMAGE_TAG` can explicitly select an already-published compatible version. Wait for its image
workflow to succeed before deploying that revision. The images contain application code, not posts,
portfolio content, generated audio or credentials. A content-only commit never builds an image.

```sh
make pull   # Download missing runtime/tool images for the current site revision
make prod   # Reuse images, generate changed audio, render and publish, reconcile services
make deploy # Fast-forward site and content repositories, then run make prod
```

`make prod` mounts `../personal-content` read-only, generates audio into `apps/web/public/audio`,
then renders inside a disposable tool container. It copies the completed output into a release
directory in `personal-site-prod_site_public` and atomically switches its `current` symlink.
Caddy serves that volume read-only. Publication avoids copying private SELinux labels from the renderer. A narration,
generation or copy failure leaves the previous
site active. Publication retains the current and previous release; older release directories are
removed. The long-running API and web services are reconciled without builds or forced restarts.
No API restart is needed for a content-only update with the same image tag.

The production project remains `personal-site-prod`, preserving `personal-site-prod_sqlite_data`.
Existing `personal-site_tts_audio_cache` and `personal-site_tts_voice_models` volumes are reused,
as is the host audio output directory. Do not remove these volumes during migration. Local
development continues to use `docker-compose.local.yml` and can build images with `make up`.
The three shared cache/model volumes are external to both Compose projects. `make volumes`
creates missing ones without changing existing data; the normal start/audio/deploy targets invoke
it automatically. Direct Compose commands require running `make volumes` once first.
Nuxt telemetry is disabled in project configuration and renderer/development environments, so
generation does not prompt for consent. Make targets also disable Podman's external-provider notice;
actual errors and other warnings remain visible.

### First publication and migration

1. Publish the site changes and wait for all four GHCR images for that commit to be available.
2. Confirm the deployment host can pull them. GHCR packages must either allow public reads or the
   runtime user must already be logged in with private `read:packages` access. Never commit tokens.
3. In `personal-content`, replace its old image-building workflow with the **Deploy Content**
   workflow. It runs `make deploy` on a configured self-hosted runner for content pushes, manual
   runs and the site's `trigger-build` dispatch. Configure the `DEPLOY_DIR` variable and
   the site's `CONTENT_REPO_DISPATCH_TOKEN` secret. Confirm the runner is online and can access
   both repositories and the container engine. Disable/remove the old content build workflow first
   so an overlapping deployment cannot run the obsolete build path.
4. Back up SQLite, verify clean host checkouts and existing cache/model volumes, then run
   `make deploy` on the host. The first run fills the shared public volume before replacing Caddy.
5. Verify direct article loads, navigation, RSS, images and audio using the existing HTTP checkers.
   Record source revisions separately from published image tags and the live deployment.

The previous release directory is retained for inspection, but application rollback also requires
the matching source/image revision. `make prod` does not clear CDN caches or skip Nuxt generation.
If a selected SHA has not been published, image pulling fails before generation/publication.
Without the dispatch secret, image publication succeeds with a manual-deployment notice.
At the 2026-11-12 inspection, GitHub reported no repository self-hosted runners for `personal-content`,
no `DEPLOY_DIR` variable and no repository secrets for `personal-site`. Automatic deployment therefore
requires provisioning those separately; the manual `make deploy` path does not depend on them.

References: [GHCR publication](https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images),
[image build caches](https://docs.docker.com/build/ci/github-actions/cache/),
[Compose pull policies](https://docs.docker.com/reference/cli/docker/compose/pull/).

## Article audio

Add `audio` to a post frontmatter to generate Ogg Opus narration with Piper:

```yaml
audio: es-CL # Chilean Spanish
```

The supported values are `es-CL`, `es-MX`, and `en-US`. Piper does not currently provide an official Chilean model, so `es-CL` uses the high-quality Argentine `es_AR-daniela-high` voice as the closest regional option. While the local stack is running, the `tts` container watches `../personal-content/posts` and regenerates changed articles. Models and generation hashes stay in Docker volumes; generated files are written to `apps/web/public/audio` and are not committed.

```sh
make audio        # Generate changed articles
make audio-force  # Regenerate all enabled articles
make audio-test   # Test audio generation, caching and delivery checks
python3 -m unittest discover -s scripts -p test_production_audio.py # Test no-build deploy and failure ordering
python3 -m unittest discover -s scripts -p test_publish_site.py     # Test atomic site publication
```

`make prod` (also called by `make deploy`) runs the prebuilt TTS image before static generation,
so `.ogg` files are copied into the published release. A synthesis failure stops
the deployment. The first run downloads voice models; later runs reuse cached models and audio.
Audio is encoded as mono Opus at a 32 kb/s VBR target, tuned for speech. The output extension
is `.ogg`, and the player declares `audio/ogg; codecs=opus`. Cache hashes include encoder settings;
the first run after this format change regenerates enabled articles, then unchanged audio is reused.
Generated audio is excluded from image build contexts. The player versions Ogg URLs
with the article's update timestamp to avoid stale CDN responses.
Verify a deployed player's audio using its generated article HTML:

```sh
python3 scripts/check_article_audio.py https://nicolasvillarroel.cl/blog/2026/las-aventuras-de-nico-pt1/index.html
```

OAuth sign-in requires provider credentials in a local `.env` file (see `.env.example`); the stack starts without them.

## Comments

See [Comments and social login setup](COMMENTS_SETUP.md) for the step-by-step Google, GitHub,
Apple and LinkedIn implementation and verification checklist.

Posts opt in through frontmatter (documented in `personal-content`):

```yaml
show_comments: true # render existing comments
enable_comments: true # allow login and new comments
```

New comments are stored as `pending` and are hidden until approved. The admin API listens on
`127.0.0.1:3001` only, so reach it through an SSH tunnel:

```bash
ssh -L 3001:127.0.0.1:3001 nicolas@192.168.5.153
curl localhost:3001/comments                                   # list pending
curl -X PATCH localhost:3001/comments/<id> \
  -H 'content-type: application/json' -d '{"status":"visible"}' # approve
```

### Required environment (`.env` on the host)

| Variable                                   | Where to get it                                                           |
| ------------------------------------------ | ------------------------------------------------------------------------- |
| `PUBLIC_URL`, `TRUSTED_ORIGINS`            | Your public origin, e.g. `https://nicolasvillarroel.cl` (no trailing `/`) |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | GitHub OAuth App (below)                                                  |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google Cloud OAuth client (below)                                         |
| `ALTCHA_HMAC_KEY`                          | Any random secret: `openssl rand -hex 32`                                 |
| `CLOUDFLARE_TUNNEL_TOKEN`                  | Cloudflare Zero Trust → Networks → Tunnels → your tunnel → Configure      |

**GitHub** — https://github.com/settings/developers → _New OAuth App_.
Homepage URL: `https://nicolasvillarroel.cl`.
Authorization callback URL: `https://nicolasvillarroel.cl/api/auth/callback/github`.
Then _Generate a new client secret_ and copy both values.

**Google** — https://console.cloud.google.com/apis/credentials → _Create credentials_ → _OAuth client ID_
→ type _Web application_. If asked, first configure the OAuth consent screen (_External_, app name,
your email; the `openid email profile` scopes are enough).
Authorized JavaScript origin: `https://nicolasvillarroel.cl`.
Authorized redirect URI: `https://nicolasvillarroel.cl/api/auth/callback/google`.

One provider is enough: with empty credentials for the other, its login button just fails. After
editing `.env`, run `make prod` on the host (the API reads the variables at start).

## Homepage

Set `featured: true` in post frontmatter to select the latest published featured post for the
hero. Below it, six image tiles show the latest published posts with a nonempty `image`.
The final list uses `blog.postPerPage` (default: five) and static `/page/2`, `/page/3` routes.
All sections sort by `updated_at` descending, then path descending, and exclude drafts.
The sections are independent; posts can appear in more than one section.

Run `python3 scripts/test_homepage.py` after installing the existing dependencies to generate a
fixture site and check selection, prerendered pagination and all four flat comment flag combinations.
It restores the imported source content afterwards; run the normal generate command to restore the
production build output. `CONTENT_DIR` can select the source content repository.

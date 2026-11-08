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
the import with an error. Code examples, note embeds and existing Markdown images are preserved.

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

Local imports refresh automatically while the Docker stack is running; production requires a
rebuild with `make prod`.
Run importer checks with `node --import tsx --test scripts/prepare-markdown.test.ts`.

## Article audio

Add `audio` to a post frontmatter to generate an MP3 with Piper:

```yaml
audio: es-CL # Chilean Spanish
```

The supported values are `es-CL`, `es-MX`, and `en-US`. Piper does not currently provide an official Chilean model, so `es-CL` uses the high-quality Argentine `es_AR-daniela-high` voice as the closest regional option. While the local stack is running, the `tts` container watches `../personal-content/posts` and regenerates changed articles. Models and generation hashes stay in Docker volumes; generated files are written to `apps/web/public/audio` and are not committed.

```sh
make audio        # Generate changed articles
make audio-force  # Regenerate all enabled articles
make audio-test   # Test Markdown/frontmatter processing
python3 -m unittest discover -s scripts -p test_production_audio.py # Test production audio ordering
```

`make prod` (also called by `make deploy`) generates changed article audio before building the
production web image, so MP3 files are included in the served site. A synthesis failure stops
the deployment. The first run downloads voice models; later runs reuse cached models and audio.
The player versions MP3 URLs with the article's update timestamp to avoid stale CDN responses.
Verify a deployed player's audio using its generated article HTML:

```sh
python3 scripts/check_article_audio.py https://nicolasvillarroel.cl/blog/2026/las-aventuras-de-nico-pt1/index.html
```

OAuth sign-in requires provider credentials in a local `.env` file (see `.env.example`); the stack starts without them.

## Comments

Posts opt in through frontmatter (documented in `personal-content`):

```yaml
comments:
  show: true # render existing comments
  enable: true # allow login and new comments
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

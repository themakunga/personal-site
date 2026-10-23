# Local development with Docker

Keep the `personal-content` repository next to this one (`../personal-content`). Docker and Docker Compose are required.

```sh
make up
```

The site is available at http://localhost:8080. Changes to the web app reload automatically, and changes in `../personal-content` are imported within a few seconds. Rebuild with `make up` after changing dependencies. Use `make logs` to inspect containers and `make down` to stop them. The local SQLite database stays in a Docker volume until removed explicitly.

## Article audio

Add `audio` to a post frontmatter to generate an MP3 with Piper:

```yaml
audio: es-MX # Latin American Spanish
```

The supported values are `es-MX` and `en-US`. While the local stack is running, the `tts` container watches `../personal-content/posts` and regenerates changed articles. Models and generation hashes stay in Docker volumes; generated files are written to `apps/web/public/audio` and are not committed.

```sh
make audio        # Generate changed articles
make audio-force  # Regenerate all enabled articles
make audio-test   # Test Markdown/frontmatter processing
```

OAuth sign-in requires provider credentials in a local `.env` file (see `.env.example`); the stack starts without them.

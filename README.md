# Local development with Docker

Keep the `personal-content` repository next to this one (`../personal-content`). Docker and Docker Compose are required.

```sh
make up
```

The site is available at http://localhost:8080. Changes to the web app reload automatically, and changes in `../personal-content` are imported within a few seconds. Rebuild with `make up` after changing dependencies. Use `make logs` to inspect containers and `make down` to stop them. The local SQLite database stays in a Docker volume until removed explicitly.

OAuth sign-in requires provider credentials in a local `.env` file (see `.env.example`); the stack starts without them.

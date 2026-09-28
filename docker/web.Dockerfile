# Static site served by Caddy
# Build: docker build -f docker/web.Dockerfile -t ghcr.io/themakunga/personal-site .
# Requires: apps/web/.output/public to exist (run pnpm generate first)
FROM caddy:2-alpine

COPY Caddyfile /etc/caddy/Caddyfile
COPY apps/web/.output/public /srv

EXPOSE 80

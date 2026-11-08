# Static site served by Caddy, built entirely inside Docker (no registry, no host Node needed).
# Needs .content/ (a copy of the personal-content repo), created by `make prod`.
FROM node:24-alpine AS build
RUN apk add --no-cache python3 make g++ imagemagick imagemagick-jpeg imagemagick-webp
RUN npm install -g pnpm@12.5.1
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
RUN --mount=type=cache,id=personal-site-pnpm,target=/pnpm/store,sharing=locked \
    pnpm install --frozen-lockfile --store-dir /pnpm/store
COPY scripts scripts
COPY apps/web apps/web
COPY .content/site.yaml /content/site.yaml
COPY .content/posts /content/posts
COPY .content/portfolio /content/portfolio
COPY .content/assets /content/assets
ENV CONTENT_DIR=/content
RUN --mount=type=cache,id=personal-site-images,target=/app/.cache/images,sharing=locked \
    pnpm generate

FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/apps/web/.output/public /srv
EXPOSE 80

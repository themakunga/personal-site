# Reusable content renderer. Content and caches are mounted when this image runs.
FROM node:24-alpine AS renderer
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
RUN mkdir -p generated
ENV CONTENT_DIR=/content
CMD ["sh", "-c", "pnpm generate && python3 scripts/publish_site.py apps/web/.output/public /publish"]

# Reusable HTTP server. The renderer publishes into the shared volume.
FROM caddy:2-alpine AS web
COPY Caddyfile /etc/caddy/Caddyfile
EXPOSE 80 3443

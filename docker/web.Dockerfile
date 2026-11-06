# Static site served by Caddy, built entirely inside Docker (no registry, no host Node needed).
# Needs .content/ (a copy of the personal-content repo), created by `make prod`.
FROM node:24-alpine AS build
RUN apk add --no-cache python3 make g++
RUN npm install -g pnpm@12.5.1
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --frozen-lockfile
COPY . .
COPY .content /content
ENV CONTENT_DIR=/content
RUN pnpm config:generate && pnpm content:import && pnpm generate

FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/apps/web/.output/public /srv
EXPOSE 80

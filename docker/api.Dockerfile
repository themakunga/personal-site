# Hono API
# Build: docker build -f docker/api.Dockerfile -t ghcr.io/themakunga/personal-site-api .
FROM node:24-alpine AS base
RUN npm install -g pnpm@12.5.1

WORKDIR /app

# Install production deps only
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile --prod --filter api

# Copy source (tsx runs TS directly)
COPY apps/api ./apps/api

WORKDIR /app/apps/api

EXPOSE 3000
CMD ["node", "--import", "tsx/esm", "src/index.ts"]

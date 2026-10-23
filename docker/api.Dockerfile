# Hono API
# Build: docker build -f docker/api.Dockerfile -t ghcr.io/themakunga/personal-site-api .
FROM node:24-alpine AS build
RUN apk add --no-cache python3 make g++
RUN npm install -g pnpm@12.5.1

WORKDIR /app

# tsx is needed to run the TypeScript entry point
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile --filter api

# Copy source (tsx runs TS directly)
COPY apps/api ./apps/api

FROM node:24-alpine
COPY --from=build /app /app
WORKDIR /app/apps/api

EXPOSE 3000
CMD ["node", "--import", "tsx/esm", "src/index.ts"]

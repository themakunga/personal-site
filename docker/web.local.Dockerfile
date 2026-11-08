FROM node:24-alpine
RUN apk add --no-cache python3 make g++ imagemagick imagemagick-jpeg imagemagick-webp
RUN npm install -g pnpm@12.5.1
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
RUN --mount=type=cache,id=personal-site-pnpm,target=/pnpm/store,sharing=locked \
    pnpm install --frozen-lockfile --store-dir /pnpm/store
COPY apps/web apps/web
COPY scripts scripts
RUN mkdir generated

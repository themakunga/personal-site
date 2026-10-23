FROM node:24-alpine
RUN apk add --no-cache python3 make g++
RUN npm install -g pnpm@12.5.1
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/web apps/web
RUN pnpm install --frozen-lockfile
COPY scripts scripts
RUN mkdir generated

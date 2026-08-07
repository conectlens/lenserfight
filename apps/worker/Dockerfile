# apps/worker — long-running background worker (battle jobs, workflow
# scheduling, vote anomaly detection, webhook drain, ...). Deployed as a
# Render "Background Worker" (or any host that keeps a process alive
# continuously — this is NOT compatible with serverless/edge platforms like
# Cloudflare Workers, which have per-request execution limits).
#
# Build context must be the monorepo root, e.g.:
#   docker build -f apps/worker/Dockerfile -t lenserfight-worker .

FROM node:22-slim AS build
WORKDIR /repo

# This repo keeps every dependency in the root package.json (no per-package
# pnpm workspace filtering — see pnpm-workspace.yaml), so `pnpm install` here
# pulls in the full dev tree, including native modules (node-pty, sharp,
# dtrace-provider, @swc/core, ...) used by other apps in the monorepo.
# python3 + a C/C++ toolchain are required for their node-gyp builds.
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@11.18.0 --activate

# Install full workspace deps first so the Docker layer cache survives
# source-only changes.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml nx.json tsconfig.base.json ./
COPY apps ./apps
COPY libs ./libs
COPY supabase ./supabase
RUN pnpm install --frozen-lockfile

RUN pnpm nx run worker:build:production --skip-nx-cache

FROM node:22-slim AS runtime
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.18.0 --activate

COPY --from=build /repo/dist/apps/worker/package.json ./package.json
COPY --from=build /repo/dist/apps/worker/pnpm-lock.yaml ./pnpm-lock.yaml
# pnpm-workspace.yaml carries the allowBuilds list (native postinstall
# scripts pnpm otherwise refuses to run, e.g. @swc/core, protobufjs).
COPY pnpm-workspace.yaml ./pnpm-workspace.yaml
# nx generates this lockfile fresh at build time (pruned to just this app's
# deps) — it won't carry the root workspace's `overrides` block, so the
# strict frozen-lockfile config-match check doesn't apply here.
RUN pnpm install --prod --no-frozen-lockfile

COPY --from=build /repo/dist/apps/worker/main.js ./main.js

ENV NODE_ENV=production
EXPOSE 9090
CMD ["node", "main.js"]

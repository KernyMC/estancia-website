# Production image for the Astro site (SSR, @astrojs/node standalone).
# Debian slim rather than alpine: Prisma ships Rust binaries (schema engine)
# that need extra musl binaryTargets on alpine — not worth the debugging.
#
# pnpm is pinned via npm instead of corepack: corepack bundled with Node 22
# rejects newer pnpm releases with "Cannot find matching keyid".
FROM node:22-slim AS base
# node:22-slim ships without openssl; Prisma's engine needs it to detect the
# libssl version and otherwise falls back to a guess (openssl-1.1.x) with a
# warning on every boot — confirmed locally via `docker logs`.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm@11.12.0
WORKDIR /app

# ---- dependencies (dev included: the astro and prisma CLIs live there) ----
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ---- build ----
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# The Prisma client is generated into src/server/generated (gitignored, so it
# is never in the build context) and Astro bundles it — this order matters.
RUN pnpm exec prisma generate
RUN pnpm build

# ---- runtime ----
FROM base AS runtime
ENV NODE_ENV=production
# The node adapter binds to HOST/PORT; 0.0.0.0 so Traefik can reach it.
ENV HOST=0.0.0.0
ENV PORT=4321
# Full node_modules (not --prod): `prisma migrate deploy` on boot needs the
# Prisma CLI, which is a devDependency.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml prisma.config.ts ./
COPY prisma ./prisma
EXPOSE 4321
# Migrations run at boot, not at build: the database is only reachable from
# inside the Docker network, and the builder has no access to it.
#
# The backgrounded subshell fires the availability warm-up exactly once the
# server is actually accepting connections, on every boot (redeploy, crash
# restart, whatever) — not just on the cron's 10-minute tick. Without it a
# fresh container serves empty availability tables until the next tick. This
# does NOT violate "cache-only during render" (see CLAUDE.md): it's a boot
# action decoupled from any user request, same authority as the cron, just
# triggered once immediately instead of on a timer. `exec` at the end hands
# off to node as PID 1 so it still receives SIGTERM correctly.
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && (until node -e \"fetch('http://localhost:4321').then(()=>process.exit(0),()=>process.exit(1))\" 2>/dev/null; do sleep 1; done; node -e \"fetch('http://localhost:4321/api/cron/warm-availability',{headers:{authorization:'Bearer '+process.env.CRON_SECRET}}).then(r=>r.text()).then(t=>console.log('[boot-warm]',t)).catch(e=>console.error('[boot-warm] failed',e))\") & exec node ./dist/server/entry.mjs"]

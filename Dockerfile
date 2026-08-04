# syntax=docker/dockerfile:1

# =============================================================================
# Atlas — multi-stage build.
#
# The runtime image carries only the standalone server output. `pg` and the SQL live in a
# separate `tools` stage, so the migration tooling never ships to production.
# =============================================================================

FROM node:22-alpine AS base
# Next's standalone server needs glibc compatibility shims on Alpine.
RUN apk add --no-cache libc6-compat
WORKDIR /app


# --- Dependencies ------------------------------------------------------------
# Copied on their own so a source change does not invalidate the install layer.
FROM base AS deps
COPY package.json package-lock.json* pnpm-lock.yaml* ./
RUN if [ -f pnpm-lock.yaml ]; then \
      corepack enable && pnpm install --frozen-lockfile; \
    else \
      npm ci; \
    fi


# --- Build -------------------------------------------------------------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Standalone output is enabled ONLY here, so Vercel builds are unaffected (next.config.ts).
ENV DOCKER_BUILD=1
ENV NEXT_TELEMETRY_DISABLED=1
RUN if [ -f pnpm-lock.yaml ]; then corepack enable && pnpm build; else npm run build; fi


# --- Tools -------------------------------------------------------------------
# Used by the `migrate` and `seed` one-off services in docker-compose.
FROM base AS tools
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY scripts ./scripts
COPY supabase ./supabase
CMD ["node", "scripts/migrate.mjs", "supabase/migrations/0001_init.sql"]


# --- Runner ------------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]

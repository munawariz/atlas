# syntax=docker/dockerfile:1
# Self-host Atlas (Next.js standalone) outside Vercel.
#   docker compose build && docker compose up -d   →   http://localhost:3000

# ---- base ----
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# ---- deps: install all deps, cached on the lockfile ----
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder: compile the standalone server ----
FROM base AS builder
ENV DOCKER_BUILD=1
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- tools: one-off schema migrate / seed (needs pg + the scripts + SQL) ----
FROM base AS tools
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY scripts ./scripts
COPY supabase ./supabase
CMD ["node", "scripts/migrate.mjs", "supabase/migrations/0001_init.sql"]

# ---- runner: minimal production image ----
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]

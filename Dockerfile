# BiharSe — multi-stage Dockerfile (bun + Next.js standalone).
#
# Two build variants, selected with --build-arg DB_CLIENT:
#   DB_CLIENT=sqlite (default) → app talks to the bundled SQLite file (prisma/schema.prisma)
#   DB_CLIENT=mysql            → app talks to MySQL 8 via prisma/schema.mysql.prisma
#
#   docker build --build-arg DB_CLIENT=mysql -t biharse-mysql .
#
# NOTE: the two Prisma schemas must stay in lockstep — see prisma/schema.mysql.prisma.

# ── 1. deps: install node_modules once ────────────────────────────────────────
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# ── 2. builder: generate the right Prisma client, build Next.js standalone ───
FROM oven/bun:1 AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Placeholder so any build-time DB touch (e.g. sitemap's DB branch) fails fast
# and falls back — src/app/sitemap.ts catches and renders a static catalogue.
ENV DATABASE_URL=file:/tmp/build-placeholder.db
COPY --from=deps /app/node_modules ./node_modules
COPY package.json bun.lock next.config.ts tsconfig.json tailwind.config.ts postcss.config.mjs components.json ./
COPY prisma ./prisma
COPY src ./src
COPY public ./public
COPY scripts ./scripts

# NEXT_PUBLIC_* vars are baked into the client bundle at BUILD time.
ARG NEXT_PUBLIC_GA4_ID=""
ARG NEXT_PUBLIC_META_PIXEL_ID=""
ENV NEXT_PUBLIC_GA4_ID=$NEXT_PUBLIC_GA4_ID
ENV NEXT_PUBLIC_META_PIXEL_ID=$NEXT_PUBLIC_META_PIXEL_ID

# DB_CLIENT selects the Prisma client that gets baked into the standalone bundle.
#   mysql  → generate from prisma/schema.mysql.prisma: the default `client` generator
#            (node_modules/.prisma/client, used by src/lib/db.ts via @prisma/client)
#            AND the `mysqlExport` generator (prisma/generated/mysql, used by
#            scripts/import-to-mysql.mjs) — one command produces both.
#   sqlite → default schema (prisma/schema.prisma).
ARG DB_CLIENT=sqlite
RUN if [ "$DB_CLIENT" = "mysql" ]; then \
      bunx prisma generate --schema prisma/schema.mysql.prisma; \
    else \
      bunx prisma generate; \
    fi

RUN bun run build

# ── 3. runtime: slim bun image, standalone server + prisma CLI for boot-time push ──
# Full node_modules is copied (not just node_modules/prisma + @prisma) because the
# prisma CLI has hoisted transitive deps; for a local stack the extra MBs are fine.
FROM oven/bun:1-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV DB_CLIENT=sqlite

# Standalone server (includes its own traced node_modules) + static assets
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# Schemas (both variants) + generated mysql client for scripts/import-to-mysql.mjs
COPY --from=builder /app/prisma ./prisma
# Prisma CLI + full dependency tree → `db push` / `seed.mjs` inside the container
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/scripts ./scripts

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh && mkdir -p /app/db

EXPOSE 3000
ENTRYPOINT ["docker-entrypoint.sh"]

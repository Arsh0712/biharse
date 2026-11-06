#!/bin/sh
# BiharSe container entrypoint — prepare the DB, then start the Next.js server.
#
# DB_CLIENT=mysql  → wait for MySQL, push prisma/schema.mysql.prisma, optionally
#                    import /tmp/biharse-mysql-dump.json (mount it read-only from
#                    the host — see docker-compose.yml), then start.
# DB_CLIENT=sqlite → push the default prisma/schema.prisma against DATABASE_URL
#                    (set DATABASE_URL=file:/app/db/custom.db for the SQLite
#                    variant) and start.
set -e

DB_CLIENT="${DB_CLIENT:-sqlite}"
PRISMA="/app/node_modules/.bin/prisma"

echo "[biharse-entrypoint] DB_CLIENT=${DB_CLIENT}"

if [ "$DB_CLIENT" = "mysql" ]; then
  MYSQL_HOST="${MYSQL_HOST:-mysql}"
  MYSQL_PORT="${MYSQL_PORT:-3306}"

  # Wait for MySQL: plain TCP probe (no mysql client binary in this image).
  echo "[biharse-entrypoint] waiting for MySQL at ${MYSQL_HOST}:${MYSQL_PORT} …"
  i=0
  until bun -e "const net=require('net');const s=net.connect(${MYSQL_PORT},'${MYSQL_HOST}');s.on('connect',()=>{s.destroy();process.exit(0)});s.on('error',()=>process.exit(1));setTimeout(()=>process.exit(1),2000)" >/dev/null 2>&1; do
    i=$((i + 1))
    if [ "$i" -ge 60 ]; then
      echo "[biharse-entrypoint] ✖ MySQL unreachable after 60 attempts (~2 min) — aborting." >&2
      exit 1
    fi
    echo "[biharse-entrypoint]   not ready yet (attempt ${i}/60) — retrying in 2s"
    sleep 2
  done
  echo "[biharse-entrypoint] MySQL is up."

  # Apply the MySQL schema (idempotent). No --accept-data-loss: schema drift
  # fails loudly instead of silently dropping columns/tables.
  echo "[biharse-entrypoint] pushing schema (prisma/schema.mysql.prisma)…"
  "$PRISMA" db push --schema prisma/schema.mysql.prisma --skip-generate

  # Optional one-time data import from the mounted SQLite dump.
  if [ -f /tmp/biharse-mysql-dump.json ]; then
    echo "[biharse-entrypoint] dump found — importing data…"
    bun scripts/import-to-mysql.mjs || \
      echo "[biharse-entrypoint] ⚠ import failed — starting the app anyway" >&2
  else
    echo "[biharse-entrypoint] no dump at /tmp/biharse-mysql-dump.json — empty catalogue."
    echo "[biharse-entrypoint]   seed with:  docker compose exec app bun scripts/seed.mjs"
  fi
else
  echo "[biharse-entrypoint] pushing SQLite schema…"
  mkdir -p /app/db
  "$PRISMA" db push --skip-generate
fi

echo "[biharse-entrypoint] starting Next.js standalone server on :${PORT:-3000}"
exec bun .next/standalone/server.js

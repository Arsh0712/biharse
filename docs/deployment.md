# BiharSe — Deployment (VPS with Docker Compose + Caddy + Let's Encrypt)

## 1. Topology (production)

```
Caddy (80/443, auto-HTTPS) ─┬─ biharse-web (this Next.js app, port 3000)
                            └─ (optional phase 2) prestashop-php + mysql + redis
biharse-db   : MySQL 8 (when migrating off SQLite)
mailpit      : local SMTP sink for staging
```

## 2. docker-compose.yml (staging-ready)

> This hand-written prod topology is separate from the repo's **local MySQL dev stack**
> (`docker-compose.yml` at the project root — one `docker compose up -d --build` gives
> MySQL 8 + the app; see §4 Path A).

```yaml
services:
  caddy:
    image: caddy:2-alpine
    ports: ["80:80", "443:443"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
    restart: unless-stopped

  web:
    build: .
    env_file: .env
    environment:
      - NODE_ENV=production
      - SITE_URL=https://biharse.org
    volumes:
      - ./db:/app/db
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/api/bootstrap"]
      interval: 30s
      timeout: 5s
      retries: 5

  db:
    image: mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}
      MYSQL_DATABASE: biharse
      MYSQL_USER: biharse
      MYSQL_PASSWORD: ${DB_PASSWORD}
    volumes: ["db_data:/var/lib/mysql"]
    restart: unless-stopped

  mailpit:
    image: axllent/mailpit
    ports: ["8025:8025"]
    restart: unless-stopped

volumes: { caddy_data: {}, db_data: {} }
```

`Caddyfile`:
```
biharse.org {
  reverse_proxy web:3000
  encode gzip zstd
  header { Strict-Transport-Security "max-age=31536000" }
}
```

## 3. First deploy

1. Clone the repo on the VPS, `cp .env.example .env` and fill everything
   (RAZORPAY_*, GOOGLE_*, SMTP_*, SITE_URL=https://biharse.org, DB creds).
2. `docker compose up -d --build`
3. `docker compose exec web bun run db:push && docker compose exec web node scripts/seed.mjs`
4. Verify `https://biharse.org/api/bootstrap` → JSON with your settings.
5. Point Razorpay webhook to `https://biharse.org/api/payment/webhook` with the secret.
6. Change the seeded admin password immediately (env `ADMIN_PASSWORD` + re-seed, or log in
   and rotate via your password manager).

## 4. Database — MySQL (local) quick start

The repo ships **two Prisma schemas in lockstep** (Prisma needs one provider per
generated client, so the sandbox preview stays on SQLite while real deployments run
MySQL):

| file | provider | used by |
|---|---|---|
| `prisma/schema.prisma` | `sqlite` | sandbox/dev preview, `bun run dev`, `db:push` |
| `prisma/schema.mysql.prisma` | `mysql` | Docker stack, real MySQL 8 servers |

> ⚠️ **Keep both files in lockstep.** Every model/field/@unique/@index exists in both;
> the MySQL file only adds `@db.Text` / `@db.MediumText` on long-text + JSON-snapshot
> columns (MySQL maps bare `String` to VARCHAR(191) and would truncate). If you change
> one schema, change the other in the same commit. `bunx prisma format` both and commit.

### Path A — Docker Compose (recommended local stack)

```bash
# one command: MySQL 8 + app (mysql-flavoured Prisma client baked in)
docker compose up -d --build
open http://localhost:3000        # schema auto-pushed on boot by docker-entrypoint.sh
```

What happens on boot: wait-for-MySQL TCP probe → `prisma db push --schema
prisma/schema.mysql.prisma --skip-generate` → (optional) import of
`/tmp/biharse-mysql-dump.json` if mounted → `bun .next/standalone/server.js`.

**Migrate your existing sandbox data into it:**

```bash
bun run db:export                 # SQLite → /tmp/biharse-mysql-dump.json (88+ rows snapshot)
# uncomment the dump mount under app.volumes in docker-compose.yml, then:
docker compose up -d              # entrypoint imports the dump (idempotent per table)
```

Seed the catalogue fresh instead (no data migration):

```bash
docker compose exec app bun scripts/seed.mjs
```

Debug the DB without exposing 3306: `docker compose run --rm db-shell`
(the `db-shell` service lives in the `debug` profile, so a plain `up` never starts it).
To expose MySQL on the host anyway, uncomment `mysql.ports` in `docker-compose.yml`.

### Path B — existing MySQL server (no Docker)

```bash
# 1. point DATABASE_URL at MySQL (see .env.example):
#    DATABASE_URL="mysql://biharse:biharse-pass@127.0.0.1:3306/biharse?connection_limit=10&charset=utf8mb4"
# 2. regenerate BOTH MySQL clients — the default `client` generator (so the app's
#    @prisma/client import speaks MySQL) AND the mysqlExport one for the importer:
bunx prisma generate --schema prisma/schema.mysql.prisma
# 3. create/align the schema:
bun run db:push:mysql
# 4. optional — bring the sandbox data along (create the dump first with `bun run db:export`):
bun run db:import:mysql
# 5. run the app against MySQL:
bun run dev
```

**Switching back to SQLite for sandbox work:** `bun run db:generate` (regenerates the
default client from `prisma/schema.prisma`) and point `DATABASE_URL` back to
`file:./db/custom.db`. Only `bunx prisma generate --schema prisma/schema.mysql.prisma`
(the bare form used in step 2 and in the Docker build) swaps `node_modules/.prisma/client`
to the MySQL provider; `bun run db:generate:mysql` targets `--generator mysqlExport`
only and never touches the SQLite client the sandbox depends on.

> Housekeeping (files outside this doc's ownership): add `prisma/generated/` to
> `.gitignore` (the generated client is platform-specific, 40+ MB, and regenerates with
> `bun run db:generate:mysql`) and to the `ignores` array in `eslint.config.mjs`, so
> generated files never reach git or lint.

### Path C — sandbox / preview stays SQLite (unchanged)

The z.ai sandbox has no MySQL and no Docker; `bun run dev` + `db:push` keep using
`prisma/schema.prisma` (`DATABASE_URL=file:…`). Nothing in `src/` knows which provider
is active — the provider is decided at client-generation time, which is exactly why
the two schemas must stay in lockstep.

### Troubleshooting

- **`Access denied for user 'biharse'`** — compose credentials are
  `biharse / biharse-pass` (overridable via `MYSQL_PASSWORD` / `MYSQL_ROOT_PASSWORD`
  env vars). If the volume was created with an older password, reset it:
  `docker compose down -v` (⚠️ deletes local MySQL data) and `up` again.
- **App restarts with `Can't reach database server`** — the entrypoint's wait loop
  probes TCP for ~2 min (60 × 2 s). MySQL 8's first boot (initialising the datadir)
  can take longer on slow disks; just restart, or raise the loop bound in
  `docker-entrypoint.sh`.
- **`prisma db push` fails non-interactively** (e.g. "provide more information / would
  result in data loss") — the entrypoint deliberately omits `--accept-data-loss`, so
  schema drift fails loudly instead of dropping your data. Fix the schema or run the
  push manually inside the container and decide:
  `docker compose exec app node_modules/.bin/prisma db push --schema prisma/schema.mysql.prisma`.
- **Hindi text / emoji garbled or insert errors** — the connection URL must carry
  `?charset=utf8mb4` and the server must run utf8mb4 (docker-compose.yml already starts
  MySQL with `--character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci`).
  On your own MySQL server set the same flags or add them to `my.cnf`.
- **Port 3306 already in use on your machine** — that's why `mysql.ports` is commented
  out by default; use `docker compose run --rm db-shell` instead of publishing 3306.
- **Connection pool exhaustion** under load — bump `connection_limit` in
  `DATABASE_URL` (the compose default is 10).

## 5. Backups

- DB: nightly `mysqldump` cron → `backups/` + off-box sync (rclone to S3/B2).
- Uploaded content lives in `public/img` + `public/brand` — include in backup set.
- Restore drill: `docker compose exec -T db mysql -u biharse -p biharse < dump.sql`.

## 6. CI pipeline (outline)

1. `bun install` → `bun run lint` → `tsc --noEmit`
2. `next build`
3. E2E smoke (Playwright, against test keys): land → add to cart → OTP login (dev inbox)
   → sandbox/test payment → order appears in admin.
4. Deploy on green: `ssh vps 'cd app && git pull && docker compose up -d --build'`

## 7. Old-domain redirect map (301s)

Run on the old host (or Caddy):
```
redir /collections/all               /?v=shop            301
redir /collections/thekua            /?v=shop&cat=thekua 301
redir /products/chini-thekua-250g    /?v=product&p=chini-thekua      301
redir /products/gur-thekua-250g      /?v=product&p=gur-thekua        301
redir /pages/about-chhath-puja       /?v=chhath          301
redir /pages/rituals                 /?v=rituals         301
redir /pages/contact                 /?v=contact         301
redir /policies/privacy-policy       /?v=policy&page=privacy 301
redir /policies/refund-policy        /?v=policy&page=refund  301
```
(Extend with the full old-URL list before DNS cutover; keep 301s for ≥1 year.)

## 8. Post-deploy checklist

- [ ] HTTPS green, HSTS on
- [ ] Razorpay test payment end-to-end, then flip to live keys
- [ ] Webhook verified (send a ₹1 test payment, see it in Admin → Outbox/Dashboard)
- [ ] SMTP test email received in Gmail (not spam); SPF/DKIM/DMARC aligned
- [ ] Lighthouse ≥95 on mobile (Performance/SEO/Best-Practices/Accessibility)
- [ ] OG preview renders (WhatsApp/Twitter card = og-image.png)
- [ ] Backups cron active; restore drill done once

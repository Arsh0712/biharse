# BiharSe on Vercel — test deployment guide

The project ships **zero-config ready** for Vercel: `vercel.json` (framework +
build commands), `nixpacks.toml` (Railway/Nixpacks), the seeded database, the
product images, and a fully configured portable `.env`. **You do not need to
set a single environment variable** to get a complete working deployment —
every value has a safe code-level default, and the database travels inside
the deployment itself.

## 1. What you get on a test deploy

| Area | Behaviour on Vercel |
|---|---|
| Storefront, catalog, offers, checkout, admin back office | Fully working |
| Database | Bundled `db/custom.db` (mirrored at `data/biharse-seed.db`); copied to `/tmp` at cold start → **writable but ephemeral** (resets per serverless instance) |
| Product images (restocked + admin uploads) | Served from `/tmp` (seeded from the bundled uploads + new uploads) — also ephemeral |
| Payments | Razorpay keys empty → built-in **sandbox payment twin** runs (no real charges) |
| Email | SMTP empty → outgoing mail is logged in **Admin → Outbox** instead of sending |
| Boot resilience | If the data API ever fails, the storefront still renders an offline preview with a Retry banner instead of hanging on the boot loader |

Ephemeral storage is intentional for testing. For durable orders/data on Vercel,
see §5 (hosted MySQL). For a production-grade host, use the self-hosted stack
(`docs/deployment.md` — Docker + MySQL, where `db/` persists on disk).

## 2. Deploy (pick one)

### Option A — Vercel CLI from the extracted zip (recommended, 2 commands)
```bash
bun i -g vercel        # or: npm i -g vercel
vercel login
vercel                 # from the project root; first run links the project
vercel --prod          # promote to production when happy
```
The shipped `.gitignore` is **deploy-friendly**: `db/custom.db`,
`db/uploads/**`, `.env` and the `data/` mirrors are all uploaded, so the CLI
deploy includes the complete catalog with images — no extra steps.

### Option B — Git import (GitHub/GitLab/Bitbucket)
1. Push the extracted project to a repo (`git init && git add -A && git commit && git push`).
   The deploy-friendly `.gitignore` already allows the database, uploads and
   `.env`, so a plain push carries the full catalog.
2. vercel.com/new → import the repo → Framework preset **Next.js** (auto) → Deploy.
3. Environment variables: none required (see §4 for the optional ones).

## 3. What the build does
- `installCommand`: `bun install` (lockfile: `bun.lock`)
- `buildCommand`: `node scripts/prisma-generate.mjs && node scripts/ensure-db.mjs && next build`
  - `scripts/prisma-generate.mjs` picks the Prisma schema from `DB_CLIENT`
    (`sqlite` default → `prisma/schema.prisma`, `mysql` → `prisma/schema.mysql.prisma`)
  - `scripts/ensure-db.mjs` guarantees the build ships a database: if
    `db/custom.db` was skipped by an upload rule, it is restored from the
    `data/biharse-seed.db` mirror
- `next.config.ts` includes `db/**` in every serverless bundle
  (`outputFileTracingIncludes`), and `src/lib/db.ts` + `src/lib/storage.ts`
  copy the database/uploads into writable `/tmp` at cold start.
  The runtime also checks the `data/` mirrors as a fallback.
- Prisma client ships with `binaryTargets = ["native", "rhel-openssl-3.0.x"]`
  so the query engine matches Vercel's Amazon Linux runtime.

## 4. Environment variables — all OPTIONAL

| Variable | Default when unset | Set it when… |
|---|---|---|
| `DATABASE_URL` | Bundled SQLite via `/tmp` (Vercel) or `<root>/db/custom.db` (self-host) | Using hosted MySQL (§5) |
| `DB_CLIENT` | `sqlite` | `mysql` (§5) |
| `SITE_URL` | `https://biharse.org` | You want canonical/sitemap URLs to point at the test deployment domain instead |
| `NEXTAUTH_SECRET` | Built-in sandbox constant | You want a dedicated sandbox HMAC (recommended for production) |
| `ADMIN_EMAIL` | `admin@biharse.org` | Different notification recipient |
| `ADMIN_PASSWORD` | — | Re-running `scripts/seed.mjs` on a fresh DB (sign-in always comes from the shipped DB) |
| `RAZORPAY_*` | Empty → sandbox payment twin | Going live with real payments |
| `SMTP_*` | Empty → Admin → Outbox | Sending real email |

Admin sign-in lives at `https://<your-deployment>/?v=admin` with the
credentials shipped in the database:

```
admin@biharse.org / u3SgHyACRk0tYkensVkw0iiu
```

## 5. Durable data on Vercel (optional): hosted MySQL

SQLite on serverless is ephemeral. When you want orders/admin edits to survive,
point the same build at a hosted MySQL (Aiven/PlanetScale/TiDB free tiers work):

1. Create a MySQL 8 database; copy its connection string.
2. Set environment variables:
   - `DB_CLIENT=mysql`
   - `DATABASE_URL=mysql://user:pass@host:3306/biharse?connection_limit=10&charset=utf8mb4`
     (`charset=utf8mb4` is required for Hindi copy + emoji)
3. Push the schema and import the catalog once, from your machine:
   ```bash
   DB_CLIENT=mysql DATABASE_URL="mysql://…" bun run db:push:mysql
   bun run db:export                        # dumps db/custom.db → /tmp/biharse-mysql-dump.json
   DB_CLIENT=mysql DATABASE_URL="mysql://…" bun run db:import:mysql
   ```
4. Redeploy. The build now generates the MySQL Prisma client automatically.

Uploads still go to `/tmp` on Vercel (per-instance). Durable uploads need the
self-hosted deployment (`docs/deployment.md`) or an object store (future work).

## 6. Railway / Nixpacks hosts

`nixpacks.toml` is included: Node 22 + Bun, `bun install`, schema-aware
`prisma generate`, the same `ensure-db` guarantee, standalone build,
`bun run start` (honours `PORT`). No environment variables required; add
`DB_CLIENT=mysql` + MySQL `DATABASE_URL` when you want persistent data there.

## 7. Sanity checklist after the first deploy
- `/` renders the storefront with the restocked products (Chini & Gur Thekua) and the BIHARSE15 announcement bar.
- Product images load (`/api/media/products/...` returns 200).
- Add to cart → checkout → sandbox payment → order appears in Admin → Orders.
- `/?v=admin` → sign in with `admin@biharse.org` / `u3SgHyACRk0tYkensVkw0iiu` → Products panel → image upload works (file lands in `/tmp`, served immediately).

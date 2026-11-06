// BiharSe — import the SQLite JSON dump into MySQL.
//
//   bun scripts/import-to-mysql.mjs     (or: bun run db:import:mysql)
//
// PREREQUISITES
//   1. A MySQL 8 server reachable at DATABASE_URL, e.g.
//        DATABASE_URL="mysql://biharse:biharse-pass@127.0.0.1:3306/biharse?connection_limit=10&charset=utf8mb4"
//   2. Schema applied (does not happen here):
//        bun run db:push:mysql           # prisma db push --schema prisma/schema.mysql.prisma
//   3. The SEPARATE MySQL Prisma client generated (this script does NOT import
//      @prisma/client — in the sandbox that client is generated for SQLite and a
//      MySQL URL would make it throw). We import from a dedicated output dir:
//        bun run db:generate:mysql
//        # = prisma generate --schema prisma/schema.mysql.prisma --generator mysqlExport
//        # → writes prisma/generated/mysql (git-ignored; regenerate per machine)
//   4. The dump produced by scripts/export-sqlite-data.mjs at /tmp/biharse-mysql-dump.json
//      (override path with DUMP_FILE=/path/to/dump.json).
//
// BEHAVIOUR
//   - FK-safe insert order (same as the export script).
//   - Idempotent: any table that already has rows is skipped entirely (count check
//     per table), so re-running after a partial import only fills empty tables.
//   - Re-run freely; it will never duplicate or overwrite existing data.
import { PrismaClient } from '../prisma/generated/mysql/index.js';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DUMP_FILE = process.env.DUMP_FILE || '/tmp/biharse-mysql-dump.json';

// ── Guard 1: refuse to run against anything that is not a MySQL URL ──────────
const url = process.env.DATABASE_URL || '';
if (!url.startsWith('mysql://') && !url.startsWith('mysql+srv://')) {
  console.error(
    `\n✖ DATABASE_URL is not a MySQL URL (got: "${url ? url.slice(0, 40) + '…' : '<unset>'}").\n\n` +
      `  This script writes into MySQL and must run with the MySQL schema+client:\n\n` +
      `    # 1. generate the separate MySQL client (safe for the SQLite sandbox):\n` +
      `    bun run db:generate:mysql\n\n` +
      `    # 2. point DATABASE_URL at MySQL (see .env.example), then:\n` +
      `    bun run db:push:mysql\n\n` +
      `    # 3. import the dump:\n` +
      `    bun run db:import:mysql\n\n` +
      `  Example DATABASE_URL:\n` +
      `    mysql://biharse:biharse-pass@127.0.0.1:3306/biharse?connection_limit=10&charset=utf8mb4\n`,
  );
  process.exit(1);
}

// ── Guard 2: the dump must exist ─────────────────────────────────────────────
if (!existsSync(DUMP_FILE)) {
  console.error(
    `\n✖ Dump not found at ${DUMP_FILE}.\n` +
      `  Create it from the SQLite sandbox first:  bun run db:export\n` +
      `  (or set DUMP_FILE=/path/to/biharse-mysql-dump.json)\n`,
  );
  process.exit(1);
}

const dump = JSON.parse(readFileSync(DUMP_FILE, 'utf8'));
if (!dump || !dump.data || typeof dump.data !== 'object') {
  console.error(`✖ ${DUMP_FILE} does not look like a biharse dump (missing "data" object).`);
  process.exit(1);
}

// FK-safe order (parents before children). Keep in lockstep with the export script.
const TABLES = [
  'Category',
  'Product',
  'Customer',
  'Session',
  'OtpCode',
  'Address',
  'Order',
  'OrderItem',
  'Coupon',
  'PaymentEvent',
  'WebhookEvent',
  'EmailOutbox',
  'SiteSetting',
  'ChhathYear',
  'PincodeEstimate',
  'ContactMessage',
  'NewsletterSubscriber',
  'WishlistItem',
  'Review',
  'Claim',
  'ConsentLog',
  'AuditLog',
];

const CHUNK = 100; // keep multi-row INSERTs well under max_allowed_packet

const db = new PrismaClient();

async function insertTable(table, rows) {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    await db[table].createMany({ data: chunk });
    inserted += chunk.length;
  }
  return inserted;
}

async function main() {
  const exportedAt = dump.exportedAt || '(unknown date)';
  console.log(`Importing dump (exported ${exportedAt}) into: ${url.replace(/:\/\/[^@]*@/, '://***@')}`);

  let totalInserted = 0;
  let totalSkipped = 0;
  const summary = [];

  for (const table of TABLES) {
    const rows = dump.data[table] || [];
    const existing = await db[table].count();

    if (existing > 0) {
      totalSkipped += rows.length;
      summary.push(`  ${table.padEnd(22)} SKIP (table already has ${existing} rows)`);
      continue;
    }
    if (rows.length === 0) {
      summary.push(`  ${table.padEnd(22)} —   (0 rows in dump, nothing to do)`);
      continue;
    }
    const inserted = await insertTable(table, rows);
    totalInserted += inserted;
    summary.push(`  ${table.padEnd(22)} ${String(inserted).padStart(6)} rows`);
  }

  console.log('\nResult:');
  for (const line of summary) console.log(line);
  console.log(
    `\n✔ Done. Inserted ${totalInserted} rows, skipped ${totalSkipped} (already-existing tables).`,
  );
}

main()
  .catch((err) => {
    console.error('\n✖ Import failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

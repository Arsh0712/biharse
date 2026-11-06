// BiharSe — export the local SQLite database to a JSON dump for the MySQL import.
//
//   bun scripts/export-sqlite-data.mjs     (or: bun run db:export)
//
// Reads through the DEFAULT Prisma client (prisma/schema.prisma → SQLite) and writes
// every table, in foreign-key-safe order, to /tmp/biharse-mysql-dump.json.
// That file is intentionally outside the repo (no PII/orders in git). Feed it to the
// MySQL stack by mounting it into the app container:
//   -v /tmp/biharse-mysql-dump.json:/tmp/biharse-mysql-dump.json:ro
// then the docker entrypoint runs scripts/import-to-mysql.mjs automatically.
//
// NOTE: run while the app is idle-ish; the dump is a simple sequential read and does
// not lock the SQLite file, but a write mid-dump could produce a snapshot that mixes
// slightly different moments. For a sandbox dev DB this is fine.
import { PrismaClient } from '@prisma/client';
import { writeFileSync } from 'node:fs';

const OUT = '/tmp/biharse-mysql-dump.json';

// Guard: this exporter must run against SQLite, never a MySQL URL.
const url = process.env.DATABASE_URL || '';
if (!url.startsWith('file:')) {
  console.error(
    `\n✖ DATABASE_URL is not a SQLite file URL (got: "${url.slice(0, 40)}…").\n` +
      `  export-sqlite-data.mjs dumps the sandbox SQLite DB via prisma/schema.prisma.\n` +
      `  Point DATABASE_URL at your sqlite file (see .env.example) and retry.\n`,
  );
  process.exit(1);
}

// Tables in foreign-key-safe insertion order (parents before children).
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

const db = new PrismaClient();

async function main() {
  const data = {};
  const counts = {};
  let total = 0;

  for (const table of TABLES) {
    const rows = await db[table].findMany();
    data[table] = rows;
    counts[table] = rows.length;
    total += rows.length;
    console.log(`  ${table.padEnd(22)} ${String(rows.length).padStart(6)} rows`);
  }

  const dump = {
    exportedAt: new Date().toISOString(),
    source: 'sqlite (prisma/schema.prisma)',
    target: 'mysql (prisma/schema.mysql.prisma)',
    tables: TABLES,
    counts,
    totalRows: total,
    data,
  };

  writeFileSync(OUT, JSON.stringify(dump));
  console.log(
    `\n✔ Dumped ${total} rows (${TABLES.length} tables) → ${OUT}\n` +
      `  Next: give the dump to the MySQL stack —\n` +
      `    docker compose: mount ${OUT} at /tmp/biharse-mysql-dump.json (see docker-compose.yml)\n` +
      `    or existing MySQL server: DATABASE_URL="mysql://…" bun run db:import:mysql`,
  );
}

main()
  .catch((err) => {
    console.error('✖ Export failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

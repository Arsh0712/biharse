#!/usr/bin/env node
/**
 * Build-time database guarantee (Vercel / Nixpacks).
 *
 * Some Vercel upload flows skip files matched by .gitignore — if db/custom.db
 * was skipped, restore it from the zip's mirror copy data/biharse-seed.db so
 * the serverless bundle always ships a real database with real content.
 *
 * Also verify the uploads mirror when the primary db/uploads tree is missing
 * (uploaded media is seeded to /tmp at cold start by src/lib/storage.ts).
 *
 * Order of preference:
 *   1. db/custom.db      (canonical, kept in sync by the app)
 *   2. data/biharse-seed.db (read-only mirror created when the zip is built)
 */
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const primary = join(process.cwd(), 'db', 'custom.db');
const mirror = join(process.cwd(), 'data', 'biharse-seed.db');

if (!existsSync(primary)) {
  if (existsSync(mirror)) {
    mkdirSync(join(process.cwd(), 'db'), { recursive: true });
    copyFileSync(mirror, primary);
    console.log(`✔ ensure-db: restored db/custom.db from mirror (${statSync(primary).size} bytes)`);
  } else {
    console.warn('⚠ ensure-db: no db/custom.db and no data/biharse-seed.db — the app will boot but the database will be empty. Ship the zip as-is or restore db/custom.db.');
  }
} else {
  console.log(`✔ ensure-db: db/custom.db present (${statSync(primary).size} bytes)`);
}

const uploads = join(process.cwd(), 'db', 'uploads');
if (!existsSync(uploads)) {
  const uploadsMirror = join(process.cwd(), 'data', 'uploads-seed');
  if (existsSync(uploadsMirror)) {
    console.log('✔ ensure-db: db/uploads missing — runtime will seed from data/uploads-seed mirror');
  } else {
    console.warn('⚠ ensure-db: no db/uploads and no data/uploads-seed — product images may 404 until media is re-uploaded.');
  }
}

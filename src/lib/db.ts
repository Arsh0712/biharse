import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';
import { SEED_SQL } from './seed/seed-sql';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Where the bundled seed database may live inside a deployment.
 *
 * db/custom.db       — canonical location (created by the zip / local repo)
 * data/biharse-seed.db — mirror shipped in the zip so the DB survives even a
 *                        strict .gitignore (some Vercel upload flows skip
 *                        gitignored files; `data/` is never ignored)
 */
const SEED_CANDIDATES = ['db/custom.db', 'data/biharse-seed.db'];

function findBundledSeed(): string | null {
  for (const rel of SEED_CANDIDATES) {
    const abs = path.join(process.cwd(), rel);
    if (fs.existsSync(abs)) return abs;
  }
  return null;
}

/**
 * Normalize a relative `file:` DATABASE_URL to an absolute path. Prisma's CLI
 * resolves relative SQLite paths against the schema directory (prisma/), so a
 * portable .env value like `file:../db/custom.db` must be rebased at runtime.
 * Tries the project root first, then the prisma/ convention.
 */
function normalizeFileUrl(url: string): string {
  if (!url.startsWith('file:')) return url;
  const raw = url.slice('file:'.length);
  if (!raw || path.isAbsolute(raw)) return url;
  const candidates = [
    path.resolve(process.cwd(), raw),
    path.resolve(process.cwd(), 'prisma', raw),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return `file:${c}`;
  }
  return `file:${candidates[0]}`;
}

/**
 * SQLite on Vercel: the deployment filesystem is read-only, so any write throws
 * "attempt to write a readonly database". When running on Vercel (VERCEL=1) with
 * the SQLite schema, we copy the bundled seed DB into /tmp on cold start and
 * point Prisma at that writable snapshot — every instance gets a fresh copy,
 * which is perfect for testing but NOT durable storage. For real persistence set
 * DB_CLIENT=mysql plus a hosted MySQL DATABASE_URL (docs/vercel-deploy.md).
 *
 * ZERO-CONFIG GUARANTEE: no environment variables are required. Locally the app
 * falls back to <cwd>/db/custom.db; on Vercel it always gets a writable SQLite
 * file in /tmp (empty only in the pathological case where the build was stripped
 * of the seed DB — routes then return clean JSON errors instead of crashing).
 */
function resolveDatasourceUrl(): string {
  const envUrl = process.env.DATABASE_URL;
  const onVercel = process.env.VERCEL === '1';
  const mysql =
    (process.env.DB_CLIENT ?? 'sqlite').toLowerCase() === 'mysql' ||
    Boolean(envUrl && /^mysql:\/\//.test(envUrl));

  // MySQL users bring their own URL — pass it through untouched.
  if (mysql && envUrl) return envUrl;

  if (!onVercel) {
    if (envUrl) return normalizeFileUrl(envUrl);
    const local = path.join(process.cwd(), 'db', 'custom.db');
    return `file:${local}`;
  }

  // Vercel + SQLite → writable snapshot in /tmp.
  const dest = '/tmp/biharse.db';
  const bundled = findBundledSeed();
  if (bundled) {
    try {
      fs.copyFileSync(bundled, dest);
    } catch {
      /* fall through — /tmp file may already exist from a warm start */
    }
  }
  return `file:${dest}`;
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Query logging is a dev convenience; keep production logs clean (Vercel).
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
    datasourceUrl: resolveDatasourceUrl(),
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

/* ── Embedded runtime seed (last line of defence) ─────────────────────
   If the deployment lost its bundled database files (strict upload rules,
   an old .gitignore in the user's repo, …), the runtime DB starts EMPTY.
   ensureDbSeeded() materializes the SQL compiled into src/lib/seed/seed-sql.ts
   exactly once per instance — and NEVER touches a database that already has
   tables. Key entry points (bootstrap, catalog, admin login, sitemap) await
   it, so even the most stripped deploy renders the real store. */
const seedState = globalThis as unknown as { __biharseSeed?: Promise<void> };

/** Split a multi-statement SQL string on top-level semicolons (quote/comment aware). */
function splitSqlStatements(sql: string): string[] {
  const out: string[] = [];
  let cur = '';
  let i = 0;
  while (i < sql.length) {
    const ch = sql[i];
    // single-quoted string with '' escaping
    if (ch === "'") {
      cur += ch;
      i++;
      while (i < sql.length) {
        cur += sql[i];
        if (sql[i] === "'") {
          if (sql[i + 1] === "'") { cur += "'"; i += 2; continue; }
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    // quoted identifier
    if (ch === '"') {
      cur += ch;
      i++;
      while (i < sql.length) {
        cur += sql[i];
        if (sql[i] === '"') { i++; break; }
        i++;
      }
      continue;
    }
    // line comment
    if (ch === '-' && sql[i + 1] === '-') {
      while (i < sql.length && sql[i] !== '\n') { cur += sql[i]; i++; }
      continue;
    }
    // block comment
    if (ch === '/' && sql[i + 1] === '*') {
      const end = sql.indexOf('*/', i + 2);
      i = end === -1 ? sql.length : end + 2;
      continue;
    }
    if (ch === ';') {
      const stmt = cur.trim();
      if (stmt) out.push(stmt);
      cur = '';
      i++;
      continue;
    }
    cur += ch;
    i++;
  }
  const tail = cur.trim();
  if (tail) out.push(tail);
  return out;
}

async function seedIfNeeded(): Promise<void> {
  try {
    const existing = await db.$queryRawUnsafe<Array<{ name: string }>>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'SiteSetting'",
    );
    if (existing.length > 0) return; // real database present — never touch it
    for (const stmt of splitSqlStatements(SEED_SQL)) {
      await db.$executeRawUnsafe(stmt);
    }
    console.log('✔ runtime seed applied (bundled database files were missing)');
  } catch (err) {
    console.error('runtime seed failed:', err instanceof Error ? err.message : err);
  }
}

/** Await this before first-use queries on cold-start-sensitive routes. */
export function ensureDbSeeded(): Promise<void> {
  if (!seedState.__biharseSeed) seedState.__biharseSeed = seedIfNeeded();
  return seedState.__biharseSeed;
}

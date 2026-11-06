#!/usr/bin/env node
/**
 * Pick the Prisma schema for the target database and generate the client.
 *
 *   DB_CLIENT=mysql   → prisma/schema.mysql.prisma  (MySQL 8 — docker stack or hosted MySQL)
 *   anything else     → prisma/schema.prisma        (SQLite — local dev, Vercel test deploys)
 *
 * Used by vercel.json (buildCommand) and nixpacks.toml so a single build line
 * serves both database modes. Prisma keeps ONE provider per generated client,
 * which is why the repo carries the two schema files (keep them in lockstep).
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const client = (process.env.DB_CLIENT ?? 'sqlite').toLowerCase();
const schema = client === 'mysql' ? 'prisma/schema.mysql.prisma' : 'prisma/schema.prisma';

if (!existsSync(schema)) {
  console.error(`✖ prisma-generate: schema not found: ${schema}`);
  process.exit(1);
}

console.log(`▶ prisma generate (DB_CLIENT=${client} → ${schema})`);
execSync(`npx --yes prisma generate --schema ${schema}`, { stdio: 'inherit' });
console.log('✔ prisma client generated');

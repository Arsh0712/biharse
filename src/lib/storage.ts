import fs from 'node:fs';
import path from 'node:path';
import { SEED_IMAGES } from './seed/seed-images';

/**
 * Uploaded media (product images, claim evidence) lives on the real filesystem
 * under db/uploads/** and is served by /api/media/** and /api/claims/**.
 *
 * Vercel note: serverless functions get a READ-ONLY deployment filesystem, so
 * writing to db/uploads would throw EROFS. When running on Vercel (VERCEL=1)
 * this helper:
 *   1. seeds /tmp/biharse-uploads with the db/uploads tree bundled in the
 *      deployment (once per cold start, marker-file guarded), and
 *   2. returns /tmp/biharse-uploads as the media root so uploads land somewhere
 *      writable and /api/media serves BOTH bundled and newly uploaded files.
 *
 * /tmp is ephemeral per serverless instance — perfect for testing, not for real
 * persistence. For durable storage use the MySQL + self-hosted setup
 * (docs/deployment.md) or wire an object store (S3/R2/Blob) later.
 */

const IS_VERCEL = process.env.VERCEL === '1';
const TMP_ROOT = '/tmp/biharse-uploads';

/**
 * Where the bundled uploads tree may live inside a deployment (mirrors the
 * seed-DB candidates in src/lib/db.ts — `data/` is never gitignored, so the
 * zip mirror keeps media working even under strict upload rules).
 */
const BUNDLED_CANDIDATES = ['db/uploads', 'data/uploads-seed'];

/** Root directory that holds the uploads tree for this runtime. */
export function mediaRoot(): string {
  if (!IS_VERCEL) return path.join(process.cwd(), 'db', 'uploads');
  seedTmp();
  return TMP_ROOT;
}

/** Copy the deployment-bundled uploads tree into /tmp (first call only). */
function seedTmp(): void {
  try {
    if (fs.existsSync(path.join(TMP_ROOT, '.seeded'))) return;
    const bundled = BUNDLED_CANDIDATES.map((rel) => path.join(process.cwd(), rel)).find((p) => fs.existsSync(p));
    fs.mkdirSync(TMP_ROOT, { recursive: true });
    if (bundled) {
      copyTree(bundled, TMP_ROOT);
    } else {
      // Nothing bundled — materialize the base64 media compiled into the
      // bundle (src/lib/seed/seed-images.ts) so product images still serve.
      materializeEmbedded();
    }
    fs.writeFileSync(path.join(TMP_ROOT, '.seeded'), String(Date.now()));
  } catch {
    /* best effort — fall back to whatever already exists */
  }
}

/** Write the embedded seed images (base64) into the /tmp media root. */
function materializeEmbedded(): void {
  for (const [rel, b64] of Object.entries(SEED_IMAGES)) {
    const dest = path.join(TMP_ROOT, ...rel.split('/'));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (!fs.existsSync(dest)) fs.writeFileSync(dest, Buffer.from(b64, 'base64'));
  }
}

function copyTree(src: string, dest: string): void {
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(d, { recursive: true });
      copyTree(s, d);
    } else if (entry.isFile()) {
      fs.copyFileSync(s, d);
    }
  }
}

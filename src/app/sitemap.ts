import type { MetadataRoute } from 'next';
import { db, ensureDbSeeded } from '@/lib/db';
import { POLICIES } from '@/lib/section-data';

const SITE_URL = process.env.SITE_URL || 'https://biharse.org';

// Views are state-routed on the single `/` route (sandbox preview constraint) —
// query-param URLs are stable and indexable. Every query below matches the exact
// URL shapes produced by `urlFor()` in src/lib/store.ts:
//   PDP        → /?v=product&p=<slug>
//   shop facet → /?v=shop&cat=<slug>
//   policies   → /?v=policy&page=<slug>
// See docs/architecture.md for the production route-split map.

type SitemapEntry = MetadataRoute.Sitemap[number];
type QueryPriority = [query: string, priority: number];

/** Core, non-DB views (view keys as used by navigate()). */
const CORE_VIEWS: QueryPriority[] = [
  ['', 1],
  ['v=shop', 0.9],
  ['v=chhath', 0.7],
  ['v=rituals', 0.7],
  ['v=story', 0.6],
  ['v=contact', 0.5],
  ['v=track', 0.4],
];

/** Policy pages — enumerated from POLICIES so new statements are picked up automatically. */
const POLICY_QUERIES: QueryPriority[] = Object.keys(POLICIES).map(
  (slug) => [`v=policy&page=${slug}`, 0.3] as QueryPriority,
);

/** Last-resort catalogue (DB unreachable) — known seeded slugs so the sitemap is never empty. */
const FALLBACK_PRODUCTS: QueryPriority[] = [
  ['v=product&p=chini-thekua', 0.8],
  ['v=product&p=gur-thekua', 0.8],
];

function entry([query, priority]: QueryPriority, lastModified: Date): SitemapEntry {
  return {
    url: `${SITE_URL}/${query ? `?${query}` : ''}`,
    lastModified,
    changeFrequency: 'weekly',
    priority,
  };
}

// Regenerate hourly so newly activated products/categories appear without a redeploy.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await ensureDbSeeded();
  const now = new Date();
  const out: MetadataRoute.Sitemap = [
    ...CORE_VIEWS.map((q) => entry(q, now)),
    ...POLICY_QUERIES.map((q) => entry(q, now)),
  ];

  try {
    const [products, categories] = await Promise.all([
      db.product.findMany({
        where: { isActive: true },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      }),
      db.category.findMany({
        where: { isActive: true },
        select: { slug: true, updatedAt: true },
        orderBy: { sortOrder: 'asc' },
      }),
    ]);
    out.push(
      ...products.map((p) => entry([`v=product&p=${p.slug}`, 0.8] as QueryPriority, p.updatedAt)),
      ...categories.map((c) => entry([`v=shop&cat=${c.slug}`, 0.7] as QueryPriority, c.updatedAt)),
    );
  } catch {
    // DB failure → static list so the sitemap stays valid and non-empty.
    out.push(...FALLBACK_PRODUCTS.map((q) => entry(q, now)));
  }

  return out;
}

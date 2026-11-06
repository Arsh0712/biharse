'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { ChevronDown, Loader2, RotateCcw, Search } from 'lucide-react';
import { SelectMenu } from '@/components/ui/select-menu';
import { ProductCard } from '@/components/shop/product-card';
import { MadhubaniDivider, SectionOrnament } from '@/components/fx/madhubani';
import { Reveal, SplitText } from '@/components/fx/reveal';
import { useRecentlyViewed, useSettings, useUi } from '@/lib/store';
import { api, pick } from '@/lib/api';
import type { Product } from '@/lib/types';

interface ShopResponse {
  products: Product[];
  total: number;
  page: number;
  hasMore: boolean;
}

const SORTS: { value: string; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-asc', label: 'Price ↑' },
  { value: 'price-desc', label: 'Price ↓' },
  { value: 'rating', label: 'Top rated' },
  { value: 'newest', label: 'Newest' },
];

export default function ShopView() {
  const lang = useUi((s) => s.lang);
  const settingsData = useSettings((s) => s.data);
  const recentSlugs = useRecentlyViewed((s) => s.slugs);

  // deep-link awareness: preselect the category param on first mount
  const [category, setCategory] = useState(() => useUi.getState().params.category || 'all');
  const [sort, setSort] = useState('featured');
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [recent, setRecent] = useState<Product[]>([]);

  const busyRef = useRef(false);
  const categoryRef = useRef(category);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const categories = settingsData?.categories ?? [];

  /* ── search debounce (300ms) ─────────────────────────── */
  useEffect(() => {
    const t = setTimeout(() => {
      if (q === debouncedQ) return; // nothing new to apply — don't spin the skeleton
      setDebouncedQ(q);
      setLoading(true);
    }, 300);
    return () => clearTimeout(t);
  }, [q, debouncedQ]);

  /* ── keep chip state in sync with deep-link params (back/forward + in-app nav) ── */
  useEffect(() => {
    const unsub = useUi.subscribe((s, prev) => {
      if (s.params.category === prev.params.category) return;
      const next = s.params.category || 'all';
      if (next !== categoryRef.current) {
        categoryRef.current = next;
        setCategory(next);
        setLoading(true);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    categoryRef.current = category;
  }, [category]);

  /* ── main fetch — runs on mount + whenever filters change ── */
  useEffect(() => {
    let cancelled = false;
    busyRef.current = true;

    const sp = new URLSearchParams();
    if (category && category !== 'all') sp.set('category', category);
    if (sort !== 'featured') sp.set('sort', sort);
    if (debouncedQ.trim()) sp.set('q', debouncedQ.trim());
    sp.set('page', '1');

    api<ShopResponse>(`/api/products?${sp.toString()}`)
      .then((j) => {
        if (cancelled) return;
        setProducts(j.products);
        setTotal(j.total);
        setHasMore(j.hasMore);
        setPage(1);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setProducts([]);
        setTotal(0);
        setHasMore(false);
        setPage(1);
        setLoading(false);
      })
      .finally(() => {
        busyRef.current = false;
      });

    return () => {
      cancelled = true;
    };
  }, [category, sort, debouncedQ]);

  /* ── pagination: append next page ────────────────────── */
  const loadMore = useCallback(() => {
    if (busyRef.current || !hasMore) return;
    busyRef.current = true;
    setLoadingMore(true);

    const next = page + 1;
    const sp = new URLSearchParams();
    if (category && category !== 'all') sp.set('category', category);
    if (sort !== 'featured') sp.set('sort', sort);
    if (debouncedQ.trim()) sp.set('q', debouncedQ.trim());
    sp.set('page', String(next));

    api<ShopResponse>(`/api/products?${sp.toString()}`)
      .then((j) => {
        setProducts((prev) => {
          const seen = new Set(prev.map((x) => x.slug));
          return [...prev, ...j.products.filter((np) => !seen.has(np.slug))];
        });
        setHasMore(j.hasMore);
        setPage(next);
      })
      .catch(() => setHasMore(false))
      .finally(() => {
        busyRef.current = false;
        setLoadingMore(false);
      });
  }, [page, hasMore, category, sort, debouncedQ]);

  /* ── auto-load when the sentinel scrolls into view ───── */
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: '480px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loadMore]);

  /* ── recently viewed (excluding what's already on screen) ── */
  const recentKey = useMemo(() => {
    const shown = new Set(products.map((x) => x.slug));
    return recentSlugs.filter((s) => !shown.has(s)).slice(0, 8).join(',');
  }, [products, recentSlugs]);

  const recentVisible = useMemo(() => {
    const shown = new Set(products.map((x) => x.slug));
    return recent.filter((r) => !shown.has(r.slug));
  }, [products, recent]);

  useEffect(() => {
    if (!recentKey) return;
    let cancelled = false;
    api<ShopResponse>(`/api/products?slugs=${encodeURIComponent(recentKey)}`)
      .then((j) => {
        if (!cancelled) setRecent(j.products);
      })
      .catch(() => {
        /* strip simply stays hidden */
      });
    return () => {
      cancelled = true;
    };
  }, [recentKey]);

  /* ── handlers ────────────────────────────────────────── */
  const selectCategory = (c: string) => {
    if (c !== category) setLoading(true);
    categoryRef.current = c;
    setCategory(c);
    useUi.setState({ params: { ...useUi.getState().params, category: c } });
  };

  const clearFilters = () => {
    if (category !== 'all' || sort !== 'featured' || q !== '') setLoading(true);
    categoryRef.current = 'all';
    setCategory('all');
    setSort('featured');
    setQ('');
    setDebouncedQ('');
    useUi.setState({ params: { ...useUi.getState().params, category: 'all' } });
  };

  const openQuickView = useCallback((p: Product) => {
    useUi.setState({ params: { ...useUi.getState().params, slug: p.slug } });
    useUi.getState().setOverlay('quickview');
  }, []);

  const chipCls = (active: boolean) =>
    `rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-all duration-200 focus-visible:outline-2 ${
      active
        ? 'bg-brand text-cream shadow-[0_8px_18px_-8px_rgba(216,0,24,0.7)]'
        : 'border border-line-warm bg-card/80 text-ink hover:border-jaggery-2 hover:bg-cream-2'
    }`;

  return (
    <div className="relative">
      {/* ── page header ─────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pt-28 sm:px-6">
        <SectionOrnament />
        <p className="text-eyebrow mt-5 text-center text-jaggery-3">The Shop</p>
        <SplitText
          as="h1"
          text="Everything fresh from our kitchen"
          highlight="fresh"
          className="text-display-1 mt-3 text-center font-display font-semibold text-ink"
        />
        <p className="font-dev-display mt-3 text-center text-xl text-jaggery-2 sm:text-2xl" lang="hi">
          बिहार का स्वाद — ठेकुआ, प्रसाद
        </p>
        <p className="mt-3 text-center text-[13px] font-semibold tracking-wide text-muted-foreground" aria-live="polite">
          {loading
            ? 'Warming up the kitchen…'
            : `${total} handmade ${total === 1 ? 'delight' : 'delights'} · showing ${products.length}`}
        </p>
        <MadhubaniDivider className="mx-auto mt-6 max-w-2xl opacity-80" />
      </section>

      {/* ── sticky filter bar ───────────────────────────── */}
      <div className="sticky top-[74px] z-30 mx-auto mt-6 w-full max-w-7xl px-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-2 rounded-full border border-line-warm bg-cream px-4 py-2 shadow-[0_18px_44px_-22px_rgba(61,31,18,0.5)]">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by category">
            <button type="button" onClick={() => selectCategory('all')} aria-pressed={category === 'all'} className={chipCls(category === 'all')}>
              All
            </button>
            {categories.map((c) => (
              <button
                key={c.slug}
                type="button"
                onClick={() => selectCategory(c.slug)}
                aria-pressed={category === c.slug}
                className={chipCls(category === c.slug)}
              >
                {pick(lang, c.nameEn, c.nameHi)}
              </button>
            ))}
          </div>

          <span className="hidden h-5 w-px bg-line-warm sm:block" aria-hidden />

          {/* sort — branded dropdown (no native popup) */}
          <SelectMenu
            value={sort}
            onValueChange={(v) => {
              setSort(v);
              setLoading(true);
            }}
            options={SORTS}
            label="Sort products"
            className="rounded-full border border-line-warm bg-card/80 py-2 pl-3.5 pr-3 text-[13px] font-semibold text-ink hover:border-jaggery-2 focus:border-brand"
          />

          {/* search */}
          <label className="ml-auto flex items-center">
            <span className="sr-only">Search products</span>
            <span className="relative flex items-center">
              <Search className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-jaggery-3" aria-hidden />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search thekua…"
                aria-label="Search products"
                className="w-44 rounded-full border border-line-warm bg-card/80 py-2 pl-8 pr-3 text-[13px] font-medium text-ink placeholder:text-jaggery-3/70 outline-none transition-all focus:w-56 focus:border-brand"
              />
            </span>
          </label>
        </div>
      </div>

      {/* ── product grid ────────────────────────────────── */}
      <section className="mx-auto mt-8 max-w-7xl px-4 sm:px-6" aria-busy={loading}>
        {loading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4" aria-label="Loading products">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton aspect-[4/5] rounded-3xl" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <Reveal className="mx-auto max-w-md py-12">
            <div className="card-warm px-8 py-12 text-center">
              <Image src="/brand/mandala.png" alt="BiharSe mandala emblem" width={96} height={96} className="mx-auto rounded-full opacity-80" />
              <h2 className="font-display mt-5 text-2xl font-semibold text-ink">Nothing matches</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
                No treats on this spice trail yet. Try a different category, search or sort.
              </p>
              <button type="button" onClick={clearFilters} className="btn-primary mt-6 text-[14px]">
                <RotateCcw className="h-4 w-4" aria-hidden /> Clear filters
              </button>
            </div>
          </Reveal>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
              {products.map((p, i) => (
                <ProductCard key={p.slug} product={p} index={i} priority={i < 4} onQuickView={openQuickView} />
              ))}
            </div>

            {/* auto-load sentinel + manual load more */}
            <div ref={sentinelRef} className="h-px" aria-hidden />
            <div className="mt-10 flex flex-col items-center gap-3">
              <p className="text-[12.5px] font-semibold text-muted-foreground" aria-live="polite">
                Showing {products.length} of {total}
              </p>
              {hasMore && (
                <button type="button" onClick={loadMore} disabled={loadingMore} className="btn-ghost min-w-44 text-[14px]">
                  {loadingMore && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              )}
            </div>
          </>
        )}
      </section>

      {/* ── recently viewed ─────────────────────────────── */}
      {recentVisible.length > 0 && (
        <Reveal className="mx-auto mt-16 max-w-7xl px-4 pb-24 sm:px-6">
          <div className="flex items-center gap-3">
            <h2 className="font-display shrink-0 text-2xl font-semibold text-ink">
              {pick(lang, 'Recently viewed', 'हाल में देखे गए')}
            </h2>
            <span className="h-px flex-1 bg-line-warm" aria-hidden />
          </div>
          <div className="no-scrollbar mt-5 flex snap-x gap-4 overflow-x-auto pb-2">
            {recentVisible.map((p, i) => (
              <div key={p.slug} className="w-[230px] shrink-0 snap-start sm:w-[248px]">
                <ProductCard product={p} index={i} onQuickView={openQuickView} />
              </div>
            ))}
          </div>
        </Reveal>
      )}
    </div>
  );
}

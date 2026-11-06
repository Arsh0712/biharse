'use client';

import { useEffect, useState } from 'react';
import { api, pick } from '@/lib/api';
import { useUi } from '@/lib/store';
import { ProductCard } from '@/components/shop/product-card';
import { Reveal, SplitText } from '@/components/fx/reveal';
import { SectionOrnament } from '@/components/fx/madhubani';
import type { Product } from '@/lib/types';

type ProductsRes = { products: Product[]; total: number; hasMore: boolean };

/** chini first, gur second, then featured, then rest */
function rank(p: Product) {
  if (p.slug === 'chini-thekua') return 0;
  if (p.slug === 'gur-thekua') return 1;
  if (p.isFeatured) return 2;
  return 3;
}

function CardSkeleton() {
  return (
    <div className="card-warm overflow-hidden" aria-hidden>
      <div className="skeleton aspect-[4/5] w-full" />
      <div className="space-y-2.5 p-5">
        <div className="skeleton h-3 w-24 rounded-full" />
        <div className="skeleton h-5 w-3/4 rounded-full" />
        <div className="skeleton h-3 w-1/2 rounded-full" />
        <div className="flex items-end justify-between pt-2">
          <div className="skeleton h-6 w-20 rounded-full" />
          <div className="skeleton h-11 w-20 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export default function Bestsellers() {
  const lang = useUi((s) => s.lang);
  const navigate = useUi((s) => s.navigate);

  const [products, setProducts] = useState<Product[] | null>(null);
  const [total, setTotal] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    api<ProductsRes>('/api/products?perPage=8')
      .then((d) => {
        if (!alive) return;
        const list = [...d.products].sort((a, b) => rank(a) - rank(b)).slice(0, 8);
        setProducts(list);
        setTotal(d.total || list.length);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => { alive = false; };
  }, []);

  const onQuickView = (p: Product) => {
    useUi.setState({ params: { slug: p.slug } });
    useUi.getState().setOverlay('quickview');
  };

  return (
    <section
      aria-label={pick(lang, 'Bestsellers', 'सबसे पसंदीदा')}
      aria-busy={products === null && !failed}
      className="bg-cream py-20 sm:py-28"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        {/* Header */}
        <Reveal className="flex flex-col items-center text-center">
          <SectionOrnament />
          <p className="text-eyebrow mt-5 text-brand">{pick(lang, 'Bestsellers', 'सबसे ज़्यादा बिकने वाले')}</p>
          <SplitText
            text={pick(lang, 'Made this week, loved everywhere', 'इस हफ़्ते बना, हर जगह पसंद')}
            className="font-display text-display-1 mt-3 max-w-3xl text-ink"
          />
          <p className="mt-4 max-w-xl text-[15px] text-jaggery-2 sm:text-base">
            {pick(
              lang,
              'Chini first, Gur close behind — both fried fresh this morning.',
              'चीनी वाला पहले, गुड़ वाला तुरंत बाद — दोनों आज सुबह तले हैं।',
            )}
          </p>
        </Reveal>

        {/* Grid */}
        {failed ? (
          <p className="mt-14 text-center text-sm text-jaggery-3">
            {pick(lang, 'Fresh batch is on its way — check back in a minute.', 'ताज़ा बैच रास्ते में है — एक मिनट में फिर देखें।')}
          </p>
        ) : (
          <div className="mt-12 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
            {products === null
              ? Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)
              : products.map((p, i) => (
                  <ProductCard key={p.slug} product={p} index={i} priority={i < 2} onQuickView={onQuickView} />
                ))}
          </div>
        )}

        {/* Footer CTA */}
        {products !== null && (
          <Reveal delay={0.1} className="mt-12 flex justify-center">
            <button onClick={() => navigate('shop')} className="btn-ghost text-[15px]">
              {pick(lang, `View all ${Math.max(total, products.length)} products`, `सभी ${Math.max(total, products.length)} प्रोडक्ट देखें`)}
              <span aria-hidden>→</span>
            </button>
          </Reveal>
        )}
      </div>
    </section>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Heart, Loader2, ShoppingBag } from 'lucide-react';
import { useUi, useWishlist, useCart, useProductCache } from '@/lib/store';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { SectionOrnament } from '@/components/fx/madhubani';
import { ProductCard } from '@/components/shop/product-card';
import type { Product } from '@/lib/types';

export default function WishlistView() {
  const navigate = useUi((s) => s.navigate);
  const setOverlay = useUi((s) => s.setOverlay);
  const slugs = useWishlist((s) => s.slugs);
  const putMany = useProductCache((s) => s.putMany);

  const [data, setData] = useState<{ key: string; products: Product[] } | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);

  const slugsKey = slugs.join(',');

  useEffect(() => {
    if (slugsKey === '') return;
    let alive = true;
    api<{ products: Product[] }>('/api/products?slugs=' + encodeURIComponent(slugsKey))
      .then((j) => {
        if (!alive) return;
        putMany(j.products);
        setData({ key: slugsKey, products: j.products });
      })
      .catch(() => { if (alive) setFailedKey(slugsKey); });
    return () => { alive = false; };
  }, [slugsKey, putMany]);

  const fresh = data && data.key === slugsKey ? data.products : [];
  const loading = slugs.length > 0 && failedKey !== slugsKey && !(data && data.key === slugsKey);
  const failed = failedKey === slugsKey && slugs.length > 0;

  const moveAllToCart = () => {
    if (fresh.length === 0) return;
    setMoving(true);
    const { add } = useCart.getState();
    for (const p of fresh) {
      add(p, p.variants[0]?.label, 1);
    }
    setMoving(false);
    toast({
      title: 'Moved to cart 🛒',
      description: fresh.length + ' treat' + (fresh.length > 1 ? 's' : '') + ' added — review quantities in your cart',
    });
    setOverlay('cart');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pb-28 pt-28 sm:px-6 md:pt-32">
      {/* header */}
      <div className="text-center">
        <p className="text-eyebrow text-jaggery-3">Saved for later</p>
        <h1 className="font-display mt-2 text-display-2 font-semibold text-ink">Wishlist</h1>
        <div className="mt-4"><SectionOrnament /></div>
        {!loading && fresh.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <p className="rounded-full bg-brand/10 px-4 py-1.5 text-[13px] font-bold text-brand" aria-live="polite">
              {fresh.length} treat{fresh.length === 1 ? '' : 's'} saved
            </p>
            <button onClick={moveAllToCart} disabled={moving} className="btn-gold !px-5 !py-2.5 text-[14px]">
              {moving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingBag className="h-4 w-4" />}
              Move all to cart
            </button>
          </div>
        )}
      </div>

      {/* loading */}
      {loading && (
        <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4" aria-busy="true" aria-label="Loading wishlist">
          {[0, 1, 2, 3].map((i) => (
            <div key={i}>
              <div className="skeleton aspect-[4/5] rounded-3xl" />
              <div className="skeleton mt-3 h-5 w-3/4 rounded-full" />
              <div className="skeleton mt-2 h-4 w-1/2 rounded-full" />
            </div>
          ))}
        </div>
      )}

      {/* fetch failed */}
      {!loading && failed && (
        <div className="card-warm mx-auto mt-10 max-w-lg px-8 py-14 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-saffron/10 text-saffron">
            <Heart className="h-8 w-8" />
          </span>
          <h2 className="font-display mt-5 text-2xl font-semibold text-ink">Couldn&apos;t load your saved treats</h2>
          <p className="mx-auto mt-2 max-w-sm text-[14px] text-muted-foreground">
            Check your connection and refresh — they&apos;re still saved here.
          </p>
          <button onClick={() => navigate('shop')} className="btn-primary mt-7">
            <ShoppingBag className="h-4.5 w-4.5" /> Browse shop
          </button>
        </div>
      )}

      {/* empty state */}
      {!loading && !failed && fresh.length === 0 && (
        <div className="card-warm mx-auto mt-10 max-w-lg px-8 py-14 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-saffron/10 text-saffron">
            <Heart className="h-8 w-8" />
          </span>
          <h2 className="font-display mt-5 text-2xl font-semibold text-ink">Nothing saved yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-[14px] text-muted-foreground">
            Tap the heart on any treat to keep it here — your future chai partner is waiting.
          </p>
          <button onClick={() => navigate('shop')} className="btn-primary mt-7">
            <ShoppingBag className="h-4.5 w-4.5" /> Browse shop
          </button>
        </div>
      )}

      {/* grid */}
      {!loading && !failed && fresh.length > 0 && (
        <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {fresh.map((p, i) => (
            <ProductCard
              key={p.slug}
              product={p}
              index={i}
              onQuickView={() => {
                useUi.setState({ params: { slug: p.slug } });
                setOverlay('quickview');
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

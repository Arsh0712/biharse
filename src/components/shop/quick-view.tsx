'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Plus, Minus, ShoppingBag, Star } from 'lucide-react';
import { useUi, useCart, useProductCache, useRecentlyViewed } from '@/lib/store';
import { api, pick } from '@/lib/api';
import { formatINR, savingsPct } from '@/lib/money';
import { flyToCart } from '@/components/fx/marquee';
import { toast } from '@/hooks/use-toast';
import type { Product } from '@/lib/types';

/** Quick view modal — slide-over card with variant picker + add to cart */
export function QuickViewModal() {
  const overlay = useUi((s) => s.overlay);
  const setOverlay = useUi((s) => s.setOverlay);
  const slug = useUi((s) => s.params.slug);
  const navigate = useUi((s) => s.navigate);
  const cache = useProductCache((s) => s.map);
  const put = useProductCache((s) => s.put);
  const pushRecent = useRecentlyViewed((s) => s.push);
  const lang = useUi((s) => s.lang);
  const add = useCart((s) => s.add);

  const cached = overlay === 'quickview' && slug ? cache[slug] : undefined;
  const [fetched, setFetched] = useState<Product | null>(null);
  const [variant, setVariant] = useState<string>('');
  const [qty, setQty] = useState(1);
  const product = cached ?? (overlay === 'quickview' ? fetched : null);

  useEffect(() => {
    if (overlay !== 'quickview' || !slug || cached) return;
    let alive = true;
    api<{ product: Product }>(`/api/products/${slug}`).then((j) => {
      if (!alive) return;
      put(j.product);
      setFetched(j.product);
      setVariant(j.product.variants[0]?.label ?? '');
    }).catch(() => {});
    return () => { alive = false; };
  }, [overlay, slug, cached, put]);

  const close = () => setOverlay(null);
  const p = product;
  const activeVariant = variant || (p?.variants[0]?.label ?? '');
  const v = p?.variants.find((x) => x.label === activeVariant) ?? p?.variants[0];
  const unit = (p?.price ?? 0) + (v?.priceDelta ?? 0);

  const addToCart = () => {
    if (!p) return;
    add(p, activeVariant, qty);
    flyToCart(p.images[0], document.getElementById('quickview-img'));
    toast({ title: 'Added to cart', description: `${pick(lang, p.nameEn, p.nameHi)} · ${activeVariant}` });
    close();
  };

  return (
    <AnimatePresence>
      {overlay === 'quickview' && (
        <motion.div className="fixed inset-0 z-[70] grid place-items-center bg-jaggery/55 px-4 py-16 backdrop-blur-sm overflow-y-auto"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} role="dialog" aria-modal="true" aria-label="Quick view">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="grid w-full max-w-2xl overflow-hidden rounded-[2rem] bg-card shadow-2xl sm:grid-cols-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-square bg-cream-2 sm:aspect-auto">
              {p && <Image id="quickview-img" src={p.images[0]} alt={p.nameEn} fill sizes="(max-width:640px) 100vw, 50vw" className="object-cover" />}
            </div>
            <div className="relative flex flex-col p-6 sm:p-7">
              <button onClick={close} className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full hover:bg-cream-2" aria-label="Close quick view">
                <X className="h-4 w-4" />
              </button>
              {!p ? (
                <div className="flex-1 space-y-3 py-8">
                  <div className="skeleton h-5 w-2/3 rounded-full" />
                  <div className="skeleton h-4 w-1/2 rounded-full" />
                  <div className="skeleton h-10 w-24 rounded-full" />
                </div>
              ) : (
                <>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-jaggery-3">{p.categoryNameEn}</p>
                  <h2 className="font-display mt-1 pr-8 text-2xl font-semibold">{pick(lang, p.nameEn, p.nameHi)}</h2>
                  <div className="mt-1 flex items-center gap-1.5 text-[13px] text-jaggery-2">
                    <Star className="h-4 w-4 fill-turmeric text-turmeric" /> {p.rating} · {p.reviewCount} reviews
                  </div>
                  <p className="mt-3 line-clamp-3 text-[14px] leading-relaxed text-muted-foreground">{pick(lang, p.storyEn, p.storyHi)}</p>

                  {p.variants.length > 1 && (
                    <div className="mt-4">
                      <p className="mb-1.5 text-[12px] font-bold uppercase tracking-wider text-jaggery-2">Weight</p>
                      <div className="flex flex-wrap gap-2">
                        {p.variants.map((x) => (
                          <button key={x.label} onClick={() => setVariant(x.label)}
                            className={`rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition ${activeVariant === x.label ? 'border-brand bg-brand text-cream' : 'border-line-warm hover:border-jaggery-2'}`}>
                            {x.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-5 flex items-center justify-between">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-extrabold">{formatINR(unit)}</span>
                      {(p.mrp + (v?.priceDelta ?? 0)) > unit && (
                        <>
                          <span className="text-sm text-muted-foreground line-through">{formatINR(p.mrp + (v?.priceDelta ?? 0))}</span>
                          <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-bold text-brand">−{savingsPct(p.mrp, p.price)}%</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-1 rounded-full border border-line-warm">
                      <button onClick={() => setQty(Math.max(1, qty - 1))} className="grid h-8 w-8 place-items-center" aria-label="Decrease"><Minus className="h-3.5 w-3.5" /></button>
                      <span className="w-5 text-center text-sm font-bold">{qty}</span>
                      <button onClick={() => setQty(Math.min(20, qty + 1))} className="grid h-8 w-8 place-items-center" aria-label="Increase"><Plus className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                    <button onClick={addToCart} className="btn-primary flex-1">
                      <ShoppingBag className="h-4 w-4" /> Add to cart
                    </button>
                    <button onClick={() => { close(); navigate('product', { slug: p.slug }); pushRecent(p.slug); }} className="btn-ghost flex-1">
                      Full details
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Heart, Plus, Star, Eye } from 'lucide-react';
import { useCart, useWishlist, useUi, useProductCache } from '@/lib/store';
import { flyToCart } from '@/components/fx/marquee';
import { Magnetic } from '@/components/fx/magnetic';
import { formatINR, savingsPct } from '@/lib/money';
import { pick } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import type { Product } from '@/lib/types';

export function ProductCard({
  product: p,
  index = 0,
  priority = false,
  onQuickView,
}: {
  product: Product;
  index?: number;
  priority?: boolean;
  onQuickView?: (p: Product) => void;
}) {
  const add = useCart((s) => s.add);
  const toggleWish = useWishlist((s) => s.toggle);
  const wished = useWishlist((s) => s.slugs.includes(p.slug));
  const navigate = useUi((s) => s.navigate);
  const setOverlay = useUi((s) => s.setOverlay);
  const put = useProductCache((s) => s.put);
  const lang = useUi((s) => s.lang);
  const [hover, setHover] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  void setHover;

  const name = pick(lang, p.nameEn, p.nameHi);
  const savings = savingsPct(p.mrp, p.price);
  const lowStock = p.stock > 0 && p.stock <= p.lowStockAt;
  const oos = p.stock <= 0;
  const images = p.images.length ? p.images : ['/brand/mandala.png'];

  const addToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (oos) return;
    put(p);
    add(p, p.variants[0]?.label);
    flyToCart(images[0], cardRef.current);
    toast({ title: 'Added to cart', description: `${name} · ${p.variants[0]?.label ?? ''}` });
    window.dispatchEvent(new CustomEvent('biharse:event', { detail: { name: 'add_to_cart', data: { item_id: p.slug, value: p.price / 100 } } }));
  };

  const openPdp = () => {
    put(p);
    navigate('product', { slug: p.slug });
    window.dispatchEvent(new CustomEvent('biharse:event', { detail: { name: 'view_item', data: { item_id: p.slug } } }));
  };

  return (
    <motion.article
      ref={cardRef}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay: (index % 4) * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="group relative"
      data-cursor="view"
    >
      <div
        onClick={openPdp}
        onKeyDown={(e) => e.key === 'Enter' && openPdp()}
        role="link"
        tabIndex={0}
        aria-label={`${name} — ${formatINR(p.price)}`}
        className="card-warm relative cursor-pointer overflow-hidden transition-all duration-500 hover:shadow-[0_24px_50px_-20px_rgba(61,31,18,0.45)]"
      >
        {/* image + hover zoom + second-image crossfade */}
        <div className="relative aspect-[4/5] overflow-hidden bg-cream-2">
          <Image
            src={images[0]}
            alt={`${name} — ${p.taglineEn}, homemade in Bihar`}
            fill
            priority={priority}
            sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw"
            className="object-cover transition-all duration-700 group-hover:scale-110"
            style={{ opacity: hover && images[1] ? 0 : 1 }}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
          />
          {images[1] && (
            <Image
              src={images[1]}
              alt={`${name} — detail shot`}
              fill
              sizes="(max-width:640px) 50vw, 25vw"
              className="object-cover transition-all duration-700 group-hover:scale-105"
              style={{ opacity: hover ? 1 : 0 }}
              onMouseEnter={() => setHover(true)}
              onMouseLeave={() => setHover(false)}
            />
          )}

          {/* badges */}
          <div className="absolute left-3 top-3 flex flex-col gap-1.5">
            {savings > 0 && (
              <span className="rounded-full bg-brand px-2.5 py-1 text-[11px] font-bold text-cream shadow">−{savings}%</span>
            )}
            {lowStock && (
              <span className="rounded-full bg-turmeric px-2.5 py-1 text-[10.5px] font-bold text-ink shadow">Only {p.stock} left</span>
            )}
            {oos && (
              <span className="rounded-full bg-jaggery px-2.5 py-1 text-[10.5px] font-bold text-cream">Out of stock</span>
            )}
          </div>

          {/* wishlist */}
          <button
            onClick={(e) => { e.stopPropagation(); toggleWish(p.slug); toast({ title: wished ? 'Removed from wishlist' : 'Saved to wishlist', description: name }); }}
            aria-label={wished ? `Remove ${name} from wishlist` : `Save ${name} to wishlist`}
            aria-pressed={wished}
            className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-card/90 shadow transition-transform hover:scale-110 active:scale-90"
          >
            <Heart className={`h-4 w-4 transition-colors ${wished ? 'fill-brand text-brand' : 'text-jaggery'}`} />
          </button>

          {/* quick view */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onQuickView) onQuickView(p);
              else {
                useUi.setState({ params: { slug: p.slug } });
                setOverlay('quickview');
              }
            }}
            className="absolute inset-x-3 bottom-3 flex translate-y-14 items-center justify-center gap-2 rounded-full bg-jaggery/90 py-2.5 text-[13px] font-semibold text-cream backdrop-blur transition-all duration-300 group-hover:translate-y-0"
            aria-label={`Quick view ${name}`}
          >
            <Eye className="h-4 w-4" /> Quick view
          </button>
        </div>

        {/* body */}
        <div className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-bold uppercase tracking-widest text-jaggery-3">{p.categoryNameEn}</p>
            {p.reviewCount > 0 ? (
              <span className="flex items-center gap-1 text-[12px] font-semibold text-jaggery-2">
                <Star className="h-3.5 w-3.5 fill-turmeric text-turmeric" /> {p.rating.toFixed(1)}
                <span className="text-muted-foreground">({p.reviewCount})</span>
              </span>
            ) : (
              <span className="rounded-full bg-turmeric/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-jaggery-2">New</span>
            )}
          </div>
          <h3 className="font-display mt-1 text-[19px] font-semibold leading-snug">{name}</h3>
          <p className="mt-0.5 line-clamp-1 text-[13px] text-muted-foreground">{pick(lang, p.taglineEn, p.taglineHi)}</p>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-[20px] font-extrabold text-ink">{formatINR(p.price)}</span>
                <span className="text-[13px] text-muted-foreground line-through">{formatINR(p.mrp)}</span>
              </div>
              <span className="text-[11.5px] font-bold text-jaggery-2">{p.variants.length > 1 ? `From · ${p.variants.map((v) => v.label).join(' / ')}` : p.variants[0]?.label}</span>
            </div>
            <Magnetic strength={0.25}>
              <button
                onClick={addToCart}
                disabled={oos}
                className="flex h-11 items-center gap-1.5 rounded-full bg-brand px-4 text-[13.5px] font-bold text-cream shadow-[0_10px_24px_-10px_rgba(216,0,24,0.6)] transition-all hover:brightness-110 active:scale-95 disabled:opacity-40"
                aria-label={`Add ${name} to cart`}
              >
                <Plus className="h-4 w-4" /> Add
              </button>
            </Magnetic>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

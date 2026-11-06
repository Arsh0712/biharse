'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import {
  BadgeCheck,
  CalendarDays,
  ChevronDown,
  FlaskConical,
  Heart,
  Leaf,
  Loader2,
  MapPin,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Star,
  Truck,
  type LucideIcon,
} from 'lucide-react';
import { ProductCard } from '@/components/shop/product-card';
import { MandalaWatermark, SectionOrnament } from '@/components/fx/madhubani';
import { CountUp, Reveal } from '@/components/fx/reveal';
import { Magnetic } from '@/components/fx/magnetic';
import { flyToCart } from '@/components/fx/marquee';
import { useCart, useProductCache, useRecentlyViewed, useSettings, useUi, useWishlist } from '@/lib/store';
import { api } from '@/lib/api';
import { formatINR, savingsPct } from '@/lib/money';
import { toast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { Bootstrap, DeliveryCheck, Product, ReviewDto } from '@/lib/types';
import type { ProductDto } from '@/lib/commerce';

interface PdpResponse {
  product: ProductDto;
  reviews: ReviewDto[];
  related: ProductDto[];
}

interface PdpData {
  slug: string;
  product: ProductDto;
  reviews: ReviewDto[];
  related: ProductDto[];
}

const FIELD =
  'w-full rounded-2xl border border-line-warm bg-cream px-4 py-2.5 text-[14px] text-ink placeholder:text-jaggery-3/60 outline-none transition focus:border-brand';

const TRUST: { icon: LucideIcon; label: string }[] = [
  { icon: Truck, label: 'Delivered across India in 5–8 days' },
  { icon: ShieldCheck, label: 'Secured payments' },
  { icon: Leaf, label: 'No preservatives' },
];

/** Business settings subset used on the PDP (JSON-blob — new keys optional until saved in admin). */
type BusinessInfo = Bootstrap['business'] & Partial<{
  fssaiNumber: string;
  manufacturerName: string;
  manufacturerAddress: string;
}>;

/** FSSAI veg mark — green square with green dot (Legal Metrology packaged-food convention). */
function VegMark() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      role="img"
      aria-label="Vegetarian"
      className="mt-1 shrink-0"
    >
      <rect x="1.5" y="1.5" width="19" height="19" rx="3" fill="none" stroke="#1a7f37" strokeWidth="2" />
      <circle cx="11" cy="11" r="4.5" fill="#1a7f37" />
    </svg>
  );
}

const LAW_LABEL = 'text-[11px] font-bold uppercase tracking-wider text-jaggery-3';
const LAW_VALUE = 'mt-0.5 text-[14px] font-semibold leading-relaxed text-ink';

function Stars({ value, size = 'h-4 w-4', className }: { value: number; size?: string; className?: string }) {
  const full = Math.round(value);
  return (
    <span className={`inline-flex items-center gap-0.5 ${className ?? ''}`} role="img" aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} aria-hidden className={`${size} ${i < full ? 'fill-turmeric text-turmeric' : 'text-jaggery-3/40'}`} />
      ))}
    </span>
  );
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

export default function PdpView({ slug }: { slug: string }) {
  const navigate = useUi((s) => s.navigate);
  const add = useCart((s) => s.add);
  const putMany = useProductCache((s) => s.putMany);
  const pushRecent = useRecentlyViewed((s) => s.push);
  const toggleWish = useWishlist((s) => s.toggle);
  const wished = useWishlist((s) => s.slugs.includes(slug));
  const bizRaw = useSettings((s) => s.data?.business);
  const biz: BusinessInfo | null = bizRaw ? { ...bizRaw } : null;

  const [data, setData] = useState<PdpData | null>(null);
  const [failedSlug, setFailedSlug] = useState('');
  const [imgIdx, setImgIdx] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [variantLabel, setVariantLabel] = useState('');
  const [qty, setQty] = useState(1);

  const [pin, setPin] = useState('');
  const [pinStatus, setPinStatus] = useState<'idle' | 'checking' | 'ok' | 'err'>('idle');
  const [pinResult, setPinResult] = useState<DeliveryCheck | null>(null);
  const [pinError, setPinError] = useState('');

  const [reviewOpen, setReviewOpen] = useState(false);
  const [form, setForm] = useState({ name: '', city: '', rating: 0, title: '', body: '' });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const galleryRef = useRef<HTMLDivElement>(null);
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const mobileAddRef = useRef<HTMLButtonElement>(null);

  /* ── fetch product once per slug ─────────────────────── */
  useEffect(() => {
    let cancelled = false;
    api<PdpResponse>(`/api/products/${encodeURIComponent(slug)}`)
      .then((j) => {
        if (cancelled) return;
        putMany([j.product, ...j.related]);
        pushRecent(j.product.slug);
        setData({ slug, product: j.product, reviews: j.reviews, related: j.related });
        setFailedSlug('');
        setImgIdx(0);
        setZoomed(false);
        setQty(1);
        setVariantLabel(j.product.variants[0]?.label ?? '');
        setPin('');
        setPinStatus('idle');
        setPinResult(null);
        setPinError('');
        setFormError('');
        window.dispatchEvent(
          new CustomEvent('biharse:event', {
            detail: { name: 'view_item', data: { item_id: j.product.slug, value: j.product.price / 100 } },
          }),
        );
      })
      .catch(() => {
        if (!cancelled) setFailedSlug(slug);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, putMany, pushRecent]);

  /* ── derived (all null-safe) ─────────────────────────── */
  const ready = Boolean(data && data.slug === slug);
  const failed = failedSlug === slug;
  const p = ready && data ? data.product : null;
  const reviews = ready && data ? data.reviews : [];
  const related = ready && data ? data.related : [];

  const variants = p?.variants ?? [];
  const v = variants.find((x) => x.label === variantLabel) ?? variants[0];
  const unit = (p?.price ?? 0) + (v?.priceDelta ?? 0);
  const unitMrp = (p?.mrp ?? 0) + (v?.priceDelta ?? 0);
  const savings = p ? savingsPct(unitMrp, unit) : 0;
  const oos = (p?.stock ?? 0) <= 0;
  const lowStock = !oos && (p?.lowStockAt ?? 0) > 0 && (p?.stock ?? 0) <= (p?.lowStockAt ?? 0);
  const images = p?.images && p.images.length ? p.images : ['/brand/mandala.png'];
  const nutrition = p?.nutrition ?? [];
  const faq = p?.faq ?? [];
  const batchLabel = p?.batchDate?.trim() || 'current week';

  /* ── compliance (Legal Metrology) — derived from real data only, never invented ── */
  const netQty = (v?.weightG ?? 0) > 0 ? `${v?.weightG} g` : '';
  const batchParsed = useMemo(() => {
    if (!p?.batchDate?.trim()) return null;
    const d = new Date(p.batchDate);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [p?.batchDate]);
  const packedMonthYear = batchParsed
    ? batchParsed.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : '';
  const shelfDays = p?.shelfLifeDays ?? 0;
  const bestBefore =
    batchParsed && shelfDays > 0 ? new Date(batchParsed.getTime() + shelfDays * 86400000) : null;
  const manufacturerName = biz?.manufacturerName?.trim() || '';
  const manufacturerAddress = biz?.manufacturerAddress?.trim() || '';
  const fssaiNumber = biz?.fssaiNumber?.trim() || '';
  const supportEmail = biz?.email?.trim() || '';
  const supportPhone = biz?.phone?.trim() || '';

  const avg = useMemo(() => {
    if (!p) return 0;
    if (!reviews.length) return p.rating || 0;
    return reviews.reduce((a, r) => a + (r.rating || 0), 0) / reviews.length;
  }, [p, reviews]);

  const jsonLd = useMemo(() => {
    if (!p) return null;
    return JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: p.nameEn,
      image: p.images,
      description: p.taglineEn,
      sku: p.slug,
      brand: { '@type': 'Brand', name: 'BiharSe' },
      aggregateRating: { '@type': 'AggregateRating', ratingValue: p.rating, reviewCount: p.reviewCount },
      offers: {
        '@type': 'Offer',
        price: (unit / 100).toFixed(2),
        priceCurrency: 'INR',
        availability: (p.stock ?? 0) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      },
    });
  }, [p, unit]);

  /* ── handlers ────────────────────────────────────────── */
  const track = (name: string, eventData: Record<string, unknown>) =>
    window.dispatchEvent(new CustomEvent('biharse:event', { detail: { name, data: eventData } }));

  const handleAdd = (fromEl?: HTMLElement | null, count = qty) => {
    if (!p || oos) return;
    add(p, v?.label, count);
    flyToCart(images[0], fromEl);
    toast({ title: 'Added to cart', description: `${p.nameEn} · ${v?.label ?? ''}${count > 1 ? ` × ${count}` : ''}` });
    track('add_to_cart', { item_id: p.slug, value: unit / 100, quantity: count });
  };

  const buyNow = () => {
    if (!p || oos) return;
    handleAdd(addBtnRef.current);
    track('begin_checkout', { item_id: p.slug, value: (unit * qty) / 100 });
    navigate('checkout');
  };

  const onGalleryMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = galleryRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    el.style.setProperty('--zx', `${x}%`);
    el.style.setProperty('--zy', `${y}%`);
  };

  const scrollToReviews = () => document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const checkPin = async () => {
    const value = pin.trim();
    if (!/^\d{6}$/.test(value)) {
      setPinStatus('err');
      setPinError('Enter a valid 6-digit pincode');
      return;
    }
    setPinStatus('checking');
    setPinError('');
    try {
      const j = await api<DeliveryCheck>('/api/delivery/check', {
        method: 'POST',
        body: JSON.stringify({ pincode: value }),
      });
      setPinResult(j);
      setPinStatus('ok');
    } catch (e) {
      setPinStatus('err');
      setPinError(e instanceof Error ? e.message : 'Delivery check failed — try again');
    }
  };

  // reviews live in `data` (keyed by slug) — patch the current product's copy locally
  const setReviewsLocal = (next: ReviewDto[]) => {
    setData((d) => (d && d.slug === slug ? { ...d, reviews: next } : d));
  };

  const submitReview = async () => {
    if (!p) return;
    if (!form.name.trim()) {
      setFormError('Please add your name');
      return;
    }
    if (!form.rating) {
      setFormError('Please choose a star rating');
      return;
    }
    if (form.body.trim().length < 4) {
      setFormError('Please write a few words about the product');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      const j = await api<{ ok: boolean; moderated: boolean; review?: ReviewDto }>('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({
          slug: p.slug,
          name: form.name.trim(),
          city: form.city.trim(),
          rating: form.rating,
          title: form.title.trim(),
          body: form.body.trim(),
        }),
      });
      toast({ title: j.moderated ? 'Submitted — visible after moderation' : 'Thank you! Review published' });
      if (!j.moderated && j.review) setReviewsLocal([j.review, ...reviews]);
      setReviewOpen(false);
      setForm({ name: '', city: '', rating: 0, title: '', body: '' });
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Could not submit — try again');
    } finally {
      setSubmitting(false);
    }
  };

  const openQuickView = useCallback((prod: Product) => {
    useUi.setState({ params: { ...useUi.getState().params, slug: prod.slug } });
    useUi.getState().setOverlay('quickview');
  }, []);

  /* ── loading skeleton ────────────────────────────────── */
  if (!p) {
    if (failed) {
      return (
        <div className="mx-auto max-w-md px-6 pt-40 pb-24 text-center">
          <SectionOrnament />
          <h1 className="font-display text-display-2 mt-6 font-semibold text-ink">This treat has walked off the shelf</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
            The page you&apos;re looking for isn&apos;t available. The kitchen is full of fresh batches though — come browse.
          </p>
          <button type="button" onClick={() => navigate('shop')} className="btn-primary mt-8 text-[14px]">
            Back to shop
          </button>
        </div>
      );
    }
    return (
      <div className="mx-auto max-w-7xl px-4 pt-28 sm:px-6" aria-busy="true" aria-label="Loading product">
        <div className="grid gap-10 lg:grid-cols-[55fr_45fr] lg:gap-14">
          <div className="skeleton aspect-square rounded-[2rem]" />
          <div className="space-y-4">
            <div className="skeleton h-4 w-28 rounded-full" />
            <div className="skeleton h-11 w-3/4 rounded-full" />
            <div className="skeleton h-5 w-1/2 rounded-full" />
            <div className="skeleton h-4 w-40 rounded-full" />
            <div className="skeleton h-12 w-44 rounded-full" />
            <div className="skeleton h-12 w-full rounded-full" />
            <div className="skeleton h-24 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  /* ── ready ───────────────────────────────────────────── */
  return (
    <div className="pb-40 lg:pb-24">
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />}

      <div className="mx-auto max-w-7xl px-4 pt-24 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[55fr_45fr] lg:gap-14">
          {/* ── LEFT · immersive gallery ─────────────────── */}
          <div className="relative">
            <MandalaWatermark className="-left-14 -top-12 h-60 w-60" opacity={0.08} />

            <div
              ref={galleryRef}
              onPointerMove={onGalleryMove}
              onPointerEnter={(e) => {
                if (e.pointerType !== 'touch') setZoomed(true);
              }}
              onPointerLeave={() => setZoomed(false)}
              className="relative aspect-square overflow-hidden rounded-[2rem] bg-cream-2 shadow-[0_30px_60px_-30px_rgba(61,31,18,0.45)]"
            >
              <Image
                key={images[imgIdx]}
                src={images[imgIdx]}
                alt={`${p.nameEn} — ${p.taglineEn} (image ${imgIdx + 1} of ${images.length})`}
                fill
                priority={imgIdx === 0}
                sizes="(max-width:1024px) 100vw, 55vw"
                className="object-cover transition-transform duration-500 ease-out"
                style={{
                  transform: zoomed ? 'scale(1.1)' : 'scale(1)',
                  transformOrigin: 'var(--zx, 50%) var(--zy, 50%)',
                }}
              />
              {savings > 0 && (
                <span className="absolute left-4 top-4 rounded-full bg-brand px-3 py-1 text-[12px] font-bold text-cream shadow">−{savings}%</span>
              )}
            </div>

            {/* thumbnails */}
            {images.length > 1 && (
              <div className="no-scrollbar mt-3 flex gap-2.5 overflow-x-auto pb-1" role="group" aria-label="Product images">
                {images.map((src, i) => (
                  <button
                    key={`${src}-${i}`}
                    type="button"
                    onClick={() => setImgIdx(i)}
                    aria-label={`Show image ${i + 1} of ${images.length}`}
                    aria-current={i === imgIdx}
                    className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl transition-all sm:h-20 sm:w-20 ${
                      i === imgIdx ? 'ring-2 ring-brand ring-offset-2 ring-offset-cream' : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    <Image src={src} alt="" fill sizes="80px" className="object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* badge row */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line-warm bg-card px-3 py-1.5 text-[12px] font-semibold text-jaggery-2">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden /> Made in small batches · Batch {batchLabel}
              </span>
              {p.isDemo && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-turmeric/50 bg-turmeric/10 px-3 py-1.5 text-[12px] font-semibold text-jaggery-2">
                  <FlaskConical className="h-3.5 w-3.5" aria-hidden /> Demo SKU — editable in admin
                </span>
              )}
            </div>
          </div>

          {/* ── RIGHT · sticky buy box ───────────────────── */}
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="text-eyebrow text-jaggery-3">{p.categoryNameEn}</p>
            <h1 className="font-display text-display-2 mt-2 font-semibold text-ink">{p.nameEn}</h1>
            <p className="font-dev-display mt-1 text-xl text-jaggery-2" lang="hi">
              {p.nameHi}
            </p>
            <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{p.taglineEn}</p>
            <p className="font-dev-body mt-1 text-[15px] leading-relaxed text-jaggery-3" lang="hi">
              {p.taglineHi}
            </p>

            {/* rating row → reviews section */}
            <button
              type="button"
              onClick={scrollToReviews}
              className="mt-4 flex items-center gap-2 text-[13.5px] font-semibold text-jaggery-2 transition hover:text-ink"
              aria-label={`Rated ${avg.toFixed(1)} out of 5 from ${p.reviewCount} reviews — jump to reviews`}
            >
              <Stars value={avg} />
              <span>{avg.toFixed(1)}</span>
              <span className="font-medium text-muted-foreground">· {p.reviewCount} reviews</span>
              <ChevronDown className="h-3.5 w-3.5" aria-hidden />
            </button>

            {/* price row */}
            <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-display text-[34px] font-bold leading-none text-ink">{formatINR(unit)}</span>
              {unitMrp > unit && <span className="text-[16px] text-muted-foreground line-through">{formatINR(unitMrp)}</span>}
              {savings > 0 && <span className="rounded-full bg-brand/10 px-2.5 py-1 text-[12px] font-bold text-brand">−{savings}%</span>}
              <span className="w-full text-[11.5px] font-medium text-jaggery-3">incl. GST</span>
            </div>

            {/* stock state */}
            <div className="mt-3">
              {oos ? (
                <span className="inline-flex items-center rounded-full bg-jaggery px-3 py-1.5 text-[12px] font-bold text-cream">Out of stock</span>
              ) : lowStock ? (
                <span className="inline-flex animate-pulse items-center rounded-full bg-turmeric/25 px-3 py-1.5 text-[12px] font-bold text-jaggery-2">
                  Only {p.stock} left — fresh batch selling fast
                </span>
              ) : (
                <span className="inline-flex items-center text-[13px] font-bold text-jaggery">In stock ✓</span>
              )}
            </div>

            {/* variant selector */}
            {variants.length > 0 && (
              <div className="mt-6">
                <p className="text-[12px] font-bold uppercase tracking-wider text-jaggery-2">Weight / pack</p>
                <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Choose pack size">
                  {variants.map((x) => {
                    const active = (v?.label ?? '') === x.label;
                    return (
                      <button
                        key={x.label}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => {
                          setVariantLabel(x.label);
                          setQty(1);
                        }}
                        className={`rounded-full px-4 py-2 text-[13px] font-semibold transition-all ${
                          active
                            ? 'bg-brand text-cream shadow-[0_10px_22px_-10px_rgba(216,0,24,0.7)]'
                            : 'border border-line-warm bg-card text-ink hover:border-jaggery-2'
                        }`}
                      >
                        {x.label}
                        {x.weightG > 0 && <span className={active ? 'text-cream/80' : 'text-muted-foreground'}> · {x.weightG} g</span>}
                        {x.priceDelta > 0 && <span className={active ? 'text-turmeric-soft' : 'text-brand'}> +{formatINR(x.priceDelta)}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* qty stepper + add to cart + wishlist + buy now */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div className="flex items-center rounded-full border border-line-warm bg-card" aria-label="Quantity">
                <button
                  type="button"
                  onClick={() => setQty((n) => Math.max(1, n - 1))}
                  className="grid h-11 w-11 place-items-center rounded-l-full transition hover:bg-cream-2"
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-4 w-4" aria-hidden />
                </button>
                <span className="w-8 text-center text-[15px] font-bold" aria-live="polite">
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() => setQty((n) => Math.min(20, n + 1))}
                  className="grid h-11 w-11 place-items-center rounded-r-full transition hover:bg-cream-2"
                  aria-label="Increase quantity"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                </button>
              </div>

              <Magnetic strength={0.2}>
                <button
                  ref={addBtnRef}
                  type="button"
                  onClick={() => handleAdd(addBtnRef.current)}
                  disabled={oos}
                  className="btn-primary text-[14px]"
                  aria-label={`Add ${qty} × ${p.nameEn} to cart`}
                >
                  <ShoppingBag className="h-[18px] w-[18px]" aria-hidden /> Add to cart · {formatINR(unit * qty)}
                </button>
              </Magnetic>

              <button
                type="button"
                onClick={() => toggleWish(p.slug)}
                aria-pressed={wished}
                aria-label={wished ? `Remove ${p.nameEn} from wishlist` : `Save ${p.nameEn} to wishlist`}
                className={`grid h-12 w-12 place-items-center rounded-full border transition-all ${
                  wished ? 'border-brand/40 bg-brand/10' : 'border-line-warm bg-card hover:border-jaggery-2'
                }`}
              >
                <Heart className={`h-5 w-5 transition ${wished ? 'scale-110 fill-brand text-brand' : 'text-jaggery-2'}`} aria-hidden />
              </button>

              <button type="button" onClick={buyNow} disabled={oos} className="btn-ghost text-[14px]">
                Buy now
              </button>
            </div>

            {/* trust rows */}
            <div className="mt-6 grid gap-3 rounded-2xl border border-line-warm bg-card/70 p-4 sm:grid-cols-3">
              {TRUST.map(({ icon: Icon, label }) => (
                <p key={label} className="flex items-center gap-2 text-[12.5px] font-semibold text-jaggery-2">
                  <Icon className="h-4 w-4 shrink-0 text-jaggery-3" aria-hidden /> {label}
                </p>
              ))}
            </div>

            {/* pincode checker */}
            <div className="mt-4 rounded-2xl border border-line-warm bg-card/70 p-4">
              <p className="text-[12px] font-bold uppercase tracking-wider text-jaggery-2">Delivery check</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <input
                  inputMode="numeric"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onKeyDown={(e) => e.key === 'Enter' && checkPin()}
                  placeholder="Enter pincode"
                  aria-label="Delivery pincode"
                  className="w-40 rounded-full border border-line-warm bg-cream px-4 py-2.5 text-[14px] font-semibold tracking-[0.18em] text-ink placeholder:tracking-normal placeholder:text-jaggery-3/60 outline-none transition focus:border-brand"
                />
                <button
                  type="button"
                  onClick={checkPin}
                  disabled={pinStatus === 'checking'}
                  className="inline-flex items-center gap-1.5 rounded-full bg-turmeric px-5 py-2.5 text-[13px] font-bold text-ink transition hover:brightness-105 active:scale-95 disabled:opacity-60"
                >
                  {pinStatus === 'checking' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <MapPin className="h-4 w-4" aria-hidden />}
                  Check
                </button>
              </div>
              <div aria-live="polite" className="mt-2 min-h-5 text-[13px] font-medium">
                {pinStatus === 'ok' && pinResult && (
                  <span className="inline-flex items-center gap-1.5 text-jaggery-2">
                    <Truck className="h-4 w-4 text-brand" aria-hidden />
                    Delivers {pinResult.etaLabel}
                    {pinResult.city ? ` · ${pinResult.city}, ${pinResult.state}` : ' · across India'}
                  </span>
                )}
                {pinStatus === 'err' && <span className="text-brand">{pinError}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* ── tabs: story / ingredients / nutrition / storage ── */}
        <div className="mt-16">
          <Tabs defaultValue="story">
            <TabsList className="h-auto w-full max-w-xl justify-start gap-1 overflow-x-auto rounded-full bg-cream-2 p-1.5">
              <TabsTrigger value="story" className="rounded-full px-4 py-2 text-[13px] font-semibold data-[state=active]:bg-card data-[state=active]:text-ink">
                Story
              </TabsTrigger>
              <TabsTrigger value="ingredients" className="rounded-full px-4 py-2 text-[13px] font-semibold data-[state=active]:bg-card data-[state=active]:text-ink">
                Ingredients
              </TabsTrigger>
              <TabsTrigger value="nutrition" className="rounded-full px-4 py-2 text-[13px] font-semibold data-[state=active]:bg-card data-[state=active]:text-ink">
                Nutrition
              </TabsTrigger>
              <TabsTrigger value="storage" className="rounded-full px-4 py-2 text-[13px] font-semibold data-[state=active]:bg-card data-[state=active]:text-ink">
                Storage &amp; shelf life
              </TabsTrigger>
            </TabsList>

            <TabsContent value="story" className="mt-6 max-w-3xl">
              <p className="text-[15px] leading-[1.85] text-ink/85">{p.storyEn}</p>
              <p className="font-dev-body mt-4 text-[15.5px] leading-[1.9] text-jaggery-2" lang="hi">
                {p.storyHi}
              </p>
            </TabsContent>

            <TabsContent value="ingredients" className="mt-6 max-w-3xl">
              <p className="text-[15px] leading-[1.85] text-ink/85">{p.ingredientsEn}</p>
              <p className="font-dev-body mt-4 text-[15.5px] leading-[1.9] text-jaggery-2" lang="hi">
                {p.ingredientsHi}
              </p>
              {p.allergensEn.trim() && (
                <div className="mt-5 rounded-2xl border border-turmeric/60 bg-turmeric/10 px-4 py-3" role="note">
                  <p className="text-[12px] font-bold uppercase tracking-wider text-jaggery-2">Allergens</p>
                  <p className="mt-1 text-[14px] leading-relaxed text-ink/85">{p.allergensEn}</p>
                  {p.allergensHi.trim() && (
                    <p className="font-dev-body mt-1 text-[14px] leading-relaxed text-jaggery-2" lang="hi">
                      {p.allergensHi}
                    </p>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="nutrition" className="mt-6 max-w-xl">
              {nutrition.length > 0 ? (
                <div className="overflow-hidden rounded-2xl border border-line-warm">
                  <div className="flex items-center justify-between bg-cream-2 px-4 py-2.5 text-[12px] font-bold uppercase tracking-wider text-jaggery-2">
                    <span>Nutrient</span>
                    <span>Per 100 g</span>
                  </div>
                  {nutrition.map((row, i) => (
                    <div key={`${row.label}-${i}`} className="flex items-center justify-between border-t border-line-warm bg-card px-4 py-2.5 text-[14px]">
                      <span className="text-muted-foreground">{row.label}</span>
                      <span className="font-bold text-ink">{row.per100g}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[14px] text-muted-foreground">Nutrition details available on request.</p>
              )}
            </TabsContent>

            <TabsContent value="storage" className="mt-6 max-w-3xl">
              <p className="text-[15px] leading-[1.85] text-ink/85">{p.storageEn}</p>
              <p className="font-dev-body mt-4 text-[15.5px] leading-[1.9] text-jaggery-2" lang="hi">
                {p.storageHi}
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-turmeric/15 px-3.5 py-1.5 text-[12.5px] font-bold text-jaggery-2">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden /> Shelf life: {p.shelfLifeDays} days
              </span>
            </TabsContent>
          </Tabs>
        </div>

        {/* ── compliance & details (Legal Metrology + FSSAI) ── */}
        <section aria-label="Compliance and product details" className="card-warm mt-14 max-w-3xl p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-eyebrow text-jaggery-3">The fine print, honestly</p>
              <h2 className="font-display mt-1 text-2xl font-semibold text-ink">Compliance &amp; details</h2>
            </div>
            <VegMark />
          </div>

          <dl className="mt-6 grid gap-x-10 gap-y-4 sm:grid-cols-2">
            <div>
              <dt className={LAW_LABEL}>Net quantity</dt>
              <dd className={LAW_VALUE}>{netQty || 'As printed on the pack'}</dd>
            </div>
            <div>
              <dt className={LAW_LABEL}>MRP</dt>
              <dd className={LAW_VALUE}>
                <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-muted-foreground line-through">{formatINR(unitMrp)}</span>
                  <span>{formatINR(unit)}</span>
                  <span className="rounded-full bg-turmeric/15 px-2 py-0.5 text-[10.5px] font-bold text-jaggery-2">Inclusive of all taxes</span>
                </span>
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className={LAW_LABEL}>Manufacturer · Packer · Marketer</dt>
              <dd className={LAW_VALUE}>
                {manufacturerName ? (
                  <>
                    {manufacturerName}
                    {manufacturerAddress && <span className="block font-normal text-muted-foreground">{manufacturerAddress}</span>}
                  </>
                ) : (
                  <span className="font-normal text-muted-foreground">Will be updated — admin setting pending</span>
                )}
              </dd>
            </div>
            <div>
              <dt className={LAW_LABEL}>Month &amp; year of packing</dt>
              <dd className={LAW_VALUE}>{packedMonthYear || 'Packed fresh on order'}</dd>
            </div>
            <div>
              <dt className={LAW_LABEL}>Best before</dt>
              <dd className={LAW_VALUE}>
                {bestBefore
                  ? `${fmtDate(bestBefore.toISOString())} (${shelfDays} days from packing)`
                  : shelfDays > 0
                    ? `${shelfDays} days from packing`
                    : 'As printed on the pack'}
              </dd>
            </div>
            <div>
              <dt className={LAW_LABEL}>FSSAI license</dt>
              <dd className={LAW_VALUE}>
                {fssaiNumber || <span className="font-normal text-muted-foreground">Details to be updated</span>}
              </dd>
            </div>
            <div>
              <dt className={LAW_LABEL}>Country of origin</dt>
              <dd className={LAW_VALUE}>India</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className={LAW_LABEL}>Consumer care</dt>
              <dd className={LAW_VALUE}>
                {supportEmail || supportPhone ? (
                  <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    {supportEmail && (
                      <a href={`mailto:${supportEmail}`} className="font-semibold underline-offset-2 hover:underline">{supportEmail}</a>
                    )}
                    {supportPhone && (
                      <a href={`tel:${supportPhone.replace(/[^\d+]/g, '')}`} className="font-semibold underline-offset-2 hover:underline">{supportPhone}</a>
                    )}
                  </span>
                ) : (
                  <span className="font-normal text-muted-foreground">Details to be updated</span>
                )}
              </dd>
            </div>
          </dl>
        </section>

        {/* ── FAQs ──────────────────────────────────────────── */}
        {faq.length > 0 && (
          <div className="mt-14 max-w-3xl">
            <h2 className="font-display text-2xl font-semibold text-ink">Questions, answered</h2>
            <Accordion type="single" collapsible className="mt-4">
              {faq.map((f, i) => (
                <AccordionItem key={`faq-${i}`} value={`faq-${i}`}>
                  <AccordionTrigger className="text-[15px] font-semibold text-ink hover:no-underline">
                    <span>
                      {f.qEn}
                      {f.qHi && (
                        <span className="font-dev-display ml-2 text-[15px] font-normal text-jaggery-2" lang="hi">
                          {f.qHi}
                        </span>
                      )}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="text-[14.5px] leading-relaxed text-muted-foreground">
                    <p>{f.aEn}</p>
                    {f.aHi && (
                      <p className="font-dev-body mt-2 text-[15px] text-jaggery-2" lang="hi">
                        {f.aHi}
                      </p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        )}

        {/* ── reviews ───────────────────────────────────────── */}
        <section id="reviews" className="mt-16 scroll-mt-28">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-eyebrow text-jaggery-3">Word of mouth</p>
              <h2 className="font-display text-display-2 mt-1 font-semibold text-ink">What Bihar says</h2>
            </div>
            <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
              <DialogTrigger asChild>
                <button type="button" className="btn-ghost text-[13.5px]">
                  Write a review
                </button>
              </DialogTrigger>
              <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto rounded-3xl bg-card p-6 sm:p-7">
                <DialogHeader>
                  <DialogTitle className="font-display text-2xl font-semibold text-ink">Write a review</DialogTitle>
                  <DialogDescription className="text-[13.5px] text-muted-foreground">
                    Tell fellow food-lovers how {p.nameEn} tasted — freshness, packing, everything.
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Your name"
                      aria-label="Your name"
                      className={FIELD}
                    />
                    <input
                      value={form.city}
                      onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                      placeholder="City"
                      aria-label="City"
                      className={FIELD}
                    />
                  </div>
                  <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Your star rating">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={form.rating === n}
                        aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`}
                        onClick={() => setForm((f) => ({ ...f, rating: n }))}
                        className="p-0.5 transition-transform hover:scale-110"
                      >
                        <Star className={`h-6 w-6 transition ${n <= form.rating ? 'fill-turmeric text-turmeric' : 'text-jaggery-3/50'}`} aria-hidden />
                      </button>
                    ))}
                    <span className="ml-1 text-[12.5px] font-semibold text-jaggery-2">
                      {form.rating ? `${form.rating}/5` : 'Tap to rate'}
                    </span>
                  </div>
                  <input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Headline (optional)"
                    aria-label="Review headline"
                    className={FIELD}
                  />
                  <textarea
                    value={form.body}
                    onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                    rows={4}
                    placeholder="How was the taste, the freshness, the packing?"
                    aria-label="Your review"
                    className={`${FIELD} resize-none`}
                  />
                  {formError && (
                    <p className="text-[13px] font-semibold text-brand" role="alert">
                      {formError}
                    </p>
                  )}
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setReviewOpen(false)}
                      className="rounded-full border border-line-warm px-5 py-2 text-[13.5px] font-semibold text-ink transition hover:bg-cream-2"
                    >
                      Cancel
                    </button>
                    <button type="button" onClick={submitReview} disabled={submitting} className="btn-primary text-[13.5px]">
                      {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                      Submit review
                    </button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* summary */}
          <div className="card-warm mt-6 flex flex-wrap items-center gap-x-8 gap-y-4 px-6 py-5">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-[44px] font-bold leading-none text-ink">{avg.toFixed(1)}</span>
              <span className="text-[13px] font-semibold text-muted-foreground">/ 5</span>
            </div>
            <div className="space-y-1.5">
              <Stars value={avg} size="h-[18px] w-[18px]" />
              <p className="text-[13px] font-semibold text-muted-foreground">
                <CountUp to={p.reviewCount} /> verified {p.reviewCount === 1 ? 'review' : 'reviews'} from homes across India
              </p>
            </div>
          </div>

          {/* review cards */}
          {reviews.length === 0 ? (
            <p className="mt-8 text-[14.5px] text-muted-foreground">No reviews yet — be the first to taste and tell.</p>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {reviews.map((r) => (
                <article key={r.id} className="card-warm p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[15px] font-bold text-ink">
                        {r.name}
                        {r.city && <span className="font-medium text-muted-foreground"> · {r.city}</span>}
                      </p>
                      <Stars value={r.rating} className="mt-0.5" />
                    </div>
                    <time className="shrink-0 text-[11.5px] font-medium text-muted-foreground" dateTime={r.createdAt}>
                      {fmtDate(r.createdAt)}
                    </time>
                  </div>
                  {r.title && <p className="font-display mt-2.5 text-[16px] font-semibold text-ink">{r.title}</p>}
                  <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">{r.body}</p>
                  {r.verified && (
                    <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-turmeric/15 px-2.5 py-1 text-[11px] font-bold text-jaggery-2">
                      <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> Verified buyer
                    </span>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        {/* ── related products ──────────────────────────────── */}
        {related.length > 0 && (
          <section className="mt-16">
            <Reveal>
              <div className="flex items-center gap-3">
                <h2 className="font-display shrink-0 text-2xl font-semibold text-ink">Pairs beautifully with</h2>
                <span className="h-px flex-1 bg-line-warm" aria-hidden />
              </div>
            </Reveal>
            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
              {related.slice(0, 4).map((r, i) => (
                <ProductCard key={r.slug} product={r} index={i} onQuickView={openQuickView} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ── sticky mobile buy bar ─────────────────────────── */}
      <div
        className="glass fixed inset-x-3 bottom-[76px] z-40 flex items-center justify-between gap-3 rounded-2xl p-3 lg:hidden"
        role="region"
        aria-label="Quick add to cart"
      >
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-bold text-ink">{p.nameEn}</p>
          <p className="text-[12.5px] font-semibold text-jaggery-2">
            {formatINR(unit)}
            {v?.label ? <span className="font-medium text-muted-foreground"> · {v.label}</span> : null}
          </p>
        </div>
        <button
          ref={mobileAddRef}
          type="button"
          onClick={() => handleAdd(mobileAddRef.current)}
          disabled={oos}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-brand px-5 py-2.5 text-[13.5px] font-bold text-cream shadow-[0_10px_24px_-10px_rgba(216,0,24,0.6)] transition active:scale-95 disabled:opacity-40"
          aria-label={`Add ${p.nameEn} to cart`}
        >
          <ShoppingBag className="h-4 w-4" aria-hidden /> {oos ? 'Sold out' : 'Add'}
        </button>
      </div>
    </div>
  );
}

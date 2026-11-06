'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Plus, Minus, Trash2, Gift, TicketPercent, Loader2, ShoppingBag, Truck, Bookmark, ChevronDown } from 'lucide-react';
import { useUi, useCart, cartTotals, useProductCache, useSettings } from '@/lib/store';
import { useSavedForLater, type SavedItem } from '@/lib/saved-store';
import { api, pick } from '@/lib/api';
import { formatINR } from '@/lib/money';
import { toast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import type { CartLine, Product } from '@/lib/types';

/** Cart slide-over drawer — free-shipping bar, coupon, gift note, namkeen cross-sell */
export function CartDrawer() {
  const overlay = useUi((s) => s.overlay);
  const setOverlay = useUi((s) => s.setOverlay);
  const navigate = useUi((s) => s.navigate);
  const lang = useUi((s) => s.lang);
  const { lines, couponCode, giftNote, setQty, remove, setCoupon, setGiftNote } = useCart();
  const settings = useSettings((s) => s.data);
  const putMany = useProductCache((s) => s.putMany);
  const savedCount = useSavedForLater((s) => s.items.length);
  const [couponDraft, setCouponDraft] = useState(couponCode);
  const [applying, setApplying] = useState(false);
  const [upsell, setUpsell] = useState<Product[]>([]);

  /* last removed line, kept for the Undo action (6s window) */
  const undoRef = useRef<{ line: CartLine; index: number; at: number } | null>(null);

  const removeWithUndo = (line: CartLine, index: number) => {
    const p = useProductCache.getState().map[line.slug];
    const name = p ? pick(lang, p.nameEn, p.nameHi) : line.slug;
    remove(line.slug, line.variantLabel);
    undoRef.current = { line, index, at: Date.now() };
    toast({
      title: 'Removed ' + name,
      description: 'You can still undo this.',
      duration: 6000,
      action: (
        <ToastAction
          altText={'Undo removing ' + name}
          onClick={() => {
            const u = undoRef.current;
            if (!u) return;
            undoRef.current = null;
            // restore the exact line at its old position (skips if it was re-added meanwhile)
            useCart.setState((s) => {
              const exists = s.lines.some((l) => l.slug === u.line.slug && l.variantLabel === u.line.variantLabel);
              if (exists) return s;
              const next = [...s.lines];
              next.splice(Math.min(u.index, next.length), 0, u.line);
              return { lines: next };
            });
          }}
        >
          Undo
        </ToastAction>
      ),
    });
  };

  const saveForLater = (line: CartLine) => {
    const p = useProductCache.getState().map[line.slug];
    const name = p ? pick(lang, p.nameEn, p.nameHi) : line.slug;
    useSavedForLater.getState().add({
      slug: line.slug,
      variantLabel: line.variantLabel,
      qty: line.qty,
      nameEn: p?.nameEn || line.slug,
      nameHi: p?.nameHi,
      image: p?.images?.[0],
      unitPrice: line.unitPrice,
      mrp: line.mrp,
      weightG: line.weightG,
    });
    remove(line.slug, line.variantLabel);
    toast({ title: 'Saved for later 💛', description: name + ' is waiting under Saved for later.' });
  };

  const freeAbove = settings?.shipping.freeAbovePaise ?? 99900;
  const totals = cartTotals(lines);
  const progress = Math.min(100, Math.round((totals.subtotal / freeAbove) * 100));

  useEffect(() => {
    if (overlay === 'cart' && upsell.length === 0) {
      api<{ products: Product[] }>('/api/products?perPage=3')
        .then((j) => { setUpsell(j.products); putMany(j.products); })
        .catch(() => {});
    }
  }, [overlay, upsell.length, putMany]);

  const applyCoupon = async (code: string) => {
    if (!code.trim()) return;
    setApplying(true);
    try {
      // server-side price check — no order is created
      const r = await fetch('/api/coupon/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lines: lines.map((l) => ({ slug: l.slug, variantLabel: l.variantLabel, qty: l.qty })),
          couponCode: code,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Coupon invalid');
      setCoupon(code);
      toast({ title: 'Coupon applied 🎉', description: `${code} — ${formatINR(j.discount || 0)} off at checkout` });
    } catch (e) {
      toast({ title: 'Coupon not applied', description: e instanceof Error ? e.message : 'Invalid coupon', variant: 'destructive' });
    }
    setApplying(false);
  };

  const suggested = upsell.find((u) => !lines.some((l) => l.slug === u.slug));

  return (
    <AnimatePresence>
      {overlay === 'cart' && (
        <motion.div className="fixed inset-0 z-[70] bg-jaggery/50 backdrop-blur-[3px]"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={() => setOverlay(null)}>
          <motion.aside
            role="dialog" aria-modal="true" aria-label="Shopping cart"
            className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-card shadow-2xl"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* header */}
            <div className="flex items-center justify-between border-b border-line-warm px-6 py-4">
              <h2 className="font-display flex items-center gap-2 text-xl font-semibold">
                <ShoppingBag className="h-5 w-5 text-brand" /> Your cart
                <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-bold text-brand">{totals.count}</span>
              </h2>
              <button onClick={() => setOverlay(null)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-cream-2" aria-label="Close cart">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* free shipping bar */}
            <div className="border-b border-line-warm bg-cream-2/70 px-6 py-3">
              {totals.subtotal < freeAbove ? (
                <p className="text-[13px] font-medium">
                  Add <b className="text-brand">{formatINR(freeAbove - totals.subtotal)}</b> more for <b>FREE delivery</b> 🚚
                </p>
              ) : (
                <p className="flex items-center gap-1.5 text-[13px] font-semibold text-jaggery-2"><Truck className="h-4 w-4" /> You&apos;ve unlocked FREE delivery!</p>
              )}
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-cream-2" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Free shipping progress">
                <motion.div className="sunrise-gradient h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} />
              </div>
            </div>

            {/* lines */}
            <div className="scroll-warm flex-1 overflow-y-auto px-6 py-4">
              {lines.length === 0 ? (
                <div className={savedCount > 0 ? 'py-8 text-center' : 'grid h-full place-items-center text-center'}>
                  <div>
                    <Image src="/brand/mandala.png" alt="" width={72} height={72} className="mx-auto rounded-full opacity-80" />
                    <p className="mt-4 font-display text-lg">Your cart is empty</p>
                    <p className="mt-1 text-sm text-muted-foreground">Thekua tastes better shared. Fill it up!</p>
                    <button onClick={() => { setOverlay(null); navigate('shop'); }} className="btn-primary mt-5">Browse the shop</button>
                  </div>
                </div>
              ) : (
                <ul className="space-y-4">
                  {lines.map((l, idx) => {
                    const p = useProductCache.getState().map[l.slug];
                    const img = p?.images[0] ?? l.slug;
                    return (
                      <li key={`${l.slug}-${l.variantLabel}`} className="flex gap-3 rounded-2xl border border-line-warm bg-cream-2/40 p-3">
                        <img src={img} alt={p?.nameEn ?? l.slug} className="h-20 w-20 rounded-xl object-cover" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-[14px] font-semibold">{p ? pick(lang, p.nameEn, p.nameHi) : l.slug}</p>
                              <p className="text-xs text-muted-foreground">{l.variantLabel}{l.weightG ? ` · ${l.weightG}g` : ''}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => saveForLater(l)}
                                className="text-muted-foreground transition hover:text-jaggery-2"
                                aria-label={`Save ${l.slug} for later`}
                              >
                                <Bookmark className="h-4 w-4" />
                              </button>
                              <button onClick={() => removeWithUndo(l, idx)} className="text-muted-foreground transition hover:text-brand" aria-label={`Remove ${l.slug}`}>
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <div className="flex items-center gap-1 rounded-full border border-line-warm bg-card">
                              <button onClick={() => setQty(l.slug, l.variantLabel, l.qty - 1)} className="grid h-7 w-7 place-items-center rounded-full hover:bg-cream-2" aria-label="Decrease quantity"><Minus className="h-3 w-3" /></button>
                              <span className="w-6 text-center text-sm font-bold" aria-live="polite">{l.qty}</span>
                              <button onClick={() => setQty(l.slug, l.variantLabel, Math.min(20, l.qty + 1))} className="grid h-7 w-7 place-items-center rounded-full hover:bg-cream-2" aria-label="Increase quantity"><Plus className="h-3 w-3" /></button>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold">{formatINR(l.unitPrice * l.qty)}</p>
                              {l.mrp > l.unitPrice && <p className="text-[11px] text-muted-foreground line-through">{formatINR(l.mrp * l.qty)}</p>}
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}

                  {/* cross-sell */}
                  {suggested && (
                    <li className="flex items-center gap-3 rounded-2xl border border-dashed border-brand/40 bg-brand/5 p-3">
                      <img src={suggested.images[0]} alt="" className="h-14 w-14 rounded-xl object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold">Add {pick(lang, suggested.nameEn, suggested.nameHi)}</p>
                        <p className="text-xs text-muted-foreground">Perfect chai partner — {formatINR(suggested.price)}</p>
                      </div>
                      <button
                        onClick={() => {
                          const { add } = useCart.getState();
                          add(suggested, suggested.variants[0]?.label);
                          toast({ title: 'Added to cart', description: suggested.nameEn });
                        }}
                        className="btn-gold shrink-0 !px-4 !py-2 text-[13px]"
                      >
                        Add
                      </button>
                    </li>
                  )}

                  {/* gift note */}
                  <li className="rounded-2xl border border-line-warm p-3">
                    <label htmlFor="gift-note" className="flex items-center gap-1.5 text-[13px] font-semibold"><Gift className="h-4 w-4 text-brand" /> Gift note {`(free, hand-written)`}</label>
                    <textarea
                      id="gift-note"
                      value={giftNote}
                      onChange={(e) => setGiftNote(e.target.value)}
                      placeholder="Happy Chhath, Maa! From your favourite beta…"
                      rows={2}
                      maxLength={300}
                      className="mt-2 w-full resize-none rounded-xl border border-line-warm bg-cream-2/40 px-3 py-2 text-sm outline-none focus:border-brand"
                    />
                  </li>
                </ul>
              )}

              {/* saved for later — persisted, guest-friendly */}
              <SavedForLater lang={lang} />
            </div>

            {/* footer */}
            {lines.length > 0 && (
              <div className="border-t border-line-warm px-6 py-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <TicketPercent className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={couponDraft}
                      onChange={(e) => setCouponDraft(e.target.value.toUpperCase())}
                      placeholder="Coupon code"
                      aria-label="Coupon code"
                      className="w-full rounded-full border border-line-warm bg-cream-2/40 py-2.5 pl-9 pr-3 text-sm font-semibold tracking-wide outline-none focus:border-brand"
                    />
                  </div>
                  <button onClick={() => applyCoupon(couponDraft)} disabled={applying} className="btn-ghost !px-4 !py-2.5 text-sm">
                    {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                  </button>
                </div>
                {couponCode === '' && (
                  <button onClick={() => { setCouponDraft('BIHARSE15'); applyCoupon('BIHARSE15'); }} className="mt-2 text-[12.5px] font-semibold text-brand underline underline-offset-2">
                    Try BIHARSE15 — 15% off, just for you ✨
                  </button>
                )}
                {couponCode && <p className="mt-2 text-[12.5px] font-semibold text-jaggery-2">✓ {couponCode} will apply at checkout</p>}

                <div className="mt-4 space-y-1.5 text-sm">
                  <Row label="Subtotal" value={formatINR(totals.subtotal)} />
                  {totals.savings > 0 && <Row label="Batch savings" value={`−${formatINR(totals.savings)}`} accent />}
                </div>
                <button onClick={() => { setOverlay(null); navigate('checkout'); }} className="btn-primary mt-4 w-full text-[15px]">
                  Checkout · from {formatINR(totals.subtotal)}
                </button>
                <p className="mt-2.5 text-center text-[11.5px] text-muted-foreground">Secured payments · UPI · Cards · Netbanking</p>
              </div>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={accent ? 'font-semibold text-brand' : 'font-semibold'}>{value}</span>
    </div>
  );
}

/** Persisted "Saved for later" rows — move back to cart or drop them entirely. */
function SavedForLater({ lang }: { lang: 'en' | 'hi' }) {
  const items = useSavedForLater((s) => s.items);
  const [open, setOpen] = useState(true);
  const [moving, setMoving] = useState('');

  if (items.length === 0) return null;

  const move = async (i: SavedItem) => {
    const key = i.slug + '|' + i.variantLabel;
    if (moving) return;
    setMoving(key);
    const ok = await useSavedForLater.getState().moveToCart(i.slug, i.variantLabel);
    setMoving('');
    if (ok) {
      toast({ title: 'Moved to cart 🛒', description: (lang === 'hi' && i.nameHi ? i.nameHi : i.nameEn) });
    } else {
      toast({ title: 'Could not move to cart', description: 'This product may no longer be available.', variant: 'destructive' });
    }
  };

  return (
    <section aria-label="Saved for later" className="mt-4 rounded-2xl border border-line-warm">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Toggle saved for later section"
        className="flex w-full items-center justify-between px-3.5 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-[13px] font-bold text-jaggery">
          <Bookmark className="h-4 w-4 text-brand" /> Saved for later ({items.length})
        </span>
        <ChevronDown className={'h-4 w-4 text-muted-foreground transition-transform ' + (open ? 'rotate-180' : '')} />
      </button>
      {open && (
        <div className="space-y-3 border-t border-line-warm px-3.5 py-3">
          {items.map((i) => {
            const key = i.slug + '|' + i.variantLabel;
            return (
              <div key={key} className="flex items-center gap-2.5">
                <img src={i.image || '/brand/mandala.png'} alt={i.nameEn} className="h-12 w-12 rounded-xl border border-line-warm object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold">{lang === 'hi' && i.nameHi ? i.nameHi : i.nameEn}</p>
                  <p className="text-[11px] text-muted-foreground">{i.variantLabel}{i.weightG ? ` · ${i.weightG}g` : ''} · Qty {i.qty} · {formatINR(i.unitPrice)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    onClick={() => move(i)}
                    disabled={moving === key}
                    className="btn-gold !px-3 !py-1.5 text-[12px]"
                  >
                    {moving === key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Move to cart'}
                  </button>
                  <button
                    onClick={() => useSavedForLater.getState().remove(i.slug, i.variantLabel)}
                    className="text-muted-foreground transition hover:text-brand"
                    aria-label={'Remove ' + i.nameEn + ' from saved items'}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

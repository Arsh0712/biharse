'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  Ban, FileText, ImagePlus, LifeBuoy, Loader2, Lock, Package, PackageSearch,
  RefreshCcw, Send, ShoppingBag, Truck, X,
} from 'lucide-react';
import {
  AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useUi, useAuth, useCart, useProductCache } from '@/lib/store';
import { api, pick } from '@/lib/api';
import { formatINR } from '@/lib/money';
import { toast } from '@/hooks/use-toast';
import { SectionOrnament } from '@/components/fx/madhubani';
import type { OrderDto, Product } from '@/lib/types';

/* status → badge classes (WCAG AA checked pairs) */
const STATUS_BADGE: Record<string, string> = {
  PENDING_PAYMENT: 'bg-turmeric text-ink',
  PAID: 'bg-turmeric-soft text-ink',
  PACKING: 'bg-turmeric text-ink',
  SHIPPED: 'bg-saffron text-ink',
  OUT_FOR_DELIVERY: 'bg-[#c2410c] text-cream',
  DELIVERED: 'bg-jaggery text-cream',
  PAYMENT_REVIEW: 'bg-turmeric text-ink',
  CANCELLED: 'bg-muted text-muted-foreground ring-1 ring-line-warm',
  REFUNDED: 'bg-muted text-muted-foreground ring-1 ring-line-warm',
  PAYMENT_FAILED: 'bg-brand text-cream',
};

function statusLabel(s: string) {
  const t = s.replace(/_/g, ' ').toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

const CANCEL_REASONS = ['Changed my mind', 'Ordered by mistake', 'Wrong address', 'Other'];

const CLAIM_TYPES = [
  { value: 'DAMAGED', label: 'Damaged item' },
  { value: 'WRONG_ITEM', label: 'Wrong item' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'MISSING', label: 'Something missing' },
  { value: 'OTHER', label: 'Other' },
];
const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB (mirrored server-side)

export default function OrdersView() {
  const navigate = useUi((s) => s.navigate);
  const setOverlay = useUi((s) => s.setOverlay);
  const lang = useUi((s) => s.lang);
  const user = useAuth((s) => s.user);
  const ready = useAuth((s) => s.ready);
  const cache = useProductCache((s) => s.map);
  const putMany = useProductCache((s) => s.putMany);

  const [orders, setOrders] = useState<OrderDto[]>([]);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const [reordering, setReordering] = useState<string | null>(null);

  /* cancel flow */
  const [cancelFor, setCancelFor] = useState<OrderDto | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelNote, setCancelNote] = useState('');
  const [cancelling, setCancelling] = useState(false);

  /* claim flow */
  const [claimFor, setClaimFor] = useState<OrderDto | null>(null);

  useEffect(() => {
    if (!ready || !user) return;
    let alive = true;
    api<{ orders: OrderDto[] }>('/api/account/orders')
      .then((j) => {
        if (!alive) return;
        setOrders(j.orders);
        setLoadedFor(user.id);
        setFailed(false);
      })
      .catch(() => {
        if (!alive) return;
        setFailed(true);
        setLoadedFor(user.id);
      });
    return () => { alive = false; };
  }, [ready, user, retryTick]);

  const loading = Boolean(user) && loadedFor !== user?.id;
  const showSignIn = !user;

  const reorder = async (o: OrderDto) => {
    if (reordering) return;
    setReordering(o.id);
    try {
      const slugs = [...new Set(o.items.map((i) => i.slug))].join(',');
      const j = await api<{ products: Product[] }>('/api/products?slugs=' + encodeURIComponent(slugs));
      putMany(j.products);
      const { add } = useCart.getState();
      let added = 0;
      for (const item of o.items) {
        const p = j.products.find((x) => x.slug === item.slug);
        if (!p) continue;
        const variant =
          p.variants.find((v) => v.label === item.variantLabel)?.label || p.variants[0]?.label;
        add(p, variant, item.qty);
        added++;
      }
      if (added === 0) {
        toast({ title: 'Item details loading', description: 'Try again in a moment.' });
      } else {
        toast({ title: 'Added to cart 🛒', description: added + ' item' + (added > 1 ? 's' : '') + ' from ' + o.number });
        setOverlay('cart');
      }
    } catch {
      toast({ title: 'Could not reorder', description: 'Please try again.', variant: 'destructive' });
    }
    setReordering(null);
  };

  const openCancel = (o: OrderDto) => {
    setCancelReason('');
    setCancelNote('');
    setCancelFor(o);
  };

  const submitCancel = async () => {
    if (!cancelFor || cancelling) return;
    setCancelling(true);
    try {
      const j = await api<{ ok: boolean; status: string; refundId?: string }>('/api/orders/cancel', {
        method: 'POST',
        body: JSON.stringify({ number: cancelFor.number, email: cancelFor.email, reason: cancelReason, note: cancelNote.trim() }),
      });
      toast({
        title: 'Order cancelled',
        description: j.status === 'REFUNDED'
          ? 'Refund initiated — it reflects in 5–7 working days.'
          : 'Refund will be processed manually — support will follow up.',
      });
      setCancelFor(null);
      setRetryTick((t) => t + 1); // refresh list
    } catch (e) {
      toast({ title: 'Could not cancel order', description: e instanceof Error ? e.message : 'Please try again', variant: 'destructive' });
    }
    setCancelling(false);
  };

  /* ── sign-in guard ── */
  if (ready && showSignIn) {
    return (
      <div className="mx-auto max-w-7xl px-4 pb-28 pt-28 sm:px-6 md:pt-32">
        <div className="card-warm mx-auto max-w-lg px-8 py-14 text-center">
          <img src="/brand/mandala.png" alt="BiharSe mandala" className="animate-spin-slow mx-auto h-20 w-20 rounded-full" />
          <h1 className="font-display mt-6 text-2xl font-semibold text-ink">Your orders live here</h1>
          <p className="mx-auto mt-2 max-w-sm text-[14px] text-muted-foreground">
            Sign in with your email OTP to see every batch you&apos;ve ordered and where it&apos;s reached.
          </p>
          <button onClick={() => setOverlay('auth')} className="btn-primary mt-7">
            <Lock className="h-4.5 w-4.5" /> Sign in to view orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 pb-28 pt-28 sm:px-6 md:pt-32">
      <div className="text-center">
        <p className="text-eyebrow text-jaggery-3">Order history</p>
        <h1 className="font-display mt-2 text-display-2 font-semibold text-ink">My Orders</h1>
        <div className="mt-4"><SectionOrnament /></div>
      </div>

      {/* loading skeletons */}
      {loading && (
        <div className="mt-10 space-y-5" aria-busy="true" aria-label="Loading orders">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card-warm p-5">
              <div className="skeleton h-6 w-56 rounded-full" />
              <div className="mt-4 flex gap-3">
                <div className="skeleton h-16 w-16 rounded-xl" />
                <div className="skeleton h-16 w-16 rounded-xl" />
                <div className="skeleton h-16 w-16 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* fetch failed */}
      {!loading && !showSignIn && failed && (
        <div className="card-warm mt-10 px-8 py-12 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand/10 text-brand">
            <PackageSearch className="h-7 w-7" />
          </span>
          <h2 className="font-display mt-4 text-xl font-semibold text-ink">Couldn&apos;t load your orders</h2>
          <p className="mt-1.5 text-[13.5px] text-muted-foreground">Your session may have expired — sign in again or retry.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button onClick={() => setOverlay('auth')} className="btn-primary !px-5 !py-2.5 text-[14px]">Sign in</button>
            <button
              onClick={() => { setRetryTick((t) => t + 1); }}
              className="btn-ghost !px-5 !py-2.5 text-[14px]"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* empty state */}
      {!loading && !failed && orders.length === 0 && (
        <div className="card-warm mt-10 px-8 py-14 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand/10 text-brand">
            <Package className="h-8 w-8" />
          </span>
          <h2 className="font-display mt-5 text-2xl font-semibold text-ink">No orders yet — your first batch awaits</h2>
          <p className="mx-auto mt-2 max-w-sm text-[14px] text-muted-foreground">
            Fresh thekua, fried in small batches and rushed to your door.
          </p>
          <button onClick={() => navigate('shop')} className="btn-primary mt-7">
            <ShoppingBag className="h-4.5 w-4.5" /> Browse shop
          </button>
        </div>
      )}

      {/* order cards */}
      <div className="mt-10 space-y-5">
        {orders.map((o, idx) => (
          <motion.article
            key={o.id}
            className="card-warm overflow-hidden"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: Math.min(idx * 0.06, 0.3), ease: [0.22, 1, 0.36, 1] }}
          >
            {/* header row */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line-warm px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <p className="font-display text-[17px] font-bold text-ink">{o.number}</p>
                <p className="text-[12px] text-muted-foreground">
                  {new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <span
                className={'rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide ' + (STATUS_BADGE[o.status] ?? 'bg-muted text-muted-foreground ring-1 ring-line-warm')}
              >
                {statusLabel(o.status)}
              </span>
              <span className="ml-auto text-right">
                <span className="block text-[11px] uppercase tracking-wide text-muted-foreground">Total</span>
                <span className="font-display text-[17px] font-bold text-ink">{formatINR(o.total)}</span>
              </span>
            </div>

            {/* items */}
            <div className="scroll-warm flex gap-3 overflow-x-auto px-5 py-4 sm:px-6">
              {o.items.map((item, i) => {
                const p = cache[item.slug];
                const img = item.image || p?.images?.[0] || '/brand/mandala.png';
                return (
                  <div key={item.slug + item.variantLabel + i} className="flex w-40 shrink-0 gap-2.5">
                    <Image
                      src={img}
                      alt={item.nameEn}
                      width={56}
                      height={56}
                      className="h-14 w-14 shrink-0 rounded-xl border border-line-warm object-cover"
                    />
                    <div className="min-w-0 py-0.5">
                      <p className="truncate text-[12.5px] font-semibold text-ink">{p ? pick(lang, p.nameEn, p.nameHi) : item.nameEn}</p>
                      <p className="text-[11px] text-muted-foreground">{item.variantLabel}{item.weightG ? ` · ${item.weightG}g` : ''} × {item.qty}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* actions */}
            <div className="flex flex-wrap gap-2.5 border-t border-line-warm bg-cream-2/40 px-5 py-3.5 sm:px-6">
              <button onClick={() => navigate('track', { orderNumber: o.number })} className="btn-ghost !px-4 !py-2 text-[13px]">
                <Truck className="h-4 w-4 text-jaggery-2" /> Track
              </button>
              <button
                onClick={() => window.open('/api/invoice/' + o.number + '?email=' + encodeURIComponent(o.email), '_blank', 'noopener')}
                className="btn-ghost !px-4 !py-2 text-[13px]"
                aria-label={'Open invoice for order ' + o.number}
              >
                <FileText className="h-4 w-4 text-jaggery-2" /> Invoice
              </button>
              <button
                onClick={() => reorder(o)}
                disabled={reordering === o.id}
                className="btn-gold !px-4 !py-2 text-[13px]"
              >
                {reordering === o.id ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                Reorder
              </button>
              {o.status === 'PAID' && (
                <button onClick={() => openCancel(o)} className="btn-ghost !px-4 !py-2 text-[13px] !text-brand !border-brand/40">
                  <Ban className="h-4 w-4" /> Cancel order
                </button>
              )}
              {o.status === 'DELIVERED' && (
                <button onClick={() => setClaimFor(o)} className="btn-ghost !px-4 !py-2 text-[13px]">
                  <LifeBuoy className="h-4 w-4 text-jaggery-2" /> Report a problem
                </button>
              )}
              <span className="ml-auto hidden items-center text-[12px] text-muted-foreground sm:flex">
                <PackageSearch className="mr-1 h-3.5 w-3.5" /> {o.items.length} item{o.items.length !== 1 ? 's' : ''}
              </span>
            </div>
          </motion.article>
        ))}
      </div>

      {/* ── cancel order dialog ── */}
      <AlertDialog open={Boolean(cancelFor)} onOpenChange={(v) => { if (!v) setCancelFor(null); }}>
        <AlertDialogContent className="max-w-md rounded-3xl border-line-warm bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl text-ink">Cancel order {cancelFor?.number}?</AlertDialogTitle>
            <AlertDialogDescription className="text-[13.5px] leading-relaxed text-muted-foreground">
              This starts a full refund to your original payment method — it reflects in 5–7 working days. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-jaggery">Reason</label>
              <Select value={cancelReason} onValueChange={setCancelReason}>
                <SelectTrigger className="w-full rounded-xl border-line-warm bg-cream-2/40" aria-label="Cancellation reason">
                  <SelectValue placeholder="Choose a reason" />
                </SelectTrigger>
                <SelectContent>
                  {CANCEL_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="cancel-note" className="mb-1.5 block text-[13px] font-semibold text-jaggery">Note (optional)</label>
              <Textarea
                id="cancel-note"
                value={cancelNote}
                onChange={(e) => setCancelNote(e.target.value)}
                rows={2}
                maxLength={300}
                placeholder="Anything we should know?"
                className="resize-none rounded-xl border-line-warm bg-cream-2/40"
              />
            </div>
          </div>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <button onClick={() => setCancelFor(null)} className="btn-ghost !px-4 !py-2.5 text-[14px]">
              Keep order
            </button>
            <button
              onClick={submitCancel}
              disabled={cancelling || !cancelReason}
              className="btn-primary !px-4 !py-2.5 text-[14px]"
            >
              {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
              Cancel &amp; refund
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── report a problem (claim) dialog ── */}
      {claimFor && (
        <ClaimDialog
          order={claimFor}
          open={Boolean(claimFor)}
          onOpenChange={(v) => { if (!v) setClaimFor(null); }}
        />
      )}
    </div>
  );
}

/* ── claim dialog: type + description + optional photo (≤5 MB) ── */

function ClaimDialog({ order, open, onOpenChange }: { order: OrderDto; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [claimNumber, setClaimNumber] = useState('');
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setType(''); setDescription(''); setPhoto(null); setPreview(''); setClaimNumber(''); setError('');
  };

  const pickFile = (f: File | null) => {
    if (!f) { setPhoto(null); setPreview(''); return; }
    if (!f.type.startsWith('image/')) { setError('Please choose an image file'); return; }
    if (f.size > MAX_PHOTO_BYTES) { setError('Photo must be under 5 MB'); return; }
    setError('');
    setPhoto(f);
    setPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (submitting) return;
    if (!type) { setError('Please choose a problem type'); return; }
    if (description.trim().length < 10) { setError('Please describe the problem (at least 10 characters)'); return; }
    setSubmitting(true);
    setError('');
    try {
      const fd = new FormData();
      fd.set('orderNumber', order.number);
      fd.set('email', order.email);
      fd.set('type', type);
      fd.set('description', description.trim());
      if (photo) fd.set('photo', photo);
      const r = await fetch('/api/claims', { method: 'POST', body: fd });
      const j = await r.json().catch(() => ({})) as { ok?: boolean; claimNumber?: string; error?: string };
      if (!r.ok) throw new Error(j.error || 'Could not submit the claim');
      setClaimNumber(j.claimNumber || '');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit the claim');
    }
    setSubmitting(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-md rounded-3xl border-line-warm bg-card p-0" aria-describedby="claim-desc-note">
        {claimNumber ? (
          <div className="px-6 py-8 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-jaggery-2/10 text-jaggery-2">
              <LifeBuoy className="h-7 w-7" />
            </span>
            <h3 className="font-display mt-4 text-xl font-semibold text-ink">Claim {claimNumber} filed</h3>
            <p className="mx-auto mt-2 max-w-xs text-[13.5px] leading-relaxed text-muted-foreground">
              We reply within 48 hours. Track the status via email — we&apos;ll use this claim number in every update.
            </p>
            <button
              onClick={() => { onOpenChange(false); reset(); }}
              className="btn-primary mt-6 !px-5 !py-2.5 text-[14px]"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <DialogHeader className="border-b border-line-warm px-6 py-4">
              <DialogTitle className="font-display flex items-center gap-2 text-xl text-ink">
                <LifeBuoy className="h-5 w-5 text-brand" /> Report a problem
              </DialogTitle>
              <DialogDescription id="claim-desc-note" className="text-[13px] text-muted-foreground">
                Order {order.number} · tell us what went wrong and we&apos;ll make it right.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 px-6 py-4">
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-jaggery">What&apos;s wrong? *</label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="w-full rounded-xl border-line-warm bg-cream-2/40" aria-label="Problem type">
                    <SelectValue placeholder="Choose a problem type" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLAIM_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label htmlFor="claim-desc" className="mb-1.5 block text-[13px] font-semibold text-jaggery">Describe it *</label>
                <Textarea
                  id="claim-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  maxLength={2000}
                  placeholder="What arrived, what's wrong — the more detail, the faster we resolve it."
                  className="resize-none rounded-xl border-line-warm bg-cream-2/40"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-jaggery">Photo (optional, max 5 MB)</label>
                {preview ? (
                  <div className="relative w-fit">
                    <img src={preview} alt="Claim evidence preview" className="h-24 w-24 rounded-xl border border-line-warm object-cover" />
                    <button
                      onClick={() => { setPhoto(null); setPreview(''); if (fileRef.current) fileRef.current.value = ''; }}
                      className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-ink text-cream shadow"
                      aria-label="Remove photo"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => fileRef.current?.click()} className="btn-ghost !px-4 !py-2.5 text-[13px]">
                    <ImagePlus className="h-4 w-4 text-jaggery-2" /> Attach photo
                  </button>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                  aria-label="Attach evidence photo"
                />
              </div>
              {error && <p className="text-[12.5px] font-semibold text-destructive" role="alert">{error}</p>}
            </div>
            <DialogFooter className="flex-row gap-2 border-t border-line-warm bg-cream-2/40 px-6 py-4 sm:justify-end">
              <button onClick={() => onOpenChange(false)} className="btn-ghost !px-4 !py-2.5 text-[14px]">
                Cancel
              </button>
              <button onClick={submit} disabled={submitting} className="btn-primary !px-4 !py-2.5 text-[14px]">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Submit claim
              </button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

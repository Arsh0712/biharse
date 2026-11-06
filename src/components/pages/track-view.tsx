'use client';

import { useState, type FormEvent } from 'react';
import {
  Check,
  CheckCircle2,
  FileText,
  Gift,
  HelpCircle,
  Loader2,
  MapPin,
  Package,
  SearchX,
  Truck,
} from 'lucide-react';
import { Reveal } from '@/components/fx/reveal';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { useUi } from '@/lib/store';
import { formatINR } from '@/lib/money';
import type { OrderDto } from '@/lib/types';

const STEPS = ['Placed', 'Paid', 'Packed', 'Shipped', 'Out for delivery', 'Delivered'] as const;

const STATUS_META: Record<string, { label: string; badgeCls: string; step: number }> = {
  PENDING_PAYMENT: { label: 'Pending payment', badgeCls: 'bg-brand text-cream', step: 0 },
  FAILED: { label: 'Payment failed', badgeCls: 'bg-brand text-cream', step: 0 },
  PAYMENT_FAILED: { label: 'Payment failed', badgeCls: 'bg-brand text-cream', step: 0 },
  PAID: { label: 'Paid', badgeCls: 'bg-turmeric text-ink', step: 1 },
  PAYMENT_REVIEW: { label: 'Payment under review', badgeCls: 'bg-turmeric text-ink', step: 1 },
  PACKING: { label: 'Packing', badgeCls: 'bg-turmeric-soft text-ink', step: 2 },
  SHIPPED: { label: 'Shipped', badgeCls: 'bg-saffron text-ink', step: 3 },
  OUT_FOR_DELIVERY: { label: 'Out for delivery', badgeCls: 'bg-saffron text-ink', step: 4 },
  DELIVERED: { label: 'Delivered', badgeCls: 'bg-jaggery text-cream', step: 5 },
  CANCELLED: { label: 'Cancelled', badgeCls: 'bg-muted text-muted-foreground', step: 0 },
  REFUNDED: { label: 'Refunded', badgeCls: 'bg-muted text-muted-foreground', step: 0 },
};

const inputCls =
  'w-full rounded-xl border border-line-warm bg-card px-4 py-3 text-sm text-ink placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand';

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtPlaced(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Track an order — lookup by order number + checkout email (required), full status timeline. */
export default function TrackView({ initialOrder }: { initialOrder?: string }) {
  const navigate = useUi((s) => s.navigate);

  const [number, setNumber] = useState((initialOrder ?? '').toUpperCase());
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderDto | null>(null);

  async function onTrack(e: FormEvent) {
    e.preventDefault();
    const num = number.trim().toUpperCase();
    const cleanEmail = email.trim().toLowerCase();
    if (!num) {
      toast({
        title: 'Order number required',
        description: 'Enter the number from your confirmation email, e.g. BHS-2025-000123.',
        variant: 'destructive',
      });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail)) {
      toast({
        title: 'Email required',
        description: 'Enter the email you used at checkout — it keeps your order private.',
        variant: 'destructive',
      });
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const j = await api<{ order: OrderDto }>(
        `/api/orders/track?number=${encodeURIComponent(num)}&email=${encodeURIComponent(cleanEmail)}`,
      );
      setOrder(j.order);
    } catch (err) {
      setOrder(null);
      setError(err instanceof Error ? err.message : 'Something went wrong — please try again.');
    } finally {
      setLoading(false);
    }
  }

  const meta = order
    ? (STATUS_META[order.status] ?? {
        label: order.status,
        badgeCls: 'bg-cream-2 text-jaggery',
        step: 0,
      })
    : null;
  const completed = meta?.step ?? 0;
  const cancelled = order?.status === 'CANCELLED' || order?.status === 'REFUNDED';
  const shipped = Boolean(order?.trackingNumber);
  const stepDates: Partial<Record<(typeof STEPS)[number], string | null | undefined>> = order
    ? { Placed: order.createdAt, Shipped: order.shippedAt, Delivered: order.deliveredAt }
    : {};

  return (
    <div className="bg-cream">
      <section className="mx-auto max-w-3xl px-6 pt-28 pb-20">
        <Reveal className="text-center">
          <p className="text-eyebrow text-brand-deep">Track Order · ऑर्डर देखें</p>
          <h1 className="mt-4 font-display text-display-1 text-jaggery">Where is my prasad?</h1>
          <p className="mx-auto mt-4 max-w-lg leading-relaxed text-muted-foreground">
            Enter your order number and the email you used at checkout — we will show you every
            step, from our kadhai to your doorstep.
          </p>
        </Reveal>

        {/* ── Lookup form ───────────────────────────────── */}
        <Reveal className="mt-10">
          <form onSubmit={onTrack} noValidate className="card-warm p-6 sm:p-8">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="track-number" className="mb-1.5 block text-sm font-semibold text-jaggery">
                  Order number
                </label>
                <input
                  id="track-number"
                  type="text"
                  autoComplete="off"
                  value={number}
                  onChange={(e) => setNumber(e.target.value.toUpperCase())}
                  className={`${inputCls} font-mono tracking-wider`}
                  placeholder="BHS-2025-000123"
                />
              </div>
              <div>
                <label htmlFor="track-email" className="mb-1.5 block text-sm font-semibold text-jaggery">
                  Email <span className="text-brand" aria-hidden>*</span>
                  <span className="sr-only">(required)</span>
                </label>
                <input
                  id="track-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputCls}
                  placeholder="you@example.com"
                  aria-required="true"
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Required — use the exact email you used at checkout.
                </p>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary mt-6 w-full sm:w-auto">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Tracking…
                </>
              ) : (
                <>
                  <Package className="h-4 w-4" aria-hidden />
                  Track
                </>
              )}
            </button>
          </form>
        </Reveal>

        {/* ── Designed error state ──────────────────────── */}
        {error && !order && (
          <Reveal className="mt-8">
            <div
              className="card-warm flex flex-col items-center p-10 text-center"
              role="alert"
            >
              <span
                className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/10"
                aria-hidden
              >
                <SearchX className="h-7 w-7 text-brand" />
              </span>
              <h2 className="mt-5 font-display text-2xl text-jaggery">
                {error.toLowerCase().includes('no order found')
                  ? 'No order found'
                  : 'Could not track this order'}
              </h2>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                {error.toLowerCase().includes('no order found')
                  ? 'Check the number in your confirmation email — it starts with BHS-. If you ordered as a guest, add the exact checkout email above.'
                  : error}
              </p>
            </div>
          </Reveal>
        )}

        {/* ── Result ────────────────────────────────────── */}
        {order && meta && (
          <div className="mt-10 space-y-6">
            {/* Header */}
            <Reveal>
              <div className="card-warm flex flex-wrap items-center justify-between gap-4 p-6 sm:p-8">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    Order
                  </p>
                  <p className="mt-1 font-display text-display-2 text-jaggery">{order.number}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Placed {fmtPlaced(order.createdAt)}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold ${meta.badgeCls}`}
                >
                  {meta.step === 5 && <CheckCircle2 className="h-4 w-4" aria-hidden />}
                  {meta.label}
                </span>
              </div>
            </Reveal>

            {/* Timeline */}
            {!cancelled && (
              <Reveal>
                <div className="card-warm overflow-x-auto p-6 sm:p-8 scroll-warm">
                  <div className="min-w-[560px]">
                    <div className="relative flex justify-between">
                      <div
                        aria-hidden
                        className="absolute top-3 right-3 left-3 h-0.5 bg-line-warm"
                      />
                      <div
                        aria-hidden
                        className="absolute top-3 left-3 h-0.5 bg-brand transition-all duration-700"
                        style={{ width: `calc((100% - 1.5rem) * ${completed / (STEPS.length - 1)})` }}
                      />
                      {STEPS.map((step, i) => {
                        const done = i <= completed;
                        const date = fmtDate(stepDates[step]);
                        return (
                          <div key={step} className="relative z-10 flex flex-col items-center w-24">
                            <span
                              className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                                done ? 'border-brand bg-brand text-cream' : 'border-jaggery-3 bg-card'
                              }`}
                              aria-current={i === completed ? 'step' : undefined}
                            >
                              {done && <Check className="h-3.5 w-3.5" aria-hidden />}
                            </span>
                            <span
                              className={`mt-2 text-center text-[11px] leading-tight font-semibold ${
                                done ? 'text-jaggery' : 'text-muted-foreground'
                              }`}
                            >
                              {step}
                            </span>
                            {date && (
                              <span className="mt-0.5 text-[10px] tabular-nums text-muted-foreground">
                                {date}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Courier chip */}
                  {shipped && (
                    <div className="mt-8 flex flex-wrap items-center gap-3 rounded-2xl border border-line-warm bg-cream-2/60 p-4">
                      <Truck className="h-5 w-5 text-brand" aria-hidden />
                      <span className="text-sm text-jaggery">
                        <b>{order.courier || 'Courier'}</b>
                        <span className="mx-2 text-muted-foreground">·</span>
                        <span className="font-mono">{order.trackingNumber}</span>
                      </span>
                      <a
                        href={`https://shiprocket.co/tracking/${encodeURIComponent(order.trackingNumber)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary ml-auto px-5 py-2 text-sm"
                      >
                        Live tracking ↗
                      </a>
                    </div>
                  )}
                </div>
              </Reveal>
            )}
            {cancelled && (
              <Reveal>
                <div className="rounded-2xl border border-line-warm bg-muted p-4 text-center text-sm text-muted-foreground">
                  This order was {meta.label.toLowerCase()}. If this looks wrong, write to us and we
                  will sort it out.
                </div>
              </Reveal>
            )}

            {/* Items + totals */}
            <Reveal>
              <div className="card-warm p-6 sm:p-8">
                <h2 className="font-display text-xl text-jaggery">Items in this order</h2>
                <ul className="mt-4 divide-y divide-line-warm">
                  {order.items.map((item) => (
                    <li key={`${item.slug}-${item.variantLabel}`} className="flex items-center gap-4 py-4">
                      <img
                        src={item.image}
                        alt={item.nameEn}
                        loading="lazy"
                        className="h-16 w-16 shrink-0 rounded-xl border border-line-warm object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-jaggery">{item.nameEn}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.variantLabel ? `${item.variantLabel} · ` : ''}Qty {item.qty}
                        </p>
                      </div>
                      <span className="tabular-nums font-semibold text-jaggery">
                        {formatINR(item.lineTotal)}
                      </span>
                    </li>
                  ))}
                </ul>

                <dl className="mt-6 space-y-2.5 border-t border-line-warm pt-5 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Subtotal</dt>
                    <dd className="tabular-nums text-jaggery">{formatINR(order.subtotal)}</dd>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">
                        Discount{order.couponCode ? ` (${order.couponCode})` : ''}
                      </dt>
                      <dd className="tabular-nums text-brand">−{formatINR(order.discount)}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Shipping</dt>
                    <dd className="tabular-nums text-jaggery">
                      {order.shipping > 0 ? formatINR(order.shipping) : 'FREE'}
                    </dd>
                  </div>
                  <div className="flex justify-between border-t border-line-warm pt-3 text-base font-bold">
                    <dt className="text-jaggery">Total</dt>
                    <dd className="tabular-nums text-brand">{formatINR(order.total)}</dd>
                  </div>
                </dl>
                <p className="mt-3 text-xs text-muted-foreground">
                  Paid via {order.paymentMethod || order.paymentProvider || 'prepaid'}
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => window.open(`/api/invoice/${order.number}?email=${encodeURIComponent(order.email)}`, '_blank', 'noopener,noreferrer')}
                    className="btn-ghost text-sm"
                  >
                    <FileText className="h-4 w-4" aria-hidden />
                    GST Invoice
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('contact')}
                    className="btn-ghost text-sm"
                  >
                    <HelpCircle className="h-4 w-4" aria-hidden />
                    Need help with this order?
                  </button>
                </div>
              </div>
            </Reveal>

            {/* Address + gift note */}
            <Reveal>
              <div className="card-warm p-6 sm:p-8">
                <h2 className="flex items-center gap-2 font-display text-xl text-jaggery">
                  <MapPin className="h-5 w-5 text-brand" aria-hidden />
                  Delivery address
                </h2>
                {order.address ? (
                  <address className="mt-3 text-sm not-italic leading-relaxed text-muted-foreground">
                    <b className="text-jaggery">{order.address.name}</b>
                    <br />
                    {order.address.line1}
                    {order.address.line2 ? `, ${order.address.line2}` : ''}
                    <br />
                    {order.address.city}, {order.address.state} — {order.address.pincode}
                    <br />
                    {order.address.phone}
                  </address>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">Address not recorded.</p>
                )}
                {order.giftNote && (
                  <div className="mt-5 flex items-start gap-3 rounded-2xl bg-turmeric-soft/50 p-4">
                    <Gift className="mt-0.5 h-5 w-5 shrink-0 text-jaggery-2" aria-hidden />
                    <p className="text-sm text-jaggery">
                      <b>Gift note:</b> {order.giftNote}
                    </p>
                  </div>
                )}
              </div>
            </Reveal>
          </div>
        )}
      </section>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Check, CheckCircle2, FileText, MailCheck, MessageCircle, PackageSearch, ShoppingBag } from 'lucide-react';
import { PetalConfetti } from '@/components/fx/petal-confetti';
import { SectionOrnament } from '@/components/fx/madhubani';
import { useUi, useSettings } from '@/lib/store';
import { api } from '@/lib/api';
import { formatINR } from '@/lib/money';
import type { OrderDto } from '@/lib/types';

const STEPS = ['Placed', 'Paid', 'Packed', 'Shipped', 'Delivered'] as const;

function statusIndex(status: string) {
  switch (status) {
    case 'PAID': return 1;
    case 'PACKING': return 2;
    case 'SHIPPED':
    case 'OUT_FOR_DELIVERY': return 3;
    case 'DELIVERED': return 4;
    default: return 0; // PENDING_PAYMENT, PAYMENT_FAILED, CANCELLED, REFUNDED, unknown
  }
}

function paymentLabel(o: OrderDto) {
  const m = (o.paymentMethod || '').toLowerCase();
  const nice =
    m === 'upi' ? 'UPI' :
    m === 'card' ? 'Card' :
    m === 'netbanking' ? 'Netbanking' :
    m === 'checkout' ? 'Razorpay Checkout' :
    m ? m.charAt(0).toUpperCase() + m.slice(1) : '';
  const provider = o.paymentProvider === 'sandbox' ? 'Sandbox' : o.paymentProvider === 'razorpay' ? 'Razorpay' : o.paymentProvider;
  return [nice, provider].filter(Boolean).join(' · ') || 'Prepaid';
}

export default function SuccessView({ orderNumber }: { orderNumber?: string }) {
  const navigate = useUi((s) => s.navigate);
  const settings = useSettings((s) => s.data);

  const [order, setOrder] = useState<OrderDto | null>(null);
  const [failedFor, setFailedFor] = useState<string | null>(null);

  useEffect(() => {
    if (!orderNumber) return;
    let alive = true;
    api<{ order: OrderDto }>('/api/orders/track?number=' + encodeURIComponent(orderNumber))
      .then((j) => { if (alive) setOrder(j.order); })
      .catch(() => { if (alive) setFailedFor(orderNumber); });
    return () => { alive = false; };
  }, [orderNumber]);

  /* GA4 purchase event — fired exactly once per order (module ref + sessionStorage guard).
     GA4 itself is loaded ONLY after analytics opt-in by ConsentGate
     (src/components/layout/consent-gate.tsx); we double-check that consent here
     before pushing to dataLayer. */
  const purchaseFiredRef = useRef(false);
  useEffect(() => {
    if (!order || failedFor === order.number || purchaseFiredRef.current) return;
    try {
      if (typeof window === 'undefined') return;
      if (localStorage.getItem('biharse-consent') !== 'granted') return; // analytics consent gate
      if (!window.dataLayer && !window.gtag) return;
      const flag = 'biharse-purchase-' + order.number;
      if (sessionStorage.getItem(flag)) return;
      purchaseFiredRef.current = true;
      sessionStorage.setItem(flag, '1');
      const dl = (window as unknown as { dataLayer?: unknown[] }).dataLayer ?? [];
      (window as unknown as { dataLayer: unknown[] }).dataLayer = dl;
      dl.push({
        event: 'purchase',
        ecommerce: {
          transaction_id: order.number,
          value: order.total / 100,
          currency: 'INR',
          items: order.items.map((i) => ({
            item_id: i.slug,
            item_name: i.nameEn,
            variant: i.variantLabel || undefined,
            price: i.unitPrice / 100,
            quantity: i.qty,
          })),
        },
      });
    } catch { /* analytics must never break checkout */ }
  }, [order, failedFor]);

  const loading = Boolean(orderNumber) && order?.number !== orderNumber && failedFor !== orderNumber;
  const failed = failedFor === orderNumber;

  /* delivery estimate from shipping config (mirrors /api/delivery/check formatting) */
  const etaLabel = useMemo(() => {
    const min = settings?.shipping.defaultMinDays ?? 5;
    const max = settings?.shipping.defaultMaxDays ?? 8;
    const fmt = (d: Date) => d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    const a = new Date(); a.setDate(a.getDate() + min);
    const b = new Date(); b.setDate(b.getDate() + max);
    return fmt(a) + ' – ' + fmt(b);
  }, [settings]);

  /* ── no order number: graceful fallback ── */
  if (!orderNumber) {
    return (
      <div className="mx-auto max-w-7xl px-4 pb-28 pt-28 sm:px-6 md:pt-32">
        <div className="card-warm mx-auto max-w-xl px-8 py-14 text-center">
          <img src="/brand/mandala.png" alt="" aria-hidden className="animate-spin-slow mx-auto h-16 w-16 rounded-full opacity-80" />
          <div className="mx-auto mt-6 grid h-12 w-12 place-items-center rounded-full bg-jaggery-2/10 text-jaggery-2">
            <MailCheck className="h-6 w-6" />
          </div>
          <h1 className="font-display mt-5 text-2xl font-semibold text-ink">Order confirmation on its way to your inbox</h1>
          <p className="mx-auto mt-2 max-w-sm text-[14px] text-muted-foreground">
            Check your email for the receipt and order number — you can track the batch any time.
          </p>
          <button onClick={() => navigate('home')} className="btn-primary mt-7">Back to home</button>
        </div>
      </div>
    );
  }

  const step = statusIndex(order?.status ?? 'PENDING_PAYMENT');

  return (
    <div className="mx-auto max-w-7xl px-4 pb-28 pt-28 sm:px-6 md:pt-32">
      <PetalConfetti fire />
      <div className="card-warm relative mx-auto max-w-xl overflow-hidden px-6 py-10 sm:px-10">
        <img src="/brand/mandala.png" alt="" aria-hidden className="animate-spin-slow pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-10" />

        {/* mandala + animated check */}
        <div className="relative mx-auto h-20 w-20">
          <Image src="/brand/mandala.png" alt="" width={80} height={80} className="h-20 w-20 rounded-full object-cover" priority />
          <motion.span
            className="absolute -bottom-1 -right-1 grid h-9 w-9 place-items-center rounded-full bg-brand text-cream shadow-[0_8px_18px_-6px_rgba(216,0,24,0.65)]"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 320, damping: 15, delay: 0.25 }}
          >
            <Check className="h-5 w-5" strokeWidth={3} />
          </motion.span>
        </div>

        <h1 className="font-display mt-6 text-center text-3xl font-semibold text-ink sm:text-4xl">Shukriya! Order placed</h1>
        <p className="font-dev-body mt-2 text-center text-lg text-jaggery-2">धन्यवाद — आपका ऑर्डर हो गया!</p>

        <div className="mt-6"><SectionOrnament /></div>

        {/* order details */}
        {loading ? (
          <div className="mt-6 space-y-3" aria-busy="true" aria-label="Loading order details">
            <div className="skeleton mx-auto h-9 w-56 rounded-full" />
            <div className="skeleton mx-auto h-5 w-72 rounded-full" />
            <div className="skeleton mx-auto h-5 w-40 rounded-full" />
          </div>
        ) : (
          <div className="mt-6 text-center">
            <p className="text-[11.5px] font-bold uppercase tracking-widest text-jaggery-3">Order number</p>
            <p className="font-display mt-1 text-2xl font-bold tracking-wide text-brand-deep">{orderNumber}</p>

            {order && !failed && (
              <div className="mx-auto mt-5 grid max-w-sm grid-cols-2 gap-x-6 gap-y-3 text-left text-[13.5px]">
                <p className="text-muted-foreground">Amount paid</p>
                <p className="text-right font-bold text-ink">{formatINR(order.total)}</p>
                <p className="text-muted-foreground">Items</p>
                <p className="text-right font-bold text-ink">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</p>
                <p className="text-muted-foreground">Payment</p>
                <p className="text-right font-bold text-ink">{paymentLabel(order)}</p>
                <p className="text-muted-foreground">Status</p>
                <p className="text-right font-bold text-ink">{order.status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}</p>
              </div>
            )}

            <p className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-jaggery-2/10 px-4 py-2 text-[13px] font-semibold text-jaggery-2">
              <PackageSearch className="h-4 w-4" /> Arrives {etaLabel}
            </p>

            {failed && (
              <p className="mx-auto mt-4 max-w-sm text-[12.5px] text-muted-foreground">
                We couldn&apos;t fetch live status for this order right now — the confirmation email has all the details.
              </p>
            )}
          </div>
        )}

        {/* timeline */}
        <div className="mt-8 rounded-2xl border border-line-warm bg-cream-2/40 px-4 py-5">
          <ol className="flex" aria-label={'Order progress: ' + (order?.status ?? 'placed')}>
            {STEPS.map((label, i) => {
              const done = i < step;
              const active = i === step;
              return (
                <li key={label} className="relative flex flex-1 flex-col items-center">
                  {i > 0 && (
                    <span
                      aria-hidden
                      className={'absolute right-1/2 top-3.5 h-0.5 w-full ' + (i <= step ? 'bg-brand/70' : 'bg-line-warm')}
                    />
                  )}
                  <span
                    aria-current={active ? 'step' : undefined}
                    className={
                      'relative z-10 grid h-7 w-7 place-items-center rounded-full border-2 transition-colors ' +
                      (done ? 'border-brand bg-brand text-cream' :
                        active ? 'border-turmeric bg-turmeric text-ink shadow-[0_0_0_4px_rgba(240,168,28,0.25)]' :
                          'border-line-warm bg-card text-muted-foreground')
                    }
                  >
                    {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <span className={'h-1.5 w-1.5 rounded-full ' + (active ? 'bg-ink' : 'bg-muted-foreground')} />}
                  </span>
                  <span className={'mt-1.5 text-[10.5px] font-bold uppercase tracking-wide ' + (done || active ? 'text-jaggery' : 'text-muted-foreground')}>
                    {label}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        {/* actions */}
        <div className="mt-7 flex flex-col items-center gap-3">
          <button onClick={() => navigate('track', { orderNumber })} className="btn-primary w-full sm:w-auto">
            <PackageSearch className="h-4.5 w-4.5" /> Track this order
          </button>
          {order && !failed && (
            <button
              onClick={() => window.open('/api/invoice/' + order.number + '?email=' + encodeURIComponent(order.email), '_blank', 'noopener')}
              className="btn-ghost w-full sm:w-auto"
              aria-label={'Open invoice for order ' + order.number}
            >
              <FileText className="h-4.5 w-4.5 text-jaggery-2" /> Download invoice
            </button>
          )}
          <a
            href={'https://wa.me/?text=' + encodeURIComponent('Fresh thekua from BiharSe is on its way! Order ' + orderNumber)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost w-full sm:w-auto"
          >
            <MessageCircle className="h-4.5 w-4.5 text-jaggery-2" /> Share on WhatsApp
          </a>
          <button onClick={() => navigate('shop')} className="text-[13.5px] font-semibold text-brand underline underline-offset-4 transition hover:text-brand-deep">
            Continue shopping
          </button>
        </div>
      </div>

      {/* decorative reassurance row */}
      <div className="mx-auto mt-8 flex max-w-xl items-center justify-center gap-2 text-[12px] font-semibold text-muted-foreground" aria-hidden>
        <CheckCircle2 className="h-3.5 w-3.5 text-jaggery-2" /> Confirmation email sent
        <span className="h-3 w-px bg-line-warm" />
        Baked in small batches
        <span className="h-3 w-px bg-line-warm" />
        <ShoppingBag className="h-3.5 w-3.5 text-jaggery-2" /> Packed with care
      </div>
    </div>
  );
}

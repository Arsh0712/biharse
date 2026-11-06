'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle, BadgeCheck, Building2, Check, CreditCard, Gift, Landmark, Loader2, Lock,
  Mail, ReceiptText, ShoppingBag, Smartphone, TicketPercent, Truck, X,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  useUi, useCart, useAuth, useCheckout, useSettings, useProductCache, cartTotals,
} from '@/lib/store';
import { api, pick } from '@/lib/api';
import { formatINR } from '@/lib/money';
import { toast } from '@/hooks/use-toast';
import { SectionOrnament } from '@/components/fx/madhubani';
import type { AddressDto, Product } from '@/lib/types';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, cb: (r: Record<string, string>) => void) => void;
    };
  }
}

/* ── helpers ─────────────────────────────────────────── */

interface PayInit {
  orderNumber: string;
  amount: number;
  paymentOrderId: string;
  mode: 'razorpay' | 'sandbox';
  keyId: string;
  prefill: { name: string; email: string; contact: string };
  duplicate?: boolean;
  status?: string;
}

interface AddrDraft {
  name: string; phone: string; pincode: string;
  line1: string; line2: string; city: string; state: string;
}

interface BillDraft {
  name: string; line1: string; line2: string; city: string; state: string; pincode: string; gstin: string;
}

const EMPTY_ADDR: AddrDraft = { name: '', phone: '', pincode: '', line1: '', line2: '', city: '', state: '' };
const EMPTY_BILL: BillDraft = { name: '', line1: '', line2: '', city: '', state: '', pincode: '', gstin: '' };

/* server 409 payloads */
interface FreshLine {
  slug: string; nameEn: string; variantLabel: string; weightG: number;
  unitPrice: number; mrp: number; qty: number; lineTotal: number; image: string;
}
interface TotalChanged409 {
  totals: { subtotal: number; discount: number; shipping: number; total: number };
  items: FreshLine[];
}
interface Stock409 {
  reason: 'STOCK';
  items: { slug: string; available: number; requested: number; nameEn: string }[];
}

const isEmailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
const isPhoneOk = (v: string) => /^[+\d][\d\s-]{8,15}$/.test(v);
const isPinOk = (v: string) => /^\d{6}$/.test(v);

const INPUT_CLS =
  'w-full rounded-xl border border-line-warm bg-cream-2/40 px-3.5 py-2.5 text-[14.5px] text-ink outline-none transition-colors placeholder:text-muted-foreground focus:border-brand focus:bg-card aria-[invalid=true]:border-destructive';

const FOCUS_IDS: Record<string, string> = {
  email: 'co-email', phone: 'co-phone', name: 'co-name', addrPhone: 'co-addr-phone',
  pincode: 'co-pincode', line1: 'co-line1', city: 'co-city', state: 'co-state',
  legalName: 'co-gst-name', gstin: 'co-gstin', invoiceEmail: 'co-gst-email',
  billName: 'co-bill-name', billLine1: 'co-bill-line1', billCity: 'co-bill-city',
  billState: 'co-bill-state', billPincode: 'co-bill-pincode', billGstin: 'co-bill-gstin',
  consent: 'co-consent',
};

const CONSENT_VERSION = 'terms-v1';

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if (window.Razorpay) return resolve(true);
    const SRC = 'https://checkout.razorpay.com/v1/checkout.js';
    const existing = document.querySelector('script[src="' + SRC + '"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(Boolean(window.Razorpay)));
      existing.addEventListener('error', () => resolve(false));
      return;
    }
    const s = document.createElement('script');
    s.src = SRC;
    s.async = true;
    s.onload = () => resolve(Boolean(window.Razorpay));
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

/* ── view ────────────────────────────────────────────── */

export default function CheckoutView() {
  const navigate = useUi((s) => s.navigate);
  const setOverlay = useUi((s) => s.setOverlay);
  const lang = useUi((s) => s.lang);

  const lines = useCart((s) => s.lines);
  const couponCode = useCart((s) => s.couponCode);
  const giftNote = useCart((s) => s.giftNote);
  const setGiftNote = useCart((s) => s.setGiftNote);
  const setCoupon = useCart((s) => s.setCoupon);
  const clear = useCart((s) => s.clear);

  const user = useAuth((s) => s.user);
  const draft = useCheckout((s) => s.address);
  const gstName = useCheckout((s) => s.gstName);
  const gstin = useCheckout((s) => s.gstin);
  const invoiceEmail = useCheckout((s) => s.invoiceEmail);
  const setGst = useCheckout((s) => s.setGst);

  const settings = useSettings((s) => s.data);
  const cache = useProductCache((s) => s.map);
  const putMany = useProductCache((s) => s.putMany);

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [addr, setAddr] = useState<AddrDraft>(EMPTY_ADDR);
  const [saveAddr, setSaveAddr] = useState(true);
  const [gstOn, setGstOn] = useState(false);
  const [eta, setEta] = useState<string>('');
  const [checkingPin, setCheckingPin] = useState(false);

  const [couponDraft, setCouponDraft] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState(0);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [placing, setPlacing] = useState(false);
  const [sheet, setSheet] = useState<PayInit | null>(null);

  /* terms consent (blocks place-order until checked) */
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState(false);

  /* billing address — defaults to "same as shipping" */
  const [billingSame, setBillingSame] = useState(true);
  const [billing, setBilling] = useState<BillDraft>(EMPTY_BILL);

  /* server reconfirm guards */
  const [priceChange, setPriceChange] = useState<TotalChanged409 | null>(null);
  const [shortages, setShortages] = useState<Record<string, number>>({});

  const appliedRef = useRef('');
  const lastPinChecked = useRef('');

  /* Double-submit client token — one uuid per checkout session.
     Regenerated whenever the cart composition changes (coupon/gift note/lines);
     clearing the cart after a successful order also regenerates it. */
  const cartSig = useMemo(
    () => JSON.stringify([lines.map((l) => [l.slug, l.variantLabel, l.qty]), couponCode, giftNote]),
    [lines, couponCode, giftNote],
  );
  const clientToken = useMemo(() => {
    void cartSig; // regenerate on cart change
    try {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    } catch { /* older runtimes */ }
    return Math.random().toString(36).slice(2) + '-' + Date.now().toString(36);
  }, [cartSig]);

  /* prefill contact from the signed-in user */
  useEffect(() => {
    if (!user) return;
    setEmail((v) => v || user.email);
    setPhone((v) => v || user.phone);
    setAddr((p) => (p.name || p.phone ? p : { ...p, name: p.name || user.name, phone: p.phone || user.phone }));
    setGstOn((v) => v || Boolean(gstin));
  }, [user]);

  /* prefill address from the checkout draft store (guarded, no clobber loop) */
  useEffect(() => {
    if (!draft) return;
    setAddr((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const k of Object.keys(EMPTY_ADDR) as (keyof AddrDraft)[]) {
        if (!next[k] && draft[k]) { next[k] = draft[k] ?? ''; changed = true; }
      }
      return changed ? next : prev;
    });
  }, [draft]);

  /* fetch product info for cart thumbnails once and cache */
  const lineSlugsKey = useMemo(() => [...new Set(lines.map((l) => l.slug))].join(','), [lines]);
  const missingSlugs = useMemo(
    () => lineSlugsKey.split(',').filter(Boolean).filter((s) => !cache[s]).join(','),
    [lineSlugsKey, cache],
  );
  useEffect(() => {
    if (!missingSlugs) return;
    api<{ products: Product[] }>('/api/products?slugs=' + encodeURIComponent(missingSlugs))
      .then((j) => putMany(j.products))
      .catch(() => {});
  }, [missingSlugs, putMany]);

  const freeAbove = settings?.shipping.freeAbovePaise ?? 99900;
  const flatShipping = settings?.shipping.flatPaise ?? 9900;
  const subtotal = useMemo(() => lines.reduce((a, l) => a + l.unitPrice * l.qty, 0), [lines]);
  const shippingEstimate = subtotal - couponDiscount >= freeAbove ? 0 : flatShipping;
  const totals = cartTotals(lines, couponDiscount, shippingEstimate);
  const progress = Math.min(100, Math.round((subtotal / freeAbove) * 100));

  /* coupon dry-run — same server pattern as the cart drawer */
  const validateCoupon = async (code: string, silent = false) => {
    if (!code.trim()) return;
    setApplyingCoupon(true);
    try {
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
      setCoupon(code.trim().toUpperCase());
      setCouponDiscount(j.discount || 0);
      if (!silent) toast({ title: 'Coupon applied 🎉', description: code + ' — ' + formatINR(j.discount || 0) + ' off' });
    } catch (e) {
      setCoupon('');
      setCouponDiscount(0);
      if (!silent) toast({ title: 'Coupon not applied', description: e instanceof Error ? e.message : 'Invalid coupon', variant: 'destructive' });
    }
    setApplyingCoupon(false);
  };

  /* re-validate a coupon already present (e.g. applied in the cart drawer) */
  useEffect(() => {
    if (couponCode && appliedRef.current !== couponCode) {
      appliedRef.current = couponCode;
      validateCoupon(couponCode, true);
    }
    if (!couponCode) { appliedRef.current = ''; setCouponDiscount(0); }
  }, [couponCode]);

  /* pincode → delivery estimate + city/state autofill (deduped per pin) */
  const checkDelivery = async (pin: string) => {
    if (!isPinOk(pin) || lastPinChecked.current === pin) return;
    lastPinChecked.current = pin;
    setCheckingPin(true);
    try {
      const j = await api<{ serviceable: boolean; city: string; state: string; etaLabel: string }>('/api/delivery/check', {
        method: 'POST',
        body: JSON.stringify({ pincode: pin }),
      });
      setEta(j.etaLabel || '');
      setAddr((prev) => ({ ...prev, city: j.city || prev.city, state: j.state || prev.state }));
      queueMicrotask(() => {
        useCheckout.getState().setAddress({
          name: addr.name, phone: addr.phone, pincode: addr.pincode,
          line1: addr.line1, line2: addr.line2,
          city: j.city || addr.city, state: j.state || addr.state,
        });
      });
    } catch { /* estimate is best-effort */ }
    setCheckingPin(false);
  };

  /* which validation errors to clear when an address field is edited */
  const CLEAR_ERRS: Record<keyof AddrDraft, string[]> = {
    name: ['name'], phone: ['addrPhone'], pincode: ['pincode'],
    line1: ['line1'], line2: [], city: ['city'], state: ['state'],
  };

  const BILL_CLEAR: Partial<Record<keyof BillDraft, string[]>> = {
    name: ['billName'], line1: ['billLine1'], line2: [], city: ['billCity'],
    state: ['billState'], pincode: ['billPincode'], gstin: ['billGstin'],
  };

  const setBillField = (k: keyof BillDraft, v: string) => {
    setBilling((prev) => ({ ...prev, [k]: v }));
    setErrors((e) => {
      const n = { ...e };
      for (const key of BILL_CLEAR[k] ?? []) delete n[key];
      return n;
    });
  };

  const setField = (k: keyof AddrDraft, v: string) => {
    setAddr((prev) => {
      const next = { ...prev, [k]: v };
      return next;
    });
    // mirror to the checkout draft store outside of the state updater
    queueMicrotask(() => {
      const cur = useCheckout.getState().address;
      useCheckout.getState().setAddress({
        name: addr.name, phone: addr.phone, pincode: addr.pincode,
        line1: addr.line1, line2: addr.line2, city: addr.city, state: addr.state,
        [k]: v, ...(cur ? { isDefault: cur.isDefault } : {}),
      } as AddressDto);
    });
    setErrors((e) => {
      const n = { ...e };
      for (const key of CLEAR_ERRS[k]) delete n[key];
      return n;
    });
  };

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!isEmailOk(email)) errs.email = 'Enter a valid email';
    if (!isPhoneOk(phone)) errs.phone = 'Enter a valid phone';
    if (!addr.name.trim()) errs.name = 'Full name is required';
    if (!isPhoneOk(addr.phone)) errs.addrPhone = 'Enter a valid phone';
    if (!isPinOk(addr.pincode)) errs.pincode = '6-digit pincode required';
    if (!addr.line1.trim()) errs.line1 = 'Address line 1 is required';
    if (!addr.city.trim()) errs.city = 'City is required';
    if (!addr.state.trim()) errs.state = 'State is required';
    if (gstOn) {
      if (!gstName.trim()) errs.legalName = 'Legal name is required';
      if (!/^[0-9A-Za-z]{15}$/.test(gstin)) errs.gstin = 'GSTIN is 15 characters';
      if (invoiceEmail && !isEmailOk(invoiceEmail)) errs.invoiceEmail = 'Enter a valid email';
    }
    if (!billingSame) {
      if (!billing.name.trim()) errs.billName = 'Billing name is required';
      if (!billing.line1.trim()) errs.billLine1 = 'Billing address line 1 is required';
      if (!billing.city.trim()) errs.billCity = 'City is required';
      if (!billing.state.trim()) errs.billState = 'State is required';
      if (!isPinOk(billing.pincode)) errs.billPincode = '6-digit pincode required';
      if (billing.gstin && !/^[0-9A-Za-z]{15}$/.test(billing.gstin)) errs.billGstin = 'GSTIN is 15 characters';
    }
    return errs;
  };

  const startRazorpay = async (j: PayInit) => {
    const loaded = await loadRazorpayScript();
    if (!loaded || !window.Razorpay) {
      setPlacing(false);
      toast({ title: 'Payment gateway could not load', description: 'Check your connection and retry.', variant: 'destructive' });
      return;
    }
    const options: Record<string, unknown> = {
      key: j.keyId,
      amount: j.amount,
      currency: 'INR',
      name: 'BiharSe',
      description: 'Fresh Thekua from Bihar',
      order_id: j.paymentOrderId,
      prefill: j.prefill,
      notes: { orderNumber: j.orderNumber },
      theme: { color: '#D80018' },
      handler: async (response: Record<string, string>) => {
        try {
          await api('/api/payment/verify', {
            method: 'POST',
            body: JSON.stringify({
              orderNumber: j.orderNumber,
              paymentOrderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              method: 'checkout',
            }),
          });
          clear();
          navigate('success', { orderNumber: j.orderNumber });
        } catch {
          toast({ title: 'Payment could not be verified — support notified', variant: 'destructive' });
          setPlacing(false);
        }
      },
      modal: { ondismiss: () => setPlacing(false) },
    };
    const rz = new window.Razorpay(options);
    rz.on('payment.failed', () => {
      toast({ title: 'Payment failed', description: 'Your bank declined — you can retry anytime.', variant: 'destructive' });
    });
    rz.open();
    setPlacing(false);
  };

  /* place-order request — raw fetch so the structured 409 reconfirms are readable */
  const placeOrder = async (expectedTotal: number) => {
    setPlacing(true);
    try {
      const r = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lines: lines.map((l) => ({ slug: l.slug, variantLabel: l.variantLabel, qty: l.qty })),
          couponCode,
          giftNote,
          email,
          phone,
          address: {
            name: addr.name.trim(), phone: addr.phone.trim(), line1: addr.line1.trim(),
            line2: addr.line2.trim(), city: addr.city.trim(), state: addr.state.trim(), pincode: addr.pincode,
          },
          gst: gstOn ? { legalName: gstName, gstin, invoiceEmail } : undefined,
          billing: billingSame ? undefined : {
            name: billing.name.trim(), line1: billing.line1.trim(), line2: billing.line2.trim(),
            city: billing.city.trim(), state: billing.state.trim(), pincode: billing.pincode,
            gstin: billing.gstin.trim().toUpperCase() || undefined,
          },
          consent: true,
          consentVersion: CONSENT_VERSION,
          clientToken,
          expectedTotal,
        }),
      });
      const j = await r.json().catch(() => ({})) as PayInit & {
        duplicate?: boolean; status?: string; error?: string; reason?: string;
        totals?: TotalChanged409['totals']; items?: FreshLine[] | Stock409['items'];
      };

      /* price drift — server recomputed a different total than our sticky summary */
      if (r.status === 409 && j.reason === 'TOTAL_CHANGED') {
        setPriceChange({
          totals: j.totals ?? { subtotal: 0, discount: 0, shipping: 0, total: 0 },
          items: ((j.items as FreshLine[]) ?? []),
        });
        setPlacing(false);
        return;
      }

      /* stock ran short between cart add and checkout */
      if (r.status === 409 && j.reason === 'STOCK') {
        const map: Record<string, number> = {};
        const names: string[] = [];
        for (const it of ((j.items as Stock409['items']) ?? [])) {
          map[it.slug] = it.available;
          names.push(`${it.nameEn} — only ${it.available} left`);
        }
        setShortages(map);
        toast({ title: 'Stock just ran low', description: names.join(' · '), variant: 'destructive' });
        setPlacing(false);
        return;
      }

      if (!r.ok) throw new Error(j.error || `Request failed (${r.status})`);

      /* same clientToken already created an order — resume it instead of duplicating */
      if (j.duplicate && j.status === 'PAID') {
        clear();
        navigate('success', { orderNumber: j.orderNumber });
        return;
      }

      if (saveAddr && user) {
        api('/api/account/addresses', {
          method: 'POST',
          body: JSON.stringify({
            label: 'Home', name: addr.name.trim(), phone: addr.phone.trim(), line1: addr.line1.trim(),
            line2: addr.line2.trim(), city: addr.city.trim(), state: addr.state.trim(), pincode: addr.pincode,
          }),
        }).catch(() => {});
      }
      if (j.mode === 'sandbox') {
        setPlacing(false);
        setSheet(j);
      } else {
        await startRazorpay(j);
      }
    } catch (e) {
      setPlacing(false);
      toast({ title: 'Could not place order', description: e instanceof Error ? e.message : 'Please try again', variant: 'destructive' });
    }
  };

  const onPay = async () => {
    if (placing || sheet || priceChange) return;
    const errs = validate();
    if (!consent) errs.consent = 'Please accept the Terms, Refund & Shipping policies to continue';
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      setConsentError(!consent);
      const first = Object.keys(errs)[0];
      const el = document.getElementById(FOCUS_IDS[first] ?? '');
      el?.focus();
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      toast({ title: 'Almost there', description: 'Please fix the highlighted fields', variant: 'destructive' });
      return;
    }
    setErrors({});
    setConsentError(false);
    await placeOrder(totals.total); // sticky summary total rides along for the server drift check
  };

  const continuePaying = async () => {
    if (!priceChange) return;
    const fresh = priceChange.totals.total;
    setPriceChange(null);
    await placeOrder(fresh); // resubmit with the fresh server-side total
  };

  const reviewCart = () => {
    setPriceChange(null);
    setOverlay('cart');
  };

  /* ── empty cart ── */
  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 pb-28 pt-28 sm:px-6 md:pt-32">
        <div className="card-warm relative mx-auto max-w-lg overflow-hidden px-8 py-16 text-center">
          <img src="/brand/mandala.png" alt="" className="animate-spin-slow pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-15" />
          <img src="/brand/mandala.png" alt="BiharSe mandala" className="animate-spin-slow mx-auto h-20 w-20 rounded-full" />
          <h1 className="font-display mt-6 text-3xl font-semibold text-ink">Your cart is waiting</h1>
          <p className="mx-auto mt-2 max-w-sm text-[14.5px] text-muted-foreground">
            Fresh thekua straight from our Bihari kitchen — pick a batch and it will be on its way.
          </p>
          <button onClick={() => navigate('shop')} className="btn-primary mt-7">
            <ShoppingBag className="h-4.5 w-4.5" /> Browse shop
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-28 pt-28 sm:px-6 md:pt-32">
      {/* header */}
      <div className="text-center">
        <p className="text-eyebrow text-jaggery-3">Checkout</p>
        <h1 className="font-display mt-2 text-display-2 font-semibold text-ink">Almost yours — 3 quick steps</h1>
        <div className="mt-4"><SectionOrnament /></div>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-12">
        {/* ── left: steps ── */}
        <div className="space-y-6 lg:col-span-7">
          {/* 1 · contact */}
          <motion.section
            aria-labelledby="step-contact"
            initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="card-warm p-5 sm:p-7"
          >
            <div className="flex items-center gap-3">
              <StepCircle n={1} />
              <h2 id="step-contact" className="font-display text-xl font-semibold text-ink">Contact</h2>
            </div>

            {!user && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand/20 bg-brand/5 px-4 py-3">
                <p className="text-[13px] font-medium text-jaggery">
                  Have an account? <b>Sign in</b> for faster checkout
                </p>
                <button onClick={() => setOverlay('auth')} className="btn-gold !px-4 !py-2 text-[13px]">
                  Sign in
                </button>
              </div>
            )}

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field id="co-email" label="Email" error={errors.email} hint="Order updates land here">
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="co-email" type="email" autoComplete="email" inputMode="email" aria-invalid={Boolean(errors.email)}
                    value={email} onChange={(e) => { setEmail(e.target.value.trim()); setErrors((er) => ({ ...er, email: '' })); }}
                    placeholder="you@example.com" className={INPUT_CLS + ' pl-9'}
                  />
                </div>
              </Field>
              <Field id="co-phone" label="Phone" error={errors.phone}>
                <input
                  id="co-phone" type="tel" autoComplete="tel" inputMode="tel" aria-invalid={Boolean(errors.phone)}
                  value={phone} onChange={(e) => { setPhone(e.target.value); setErrors((er) => ({ ...er, phone: '' })); }}
                  placeholder="+91 98765 43210" className={INPUT_CLS}
                />
              </Field>
            </div>
          </motion.section>

          {/* 2 · delivery address */}
          <motion.section
            aria-labelledby="step-address"
            initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="card-warm p-5 sm:p-7"
          >
            <div className="flex items-center gap-3">
              <StepCircle n={2} />
              <h2 id="step-address" className="font-display text-xl font-semibold text-ink">Delivery address</h2>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field id="co-name" label="Full name *" error={errors.name}>
                <input
                  id="co-name" autoComplete="name" aria-invalid={Boolean(errors.name)}
                  value={addr.name} onChange={(e) => setField('name', e.target.value)}
                  className={INPUT_CLS} placeholder="Mithilesh Kumar"
                />
              </Field>
              <Field id="co-addr-phone" label="Phone *" error={errors.addrPhone}>
                <input
                  id="co-addr-phone" type="tel" autoComplete="tel" inputMode="tel" aria-invalid={Boolean(errors.addrPhone)}
                  value={addr.phone} onChange={(e) => setField('phone', e.target.value)}
                  className={INPUT_CLS} placeholder="+91 98765 43210"
                />
              </Field>
              <Field
                id="co-pincode" label="Pincode *" error={errors.pincode}
                hint={checkingPin ? 'Checking delivery…' : eta ? '' : 'We estimate delivery instantly'}
              >
                <div className="relative">
                  <input
                    id="co-pincode" inputMode="numeric" autoComplete="postal-code" maxLength={6} aria-invalid={Boolean(errors.pincode)}
                    value={addr.pincode}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setField('pincode', v);
                      if (v.length === 6) checkDelivery(v);
                    }}
                    onBlur={() => checkDelivery(addr.pincode)}
                    className={INPUT_CLS} placeholder="800001"
                  />
                  {checkingPin && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
                </div>
                {eta && !errors.pincode && (
                  <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-jaggery-2/10 px-3 py-1.5 text-[12.5px] font-semibold text-jaggery-2">
                    <Truck className="h-3.5 w-3.5" /> Arrives {eta}
                  </p>
                )}
              </Field>
              <div />
              <Field id="co-line1" label="Address line 1 *" error={errors.line1} hint="House / flat, street, area">
                <input
                  id="co-line1" autoComplete="address-line1" aria-invalid={Boolean(errors.line1)}
                  value={addr.line1} onChange={(e) => setField('line1', e.target.value)}
                  className={INPUT_CLS} placeholder="House 158, Block H, Mangol Puri"
                />
              </Field>
              <Field id="co-line2" label="Address line 2" hint="Landmark, apartment (optional)">
                <input
                  id="co-line2" autoComplete="address-line2"
                  value={addr.line2} onChange={(e) => setField('line2', e.target.value)}
                  className={INPUT_CLS} placeholder="Near Shiv Mandir"
                />
              </Field>
              <Field id="co-city" label="City *" error={errors.city}>
                <input
                  id="co-city" autoComplete="address-level2" aria-invalid={Boolean(errors.city)}
                  value={addr.city} onChange={(e) => setField('city', e.target.value)}
                  className={INPUT_CLS} placeholder="Patna"
                />
              </Field>
              <Field id="co-state" label="State *" error={errors.state}>
                <input
                  id="co-state" autoComplete="address-level1" aria-invalid={Boolean(errors.state)}
                  value={addr.state} onChange={(e) => setField('state', e.target.value)}
                  className={INPUT_CLS} placeholder="Bihar"
                />
              </Field>
            </div>

            {user && (
              <label htmlFor="save-addr" className="mt-5 flex cursor-pointer items-center gap-2.5 text-[13.5px] font-medium text-jaggery">
                <Checkbox id="save-addr" checked={saveAddr} onCheckedChange={(v) => setSaveAddr(v === true)} />
                Save this address to my account for next time
              </label>
            )}

            {/* Billing address — defaults to "same as shipping" */}
            <div className="mt-6 rounded-2xl border border-line-warm bg-cream-2/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <ReceiptText className="h-4.5 w-4.5 text-jaggery-2" />
                  <div>
                    <p className="text-[14px] font-semibold text-ink">Billing address</p>
                    <p className="text-[12px] text-muted-foreground">Where the tax invoice is addressed</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[12.5px] font-semibold text-jaggery">Same as shipping</span>
                  <Switch
                    checked={billingSame}
                    onCheckedChange={setBillingSame}
                    aria-label="Billing address same as shipping"
                  />
                </div>
              </div>
              {!billingSame && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field id="co-bill-name" label="Billing name *" error={errors.billName}>
                    <input
                      id="co-bill-name" autoComplete="billing name" aria-invalid={Boolean(errors.billName)}
                      value={billing.name} onChange={(e) => setBillField('name', e.target.value)}
                      className={INPUT_CLS} placeholder="BiharSe Foods Pvt Ltd"
                    />
                  </Field>
                  <Field id="co-bill-gstin" label="GSTIN (optional)" error={errors.billGstin} hint="15 characters for business invoices">
                    <input
                      id="co-bill-gstin" maxLength={15} aria-invalid={Boolean(errors.billGstin)}
                      value={billing.gstin}
                      onChange={(e) => setBillField('gstin', e.target.value.toUpperCase())}
                      className={INPUT_CLS + ' font-mono tracking-wider'} placeholder="10ABCDE1234F1Z5"
                    />
                  </Field>
                  <Field id="co-bill-line1" label="Address line 1 *" error={errors.billLine1}>
                    <input
                      id="co-bill-line1" autoComplete="billing address-line1" aria-invalid={Boolean(errors.billLine1)}
                      value={billing.line1} onChange={(e) => setBillField('line1', e.target.value)}
                      className={INPUT_CLS} placeholder="Office 402, Tech Park"
                    />
                  </Field>
                  <Field id="co-bill-line2" label="Address line 2" hint="Floor, building (optional)">
                    <input
                      id="co-bill-line2" autoComplete="billing address-line2"
                      value={billing.line2} onChange={(e) => setBillField('line2', e.target.value)}
                      className={INPUT_CLS} placeholder="Sector 62"
                    />
                  </Field>
                  <Field id="co-bill-city" label="City *" error={errors.billCity}>
                    <input
                      id="co-bill-city" autoComplete="billing address-level2" aria-invalid={Boolean(errors.billCity)}
                      value={billing.city} onChange={(e) => setBillField('city', e.target.value)}
                      className={INPUT_CLS} placeholder="Noida"
                    />
                  </Field>
                  <Field id="co-bill-state" label="State *" error={errors.billState}>
                    <input
                      id="co-bill-state" autoComplete="billing address-level1" aria-invalid={Boolean(errors.billState)}
                      value={billing.state} onChange={(e) => setBillField('state', e.target.value)}
                      className={INPUT_CLS} placeholder="Uttar Pradesh"
                    />
                  </Field>
                  <Field id="co-bill-pincode" label="Pincode *" error={errors.billPincode}>
                    <input
                      id="co-bill-pincode" inputMode="numeric" autoComplete="billing postal-code" maxLength={6} aria-invalid={Boolean(errors.billPincode)}
                      value={billing.pincode}
                      onChange={(e) => setBillField('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className={INPUT_CLS} placeholder="201301"
                    />
                  </Field>
                </div>
              )}
            </div>

            {/* GST invoice */}
            <div className="mt-6 rounded-2xl border border-line-warm bg-cream-2/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Building2 className="h-4.5 w-4.5 text-jaggery-2" />
                  <div>
                    <p className="text-[14px] font-semibold text-ink">GST invoice for business</p>
                    <p className="text-[12px] text-muted-foreground">Claim input credit on your purchase</p>
                  </div>
                </div>
                <Switch
                  checked={gstOn}
                  onCheckedChange={setGstOn}
                  aria-label="Add GST invoice details"
                />
              </div>
              {gstOn && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field id="co-gst-name" label="Legal name *" error={errors.legalName}>
                    <input
                      id="co-gst-name" value={gstName}
                      onChange={(e) => { setGst({ gstName: e.target.value }); setErrors((er) => ({ ...er, legalName: '' })); }}
                      className={INPUT_CLS} placeholder="BiharSe Foods Pvt Ltd"
                    />
                  </Field>
                  <Field id="co-gstin" label="GSTIN *" error={errors.gstin} hint="15 characters, e.g. 10ABCDE1234F1Z5">
                    <input
                      id="co-gstin" maxLength={15} aria-invalid={Boolean(errors.gstin)}
                      value={gstin}
                      onChange={(e) => { setGst({ gstin: e.target.value.toUpperCase() }); setErrors((er) => ({ ...er, gstin: '' })); }}
                      className={INPUT_CLS + ' font-mono tracking-wider'} placeholder="10ABCDE1234F1Z5"
                    />
                  </Field>
                  <Field id="co-gst-email" label="Invoice email" error={errors.invoiceEmail} hint="Where the tax invoice is sent">
                    <input
                      id="co-gst-email" type="email" inputMode="email" aria-invalid={Boolean(errors.invoiceEmail)}
                      value={invoiceEmail}
                      onChange={(e) => { setGst({ invoiceEmail: e.target.value.trim() }); setErrors((er) => ({ ...er, invoiceEmail: '' })); }}
                      className={INPUT_CLS} placeholder="accounts@company.com"
                    />
                  </Field>
                </div>
              )}
            </div>
          </motion.section>

          {/* 3 · payment method */}
          <motion.section
            aria-labelledby="step-payment"
            initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="card-warm p-5 sm:p-7"
          >
            <div className="flex items-center gap-3">
              <StepCircle n={3} />
              <h2 id="step-payment" className="font-display text-xl font-semibold text-ink">Payment method</h2>
            </div>

            <label
              htmlFor="pay-razorpay"
              className="mt-5 flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-brand bg-brand/5 p-4 transition-colors"
            >
              <input id="pay-razorpay" type="radio" name="pay-method" defaultChecked className="sr-only" />
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 border-brand bg-brand text-cream">
                <Check className="h-3 w-3" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-[15px] font-bold text-ink">
                  <CreditCard className="h-4.5 w-4.5 text-brand" /> Razorpay
                </span>
                <span className="mt-2 flex flex-wrap gap-1.5">
                  {['UPI', 'Cards', 'Netbanking', 'Wallets'].map((m) => (
                    <span key={m} className="rounded-full bg-card px-2.5 py-1 text-[11px] font-bold text-jaggery-2 ring-1 ring-line-warm">{m}</span>
                  ))}
                </span>
              </span>
              {settings?.paymentMode === 'sandbox' && (
                <span className="rounded-full bg-turmeric px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-wide text-ink shadow">
                  Demo mode — sandbox checkout, no real charge
                </span>
              )}
            </label>
            <p className="mt-3 flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <Lock className="h-3.5 w-3.5" /> Powered by Razorpay · PCI-DSS compliant · your card data never touches our servers
            </p>
          </motion.section>
        </div>

        {/* ── right: summary ── */}
        <aside className="lg:col-span-5" aria-label="Order summary">
          <div className="card-warm lg:sticky lg:top-28">
            <div className="border-b border-line-warm px-5 py-4 sm:px-6">
              <h2 className="font-display flex items-center justify-between text-lg font-semibold text-ink">
                Order summary
                <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-[12px] font-bold text-brand">{totals.count} item{totals.count > 1 ? 's' : ''}</span>
              </h2>
            </div>

            <div className="scroll-warm max-h-72 space-y-3 overflow-y-auto px-5 py-4 sm:px-6">
              {lines.map((l) => {
                const p = cache[l.slug];
                const img = p?.images?.[0] ?? '/brand/mandala.png';
                return (
                  <div key={l.slug + '|' + l.variantLabel} className="flex items-center gap-3">
                    <img src={img} alt={p ? pick(lang, p.nameEn, p.nameHi) : l.slug} className="h-12 w-12 rounded-xl border border-line-warm object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-semibold text-ink">{p ? pick(lang, p.nameEn, p.nameHi) : l.slug}</p>
                      <p className="text-[11.5px] text-muted-foreground">{l.variantLabel}{l.weightG ? ` · ${l.weightG}g` : ''} · Qty {l.qty}</p>
                      {shortages[l.slug] !== undefined && (
                        <p className="text-[11.5px] font-bold text-destructive" role="alert">Only {shortages[l.slug]} left in stock</p>
                      )}
                    </div>
                    <p className="text-[13.5px] font-bold text-ink">{formatINR(l.unitPrice * l.qty)}</p>
                  </div>
                );
              })}
            </div>

            {/* free-shipping progress */}
            <div className="border-y border-line-warm bg-cream-2/60 px-5 py-3 sm:px-6">
              {subtotal < freeAbove ? (
                <p className="text-[12.5px] font-medium text-jaggery">
                  Add <b className="text-brand">{formatINR(freeAbove - subtotal)}</b> more for FREE delivery 🚚
                </p>
              ) : (
                <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-jaggery-2">
                  <Truck className="h-4 w-4" /> You&apos;ve unlocked FREE delivery!
                </p>
              )}
              <div
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-cream-2"
                role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Free shipping progress"
              >
                <motion.div className="sunrise-gradient h-full rounded-full" initial={{ width: 0 }} animate={{ width: progress + '%' }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} />
              </div>
            </div>

            {/* coupon + gift note */}
            <div className="space-y-3 px-5 py-4 sm:px-6">
              {couponCode ? (
                <div className="flex items-center justify-between rounded-xl border border-jaggery-2/30 bg-jaggery-2/10 px-3.5 py-2.5">
                  <p className="flex items-center gap-2 text-[13px] font-bold text-jaggery-2">
                    <BadgeCheck className="h-4 w-4" /> ✓ {couponCode} applied
                  </p>
                  <button
                    onClick={() => setCoupon('')}
                    className="text-muted-foreground transition hover:text-brand"
                    aria-label={'Remove coupon ' + couponCode}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <TicketPercent className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={couponDraft}
                      onChange={(e) => setCouponDraft(e.target.value.toUpperCase())}
                      placeholder="Coupon code"
                      aria-label="Coupon code"
                      className="w-full rounded-full border border-line-warm bg-cream-2/40 py-2.5 pl-9 pr-3 text-[13.5px] font-semibold tracking-wide outline-none focus:border-brand"
                    />
                  </div>
                  <button
                    onClick={() => validateCoupon(couponDraft)}
                    disabled={applyingCoupon || !couponDraft.trim()}
                    className="btn-ghost !px-4 !py-2.5 text-[13px]"
                  >
                    {applyingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                  </button>
                </div>
              )}

              <label htmlFor="co-gift-note" className="flex items-center gap-1.5 text-[13px] font-semibold text-jaggery">
                <Gift className="h-4 w-4 text-brand" /> Gift note (free, hand-written)
              </label>
              <textarea
                id="co-gift-note"
                value={giftNote}
                onChange={(e) => setGiftNote(e.target.value)}
                placeholder="Happy Chhath, Maa! From your favourite beta…"
                rows={2}
                maxLength={300}
                className="w-full resize-none rounded-xl border border-line-warm bg-cream-2/40 px-3 py-2 text-[13.5px] outline-none focus:border-brand"
              />

              {/* totals */}
              <div className="space-y-1.5 pt-1 text-[14px]">
                <SummaryRow label="Subtotal" value={formatINR(totals.subtotal)} />
                {totals.savings > 0 && <SummaryRow label="Batch savings" value={'−' + formatINR(totals.savings)} accent />}
                {totals.discount > 0 && <SummaryRow label={'Discount (' + couponCode + ')'} value={'−' + formatINR(totals.discount)} accent />}
                <SummaryRow label="Shipping" value={totals.shipping === 0 ? 'FREE' : formatINR(totals.shipping)} />
                <div className="flex items-baseline justify-between border-t border-dashed border-line-warm pt-2.5">
                  <span className="font-display text-[16px] font-semibold text-ink">Total</span>
                  <span className="font-display text-2xl font-bold text-ink">{formatINR(totals.total)}</span>
                </div>
              </div>

              {/* terms consent — required before payment (Consumer Protection Rules) */}
              <div
                className="rounded-2xl border border-line-warm bg-cream-2/40 p-3.5"
                aria-invalid={consentError}
              >
                <div className="flex items-start gap-2.5">
                  <Checkbox
                    id="co-consent"
                    checked={consent}
                    onCheckedChange={(v) => { setConsent(v === true); if (v === true) setConsentError(false); }}
                    aria-invalid={consentError}
                  />
                  <p className="text-[13px] leading-relaxed text-jaggery">
                    <label htmlFor="co-consent" className="cursor-pointer font-medium">I agree to the </label>
                    <button
                      type="button"
                      onClick={() => navigate('policy', { policySlug: 'terms' })}
                      className="font-semibold text-brand underline underline-offset-2 transition hover:text-brand-deep"
                    >
                      Terms
                    </button>
                    ,{' '}
                    <button
                      type="button"
                      onClick={() => navigate('policy', { policySlug: 'refund' })}
                      className="font-semibold text-brand underline underline-offset-2 transition hover:text-brand-deep"
                    >
                      Refund
                    </button>
                    {' & '}
                    <button
                      type="button"
                      onClick={() => navigate('policy', { policySlug: 'shipping' })}
                      className="font-semibold text-brand underline underline-offset-2 transition hover:text-brand-deep"
                    >
                      Shipping
                    </button>
                    {' policies'}
                  </p>
                </div>
                {consentError && (
                  <p className="mt-1.5 text-[12px] font-semibold text-destructive" role="alert">
                    Please accept the Terms, Refund &amp; Shipping policies to place your order
                  </p>
                )}
              </div>

              {/* pay button */}
              <button
                onClick={onPay}
                disabled={placing || Boolean(sheet)}
                className="btn-primary mt-2 w-full text-lg"
                aria-live="polite"
              >
                {placing ? (
                  <><Loader2 className="h-5 w-5 animate-spin" /> Preparing payment…</>
                ) : (
                  <><Lock className="h-4.5 w-4.5" /> Pay {formatINR(totals.total)} securely</>
                )}
              </button>

              {/* trust seals */}
              <div className="flex items-center justify-center gap-4 pt-1 text-[11px] font-semibold text-muted-foreground">
                <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> 256-bit encrypted</span>
                <span className="h-3 w-px bg-line-warm" aria-hidden />
                <span>Razorpay</span>
                <span className="h-3 w-px bg-line-warm" aria-hidden />
                <span>UPI</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* price-drift reconfirm — server says the sticky total is stale */}
      <Dialog open={Boolean(priceChange)} onOpenChange={(open) => { if (!open) setPriceChange(null); }}>
        <DialogContent className="max-w-md rounded-3xl border-line-warm bg-card p-0" aria-describedby="price-change-desc">
          <DialogHeader className="border-b border-line-warm px-6 py-4">
            <DialogTitle className="font-display flex items-center gap-2 text-xl text-ink">
              <AlertTriangle className="h-5 w-5 text-jaggery-2" /> Prices were just updated
            </DialogTitle>
            <DialogDescription id="price-change-desc" className="text-[13.5px] text-muted-foreground">
              Fresh batch prices went live while you were checking out — here&apos;s the new breakdown.
            </DialogDescription>
          </DialogHeader>
          <div className="scroll-warm max-h-72 space-y-2.5 overflow-y-auto px-6 py-4">
            {(priceChange?.items ?? []).map((l) => (
              <div key={l.slug + '|' + l.variantLabel} className="flex items-center justify-between gap-3 text-[13.5px]">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{l.nameEn}</p>
                  <p className="text-[11.5px] text-muted-foreground">{l.variantLabel}{l.weightG ? ` · ${l.weightG}g` : ''} · Qty {l.qty}</p>
                </div>
                <p className="font-bold text-ink">{formatINR(l.lineTotal)}</p>
              </div>
            ))}
            <div className="space-y-1.5 border-t border-dashed border-line-warm pt-3 text-[13.5px]">
              <SummaryRow label="Subtotal" value={formatINR(priceChange?.totals.subtotal ?? 0)} />
              {(priceChange?.totals.discount ?? 0) > 0 && <SummaryRow label="Discount" value={'−' + formatINR(priceChange!.totals.discount)} accent />}
              <SummaryRow label="Shipping" value={(priceChange?.totals.shipping ?? 0) === 0 ? 'FREE' : formatINR(priceChange?.totals.shipping ?? 0)} />
              <div className="flex items-baseline justify-between border-t border-line-warm pt-2">
                <span className="font-display text-[15px] font-semibold text-ink">New total</span>
                <span className="font-display text-xl font-bold text-brand">{formatINR(priceChange?.totals.total ?? 0)}</span>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-row gap-2 border-t border-line-warm bg-cream-2/40 px-6 py-4 sm:justify-between">
            <button onClick={reviewCart} className="btn-ghost !px-4 !py-2.5 text-[14px]">
              Review cart
            </button>
            <button onClick={continuePaying} disabled={placing} className="btn-primary !px-4 !py-2.5 text-[14px]">
              {placing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />} Continue paying
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {sheet && (
        <SandboxPaySheet
          init={sheet}
          onClose={() => { setSheet(null); setPlacing(false); }}
          onSuccess={() => { clear(); navigate('success', { orderNumber: sheet.orderNumber }); }}
        />
      )}
    </div>
  );
}

/* ── sandbox checkout sheet ──────────────────────────── */

const UPI_APPS = [
  { name: 'Google Pay', tint: 'bg-cream-2 text-jaggery' },
  { name: 'PhonePe', tint: 'bg-brand/10 text-brand' },
  { name: 'Paytm', tint: 'bg-turmeric-soft text-ink' },
  { name: 'BHIM', tint: 'bg-saffron/15 text-jaggery-2' },
];
const BANKS = ['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank'];

function SandboxPaySheet({ init, onClose, onSuccess }: { init: PayInit; onClose: () => void; onSuccess: () => void }) {
  const [tab, setTab] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [app, setApp] = useState(UPI_APPS[0].name);
  const [bank, setBank] = useState(BANKS[0]);
  const [confirming, setConfirming] = useState(false);

  const method = tab; // upi | card | netbanking — mirrors gateway method naming

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !confirming) {
        toast({ title: 'Payment cancelled' });
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirming]);

  const simulateFailure = () => {
    toast({ title: 'Payment failed — retry anytime', variant: 'destructive' });
    onClose();
  };

  const simulateSuccess = async () => {
    setConfirming(true);
    try {
      const r = await api<{ paymentOrderId: string; paymentId: string; signature: string; method: string }>('/api/payment/sandbox-confirm', {
        method: 'POST',
        body: JSON.stringify({ paymentOrderId: init.paymentOrderId, method }),
      });
      await api('/api/payment/verify', {
        method: 'POST',
        body: JSON.stringify({
          orderNumber: init.orderNumber,
          paymentOrderId: r.paymentOrderId,
          paymentId: r.paymentId,
          signature: r.signature,
          method: r.method,
        }),
      });
      onSuccess();
    } catch {
      toast({ title: 'Payment could not be verified — support notified', variant: 'destructive' });
      setConfirming(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-[80] grid place-items-center bg-jaggery/60 px-4 py-10 backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={() => { if (!confirming) { toast({ title: 'Payment cancelled' }); onClose(); } }}
    >
      <motion.div
        role="dialog" aria-modal="true" aria-label="BiharSe Pay sandbox checkout"
        className="card-warm w-full max-w-md overflow-hidden"
        initial={{ opacity: 0, scale: 0.94, y: 26 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="sunrise-gradient relative px-6 py-5 text-cream">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-eyebrow !text-cream/70">BiharSe Pay · Sandbox</p>
              <p className="font-display mt-1 text-2xl font-bold">{formatINR(init.amount)}</p>
            </div>
            <button
              onClick={() => { if (!confirming) { toast({ title: 'Payment cancelled' }); onClose(); } }}
              className="grid h-9 w-9 place-items-center rounded-full bg-cream/15 transition hover:bg-cream/25"
              aria-label="Cancel payment"
              disabled={confirming}
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
          <p className="mt-1 text-[11.5px] text-cream/75">Order {init.orderNumber} · no real money moves in demo mode</p>
        </div>

        {/* method tabs */}
        <div className="grid grid-cols-3 border-b border-line-warm" role="tablist" aria-label="Payment method">
          {([
            { id: 'upi', label: 'UPI', icon: Smartphone },
            { id: 'card', label: 'Card', icon: CreditCard },
            { id: 'netbanking', label: 'Netbanking', icon: Landmark },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={'flex items-center justify-center gap-1.5 py-3.5 text-[13px] font-bold transition-colors ' +
                (tab === id ? 'border-b-2 border-brand text-brand' : 'text-muted-foreground hover:text-jaggery')}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        {/* tab body */}
        <div className="px-6 py-5">
          {tab === 'upi' && (
            <div>
              <p className="text-[12px] font-bold uppercase tracking-wide text-muted-foreground">Choose your UPI app</p>
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                {UPI_APPS.map((a) => (
                  <button
                    key={a.name}
                    onClick={() => setApp(a.name)}
                    aria-pressed={app === a.name}
                    className={'flex items-center gap-2.5 rounded-xl border px-3.5 py-3 text-[13.5px] font-semibold transition-all ' +
                      (app === a.name ? 'border-brand bg-brand/5 text-ink shadow-[0_6px_16px_-8px_rgba(216,0,24,0.5)]' : 'border-line-warm bg-card text-jaggery hover:border-jaggery-2/40')}
                  >
                    <span className={'grid h-7 w-7 place-items-center rounded-lg text-[12px] font-extrabold ' + a.tint}>{a.name[0]}</span>
                    {a.name}
                    {app === a.name && <Check className="ml-auto h-4 w-4 text-brand" />}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-[11.5px] text-muted-foreground">Sandbox UPI · {app.toLowerCase().replace(/\s/g, '')}@biharse</p>
            </div>
          )}

          {tab === 'card' && (
            <div className="space-y-3" aria-hidden>
              <label className="block text-[12px] font-bold uppercase tracking-wide text-muted-foreground">Card details (pre-filled for demo)</label>
              <div className="rounded-xl border border-line-warm bg-cream-2/50 px-3.5 py-2.5 font-mono text-[14px] text-jaggery opacity-70 select-none">4111 1111 1111 1111</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-line-warm bg-cream-2/50 px-3.5 py-2.5 font-mono text-[14px] text-jaggery opacity-70 select-none">12 / 28</div>
                <div className="rounded-xl border border-line-warm bg-cream-2/50 px-3.5 py-2.5 font-mono text-[14px] text-jaggery opacity-70 select-none">CVV •••</div>
              </div>
              <div className="rounded-xl border border-line-warm bg-cream-2/50 px-3.5 py-2.5 text-[14px] text-jaggery opacity-70 select-none">{init.prefill.name || 'Card holder'}</div>
            </div>
          )}

          {tab === 'netbanking' && (
            <div>
              <p className="text-[12px] font-bold uppercase tracking-wide text-muted-foreground">Choose your bank</p>
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                {BANKS.map((b) => (
                  <button
                    key={b}
                    onClick={() => setBank(b)}
                    aria-pressed={bank === b}
                    className={'flex items-center justify-between gap-2 rounded-xl border px-3.5 py-3 text-left text-[13px] font-semibold transition-all ' +
                      (bank === b ? 'border-brand bg-brand/5 text-ink' : 'border-line-warm bg-card text-jaggery hover:border-jaggery-2/40')}
                  >
                    {b}
                    {bank === b && <Check className="h-4 w-4 shrink-0 text-brand" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* actions */}
          <div className="mt-5 space-y-2.5">
            <button onClick={simulateSuccess} disabled={confirming} className="btn-primary w-full">
              {confirming ? (
                <><Loader2 className="h-4.5 w-4.5 animate-spin" /> Confirming payment…</>
              ) : (
                <><Lock className="h-4 w-4" /> Simulate success</>
              )}
            </button>
            <button onClick={simulateFailure} disabled={confirming} className="btn-ghost w-full text-[14px]">
              Simulate failure
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── small pieces ────────────────────────────────────── */

function StepCircle({ n }: { n: number }) {
  return (
    <span aria-hidden className="font-display grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand text-[15px] font-bold text-cream shadow-[0_6px_14px_-6px_rgba(216,0,24,0.6)]">
      {n}
    </span>
  );
}

function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-[13px] font-semibold text-jaggery">{label}</label>
        {hint && !error && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
      {error && <p className="mt-1 text-[12px] font-semibold text-destructive" role="alert">{error}</p>}
    </div>
  );
}

function SummaryRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={accent ? 'font-semibold text-brand' : 'font-semibold text-ink'}>{value}</span>
    </div>
  );
}

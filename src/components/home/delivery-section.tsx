'use client';

import { useState, type FormEvent } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { BadgeCheck, MapPin, Truck } from 'lucide-react';
import { api } from '@/lib/api';
import { formatINR } from '@/lib/money';
import { useSettings } from '@/lib/store';
import type { DeliveryCheck } from '@/lib/types';
import { Reveal, SplitText } from '@/components/fx/reveal';
import { SectionOrnament } from '@/components/fx/madhubani';

/** Dashes flow origin → destination; −140 = 10 × pattern(6+8) so the loop is seamless. */
const DASH_CSS = `
@keyframes biharse-dashmove { to { stroke-dashoffset: -140; } }
.biharse-dash { animation: biharse-dashmove 3.2s linear infinite; }
`;

type CheckState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ok'; data: DeliveryCheck }
  | { kind: 'error'; message: string };

export default function DeliverySection() {
  const reduce = useReducedMotion();
  const settings = useSettings((s) => s.data);
  const freeAbove = formatINR(settings?.shipping?.freeAbovePaise ?? 99900);

  const [pincode, setPincode] = useState('');
  const [check, setCheck] = useState<CheckState>({ kind: 'idle' });

  const destLabel =
    check.kind === 'ok'
      ? check.data.city
        ? `${check.data.city} · ${check.data.state}`
        : 'Your doorstep'
      : 'Your city';

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(pincode)) {
      setCheck({ kind: 'error', message: 'Enter a valid 6-digit pincode' });
      return;
    }
    setCheck({ kind: 'loading' });
    try {
      const res = await api<DeliveryCheck>('/api/delivery/check', {
        method: 'POST',
        body: JSON.stringify({ pincode }),
      });
      if (!res.serviceable) {
        setCheck({ kind: 'error', message: 'We do not ship to this pincode yet — write to us and we will try.' });
      } else {
        setCheck({ kind: 'ok', data: res });
      }
    } catch (err) {
      setCheck({ kind: 'error', message: err instanceof Error ? err.message : 'Something went wrong. Try again.' });
    }
  };

  return (
    <section
      className="theme-dark relative overflow-hidden bg-jaggery py-20 text-cream sm:py-28"
      data-theme="dark"
      aria-label="Delivery across Bharat"
    >
      <style>{DASH_CSS}</style>

      {/* ambient glows */}
      <div aria-hidden className="pointer-events-none absolute -left-40 top-10 h-[420px] w-[420px] rounded-full bg-brand/20 blur-[120px]" />
      <div aria-hidden className="pointer-events-none absolute -right-40 bottom-0 h-[420px] w-[420px] rounded-full bg-turmeric/15 blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <div className="text-center">
          <SectionOrnament dark />
          <p className="text-eyebrow mt-6 text-turmeric">Across Bharat</p>
          <SplitText
            text="From our ghat to your gate"
            className="mx-auto mt-3 max-w-3xl font-display font-semibold text-display-1 text-cream"
          />
          <p className="mx-auto mt-4 max-w-xl text-[15.5px] leading-relaxed text-cream/75">
            Freshly prepared, hygienically packed, delivered across India in 5–8 days.
          </p>
        </div>

        <div className="mt-14 grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          {/* stylised route visual */}
          <Reveal>
            <div className="relative aspect-[520/360] w-full">
              <svg viewBox="0 0 520 360" fill="none" className="absolute inset-0 h-full w-full" aria-hidden>
                {/* abstract landmass hints (not an accurate map) */}
                <path
                  d="M148 34 C 226 12, 318 52, 336 128 C 356 208, 306 286, 224 306 C 152 322, 88 268, 96 186 C 104 118, 96 62, 148 34 Z"
                  fill="rgba(255,246,233,0.07)"
                />
                <path
                  d="M368 262 C 398 254, 424 274, 414 302 C 404 326, 366 322, 356 296 C 350 280, 352 268, 368 262 Z"
                  fill="rgba(255,246,233,0.05)"
                />
                <path
                  d="M60 60 C 90 40, 130 44, 140 70 C 150 96, 120 116, 92 108 C 66 100, 44 84, 60 60 Z"
                  fill="rgba(255,246,233,0.05)"
                />

                {/* node halos */}
                <circle cx={78} cy={88} r={34} fill="rgba(255,246,233,0.06)" stroke="rgba(255,246,233,0.25)" />
                <circle cx={446} cy={268} r={30} fill="rgba(216,0,24,0.2)" stroke="rgba(255,246,233,0.3)" />

                {/* route: soft underglow + flowing dashes */}
                <path d="M78 88 Q240 20 446 268" stroke="var(--turmeric)" strokeWidth={8} strokeLinecap="round" opacity={0.16} />
                <path
                  d="M78 88 Q240 20 446 268"
                  stroke="var(--turmeric)"
                  strokeWidth={2.6}
                  strokeLinecap="round"
                  strokeDasharray="6 8"
                  opacity={0.95}
                  className="biharse-dash"
                />

                {/* parcel dot travelling the curve */}
                <motion.circle
                  r={7}
                  fill="var(--turmeric)"
                  stroke="#241209"
                  strokeWidth={3}
                  initial={false}
                  animate={
                    reduce
                      ? { x: 446, y: 268 }
                      : { x: [78, 162, 251, 346, 446], y: [88, 74, 99, 164, 268] }
                  }
                  transition={
                    reduce
                      ? { duration: 0 }
                      : { duration: 5.6, times: [0, 0.25, 0.5, 0.75, 1], ease: 'easeInOut', repeat: Infinity, repeatDelay: 1.4 }
                  }
                />
              </svg>

              {/* origin node — Mithila */}
              <div className="absolute" style={{ left: '15%', top: '24.4%', transform: 'translate(-50%, -50%)' }}>
                <img
                  src="/brand/mandala.png"
                  alt=""
                  draggable={false}
                  className="h-16 w-16 rounded-full border-2 border-turmeric/70 bg-cream object-cover shadow-[0_10px_24px_-8px_rgba(0,0,0,0.6)]"
                />
                <p className="absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-full border border-cream/20 bg-cream/10 px-3 py-1 text-[11px] font-bold tracking-wide text-cream backdrop-blur">
                  Mithila · Bihar
                </p>
              </div>

              {/* destination node — updates after pincode check */}
              <div className="absolute" style={{ left: '85.8%', top: '74.4%', transform: 'translate(-50%, -50%)' }}>
                <div
                  className={`grid h-16 w-16 place-items-center rounded-full bg-brand text-cream shadow-[0_10px_26px_-8px_rgba(216,0,24,0.7)] ring-2 transition-all duration-500 ${
                    check.kind === 'ok' ? 'ring-turmeric scale-105' : 'ring-cream/30'
                  }`}
                >
                  <MapPin className="h-7 w-7" aria-hidden />
                </div>
                <p className="absolute left-1/2 top-full mt-2 max-w-[46vw] -translate-x-1/2 truncate whitespace-nowrap rounded-full border border-cream/20 bg-cream/10 px-3 py-1 text-[11px] font-bold tracking-wide text-turmeric backdrop-blur">
                  {destLabel}
                </p>
              </div>
            </div>
          </Reveal>

          {/* pincode checker */}
          <Reveal delay={0.15}>
            <div className="glass-dark rounded-[1.75rem] p-6 sm:p-8">
              <p className="text-eyebrow text-turmeric">Pincode checker</p>
              <h3 className="mt-2 font-display text-[22px] font-semibold text-cream">When will it reach you?</h3>

              <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-3 sm:flex-row">
                <input
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="postal-code"
                  maxLength={6}
                  placeholder="Enter 6-digit pincode"
                  aria-label="Pincode"
                  aria-invalid={check.kind === 'error'}
                  className="h-12 flex-1 rounded-full border border-cream/25 bg-cream/10 px-5 text-[15px] tracking-[0.18em] text-cream outline-none transition placeholder:tracking-normal placeholder:text-cream/45 focus:border-turmeric focus:ring-2 focus:ring-turmeric/40"
                />
                <button
                  type="submit"
                  disabled={check.kind === 'loading'}
                  className="btn-primary h-12 shrink-0 px-7"
                >
                  {check.kind === 'loading' ? 'Checking…' : 'Check'}
                </button>
              </form>

              <div aria-live="polite" className="mt-4 min-h-[92px]">
                {check.kind === 'ok' && (
                  <div>
                    <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-cream/60">
                      {check.data.city ? `${check.data.city}, ${check.data.state}` : 'Serviceable across India'}
                    </p>
                    <p className="mt-1 font-display text-[26px] font-bold leading-tight text-turmeric sm:text-[30px]">
                      {check.data.etaLabel}
                    </p>
                    <p className="mt-2 flex items-center gap-2 text-[13.5px] font-semibold text-cream/85">
                      <BadgeCheck className="h-[18px] w-[18px] shrink-0 text-turmeric" aria-hidden />
                      Serviceable ✓ — freshly fried batch reserved for your date
                    </p>
                  </div>
                )}
                {check.kind === 'error' && (
                  <p className="text-sm font-semibold text-saffron" role="alert">
                    {check.message}
                  </p>
                )}
                {check.kind === 'idle' && (
                  <p className="text-[13px] leading-relaxed text-cream/60">
                    5–8 days across India · 2–4 days in Bihar &amp; Jharkhand metros.
                  </p>
                )}
              </div>

              <p className="mt-4 flex items-center gap-2 border-t border-cream/15 pt-4 text-[12.5px] font-semibold text-cream/75">
                <Truck className="h-4 w-4 shrink-0 text-turmeric" aria-hidden />
                Free shipping on orders above {freeAbove}
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useConsent } from '@/lib/store';

/** Branded boot loader — mandala blooms while settings load */
export function MandalaLoader() {
  return (
    <div className="grid min-h-screen place-items-center bg-cream" role="status" aria-label="Loading BiharSe">
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0, rotate: -30 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto w-fit"
        >
          <Image src="/brand/mandala.png" alt="" width={88} height={88} className="animate-spin-slow rounded-full" style={{ animationDuration: '3s' }} priority />
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="font-dev-display mt-5 text-xl text-jaggery"
        >
          बिहारसे
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-eyebrow mt-2 text-jaggery-3"
        >
          Fresh from the ghat
        </motion.p>
      </div>
    </div>
  );
}

/** Analytics consent (DPDP Act 2023, granular) — GA4 + Meta Pixel fire only after an explicit analytics opt-in;
 *  marketing consent (email offers/newsletter) is stored & logged; no marketing pixel is loaded today. */
declare global {
  interface Window {
    dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void; fbq?: (...args: unknown[]) => void;
  }
}

const GA_ID = process.env.NEXT_PUBLIC_GA4_ID;
const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const POLICY_VERSION = 'v1';

let analyticsBound = false;

/** Pseudonymous, non-PII device id — a random UUID in localStorage. Never a fingerprint. */
export function anonId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let id = localStorage.getItem('biharse-anon-id');
    if (!id) {
      id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `anon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
      localStorage.setItem('biharse-anon-id', id);
    }
    return id;
  } catch {
    return ''; // private mode / storage blocked — server stores the log without anonId
  }
}

/** Single entry point for a consent decision: persists to the store and
 *  fire-and-forget POSTs to /api/consent (silent — never blocks the UI). */
export function recordConsent(prefs: { analytics: boolean; marketing: boolean }): void {
  useConsent.getState().setConsent(prefs);
  try {
    void fetch('/api/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ analyticsOk: prefs.analytics, marketingOk: prefs.marketing, anonId: anonId(), policyVersion: POLICY_VERSION }),
      keepalive: true,
    }).catch(() => { /* silent */ });
  } catch { /* silent */ }
}

const CONSENT_ROWS = [
  {
    key: 'essential' as const,
    label: 'Essential',
    desc: 'Cart, sign-in and payments — BiharSe cannot run without these.',
    locked: true,
  },
  {
    key: 'analytics' as const,
    label: 'Analytics',
    desc: 'GA4 & Meta Pixel — anonymous stats so we know what\u2019s loved.',
    locked: false,
  },
  {
    key: 'marketing' as const,
    label: 'Marketing',
    desc: 'Email newsletter & festive offers from our kitchen.',
    locked: false,
  },
];

export function ConsentGate() {
  const decided = useConsent((s) => s.consent.decided);
  const analytics = useConsent((s) => s.consent.analytics);
  const marketing = useConsent((s) => s.consent.marketing);
  const [managing, setManaging] = useState(false);
  const [draft, setDraft] = useState({ analytics: false, marketing: false });

  /* client-only flag via useSyncExternalStore — no SSR hydration mismatch */
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);
  const show = mounted && !decided;

  /* Analytics scripts — load only after an explicit analytics opt-in. */
  useEffect(() => {
    if (!analytics) return;
    // GA4
    if (GA_ID && !document.getElementById('ga4-src')) {
      const s = document.createElement('script');
      s.id = 'ga4-src'; s.async = true; s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
      document.head.appendChild(s);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function gtag(...args: unknown[]) { window.dataLayer?.push(args); } as typeof window.gtag;
      window.gtag?.('js', new Date());
      window.gtag?.('config', GA_ID, { anonymize_ip: true });
    }
    // Meta Pixel
    if (PIXEL_ID && !document.getElementById('fb-pixel-src')) {
      const s = document.createElement('script');
      s.id = 'fb-pixel-src'; s.async = true;
      s.innerHTML = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${PIXEL_ID}');fbq('track','PageView');`;
      document.head.appendChild(s);
    }
    if (!analyticsBound) {
      analyticsBound = true;
      window.addEventListener('biharse:event', (e) => {
        const { name, data } = (e as CustomEvent<{ name: string; data?: Record<string, unknown> }>).detail;
        window.gtag?.('event', name, data);
        window.fbq?.('trackCustom', name, data);
      });
    }
  }, [analytics]);

  /* Marketing scripts — none implemented today; the flag is stored and
     logged server-side so a future pixel honours the recorded choice. */
  useEffect(() => {
    if (!marketing) return;
    // Future marketing pixels mount here, gated on marketing consent.
  }, [marketing]);

  const quickDecide = (prefs: { analytics: boolean; marketing: boolean }) => {
    recordConsent(prefs);
    setManaging(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="glass fixed bottom-[132px] left-3 right-3 z-[60] mx-auto max-w-lg rounded-2xl px-5 py-4 lg:bottom-[84px] lg:left-5 lg:right-auto lg:max-w-sm"
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
          role="dialog" aria-label="Privacy consent" aria-live="polite"
        >
          <p className="text-eyebrow text-jaggery-3">Your privacy, your call</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink/80">
            Essential cookies keep BiharSe working. Analytics helps us understand what&apos;s loved, and marketing consent covers our emails. Under India&apos;s DPDP Act 2023 nothing optional fires until you say yes — never sold, changeable anytime.
          </p>

          {!managing ? (
            <>
              <div className="mt-3 flex gap-2">
                <button onClick={() => quickDecide({ analytics: true, marketing: true })} className="btn-primary flex-1 !py-2 text-[13px]">Accept all</button>
                <button onClick={() => quickDecide({ analytics: false, marketing: false })} className="btn-ghost flex-1 !py-2 text-[13px]">Essential only</button>
              </div>
              <button
                onClick={() => {
                  const c = useConsent.getState().consent;
                  setDraft({ analytics: c.analytics, marketing: c.marketing });
                  setManaging(true);
                }}
                className="mt-2 w-full text-center text-[12px] font-semibold text-jaggery-2 underline underline-offset-2 transition-colors hover:text-brand"
                aria-expanded={false}
              >
                Manage preferences
              </button>
            </>
          ) : (
            <div className="mt-3">
              <TooltipProvider delayDuration={200}>
                <ul className="space-y-2.5">
                  {CONSENT_ROWS.map((row) => {
                    const checked = row.locked ? true : draft[row.key];
                    return (
                      <li key={row.key} className="flex items-start gap-3 rounded-xl border border-line-warm bg-cream-2/40 px-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-bold text-jaggery">{row.label}</p>
                          <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">{row.desc}</p>
                        </div>
                        {row.locked ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span aria-disabled="true">
                                <Switch checked={checked} disabled aria-label={`${row.label} cookies — always on`} />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[180px] text-center text-[11.5px]">
                              Always on — required for BiharSe to function
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <Switch
                            checked={checked}
                            onCheckedChange={(v) => setDraft((d) => ({ ...d, [row.key]: v }))}
                            aria-label={`${row.label} cookies`}
                          />
                        )}
                      </li>
                    );
                  })}
                </ul>
              </TooltipProvider>
              <div className="mt-3 flex gap-2">
                <button onClick={() => quickDecide(draft)} className="btn-primary flex-1 !py-2 text-[13px]">Save preferences</button>
                <button onClick={() => quickDecide({ analytics: true, marketing: true })} className="btn-ghost flex-1 !py-2 text-[13px]">Accept all</button>
              </div>
              <button
                onClick={() => setManaging(false)}
                className="mt-2 w-full text-center text-[12px] font-semibold text-jaggery-2 underline underline-offset-2 transition-colors hover:text-brand"
                aria-expanded
              >
                Back
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Funnel event helper — use everywhere: track('add_to_cart', {...}).
 *  Fires only when analytics consent is granted. */
export function track(name: string, data?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  if (!useConsent.getState().consent.analytics) return;
  window.dispatchEvent(new CustomEvent('biharse:event', { detail: { name, data } }));
}

/* One-time migration of the pre-granular binary consent key: legacy visitors
   had opted in/out of analytics only (marketing was never asked). Runs at
   module load on the client — before first paint — so the banner never
   flashes for users who already decided. */
function subscribeNever() {
  return () => {}; // static subscribe for useSyncExternalStore
}

if (typeof window !== 'undefined') {
  try {
    const legacy = localStorage.getItem('biharse-consent');
    if (legacy) {
      if (!useConsent.getState().consent.decided) {
        recordConsent({ analytics: legacy === 'granted', marketing: false });
      }
      localStorage.removeItem('biharse-consent');
    }
  } catch { /* storage unavailable */ }
}

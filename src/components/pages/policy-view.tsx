'use client';

import { FileText, Mail, Truck } from 'lucide-react';
import { MadhubaniDivider } from '@/components/fx/madhubani';
import { Reveal } from '@/components/fx/reveal';
import { useSettings, useUi } from '@/lib/store';
import { POLICIES } from '@/lib/section-data';

const TABS = [
  { slug: 'privacy', label: 'Privacy' },
  { slug: 'refund', label: 'Refund' },
  { slug: 'shipping', label: 'Shipping' },
  { slug: 'terms', label: 'Terms' },
] as const;

/** Legal pages — tabbed policy renderer fed from POLICIES content. */
export default function PolicyView({ policySlug }: { policySlug: string }) {
  const navigate = useUi((s) => s.navigate);
  const shipping = useSettings((s) => s.data?.shipping);

  const policy = POLICIES[policySlug] ?? POLICIES.privacy;
  const isShipping = policySlug === 'shipping';

  const freeAbove = ((shipping?.freeAbovePaise ?? 99900) / 100).toLocaleString('en-IN');
  const flat = ((shipping?.flatPaise ?? 9900) / 100).toLocaleString('en-IN');

  return (
    <div className="bg-cream">
      <section className="mx-auto max-w-3xl px-6 pt-28 pb-20">
        <Reveal className="text-center">
          <p className="text-eyebrow text-brand-deep">Help Centre · Legal</p>
          <h1 className="mt-4 font-display text-display-1 text-jaggery">{policy.title}</h1>
          <p className="mt-3 text-sm text-muted-foreground">Last updated {policy.updated}</p>
        </Reveal>

        {/* ── Switcher tabs ─────────────────────────────── */}
        <Reveal className="mt-10">
          <div
            className="flex flex-wrap justify-center gap-2.5"
            role="tablist"
            aria-label="Policy pages"
          >
            {TABS.map((t) => {
              const active = t.slug === policySlug;
              return (
                <button
                  key={t.slug}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => navigate('policy', { policySlug: t.slug })}
                  className={`rounded-full px-5 py-2 text-sm font-semibold transition-all ${
                    active
                      ? 'bg-brand text-cream shadow-lg shadow-brand/30'
                      : 'border border-line-warm bg-card text-jaggery hover:border-brand/50 hover:text-brand'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </Reveal>

        {/* ── Shipping highlight ────────────────────────── */}
        {isShipping && (
          <Reveal className="mt-10">
            <div className="flex items-center gap-4 rounded-2xl border border-turmeric/60 bg-turmeric-soft/60 p-5">
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-turmeric text-ink"
                aria-hidden
              >
                <Truck className="h-5 w-5" />
              </span>
              <p className="text-sm font-semibold text-jaggery">
                Free above ₹{freeAbove} · Flat ₹{flat} below
                <span className="block font-normal text-muted-foreground">
                  On every prepaid order, packed cold-chain-safe across India.
                </span>
              </p>
            </div>
          </Reveal>
        )}

        {/* ── Sections ──────────────────────────────────── */}
        <div className="mt-4">
          {policy.sections.map((sec, i) => (
            <Reveal key={sec.h} delay={0.03 * i}>
              <div className={i === 0 ? 'pt-10' : 'pt-2'}>
                {i > 0 && <MadhubaniDivider className="my-8 opacity-70" />}
                <div className="flex items-baseline gap-4">
                  <span className="font-display text-sm font-bold tabular-nums text-brand" aria-hidden>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h2 className="font-semibold text-jaggery">{sec.h}</h2>
                    <p className="mt-2.5 leading-relaxed text-muted-foreground">{sec.p}</p>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* ── Footer card ───────────────────────────────── */}
        <Reveal className="mt-16">
          <div className="card-warm flex flex-col items-center gap-4 p-8 text-center">
            <span
              className="flex h-11 w-11 items-center justify-center rounded-full bg-brand/10 text-brand"
              aria-hidden
            >
              <Mail className="h-5 w-5" />
            </span>
            <p className="font-semibold text-jaggery">Questions?</p>
            <a href="mailto:support@biharse.org" className="btn-ghost text-sm">
              <FileText className="h-4 w-4" aria-hidden />
              support@biharse.org
            </a>
          </div>
        </Reveal>
      </section>
    </div>
  );
}

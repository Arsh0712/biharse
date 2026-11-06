'use client';

import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { pick } from '@/lib/api';
import { useSettings, useUi } from '@/lib/store';
import { Reveal } from '@/components/fx/reveal';
import { MandalaWatermark, SectionOrnament, MadhubaniDivider } from '@/components/fx/madhubani';
import { RITUAL_DAYS } from '@/lib/section-data';

const DATE_KEYS = ['nahayKhay', 'kharna', 'sandhyaArghya', 'ushaArghya'] as const;
type DateKey = (typeof DATE_KEYS)[number];

const RITUAL_NAME_EN: Record<DateKey, string> = {
  nahayKhay: 'Nahay Khay',
  kharna: 'Kharna',
  sandhyaArghya: 'Sandhya Arghya',
  ushaArghya: 'Usha Arghya',
};
const RITUAL_NAME_HI: Record<DateKey, string> = {
  nahayKhay: 'नहाय खाय',
  kharna: 'खरना',
  sandhyaArghya: 'संध्या अर्घ्य',
  ushaArghya: 'उषा अर्घ्य',
};

const fmtDate = (ts: number) =>
  new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(ts));

const pad = (n: number) => String(n).padStart(2, '0');

export default function ChhathSection() {
  const lang = useUi((s) => s.lang);
  const navigate = useUi((s) => s.navigate);
  const settings = useSettings((s) => s.data);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const upcoming = settings?.chhathUpcoming ?? null;

  /* first ritual date still in the future; null once the year is done */
  let target: { ts: number; key: DateKey } | null = null;
  if (upcoming) {
    for (const k of DATE_KEYS) {
      const ts = new Date(upcoming[k]).getTime();
      if (!Number.isNaN(ts) && ts > now) {
        target = { ts, key: k };
        break;
      }
    }
  }

  const diff = target ? Math.max(0, target.ts - now) : 0;
  const cells = [
    { label: pick(lang, 'Days', 'दिन'), value: target ? String(Math.floor(diff / 86_400_000)) : '—' },
    { label: pick(lang, 'Hours', 'घंटे'), value: target ? pad(Math.floor(diff / 3_600_000) % 24) : '—' },
    { label: pick(lang, 'Minutes', 'मिनट'), value: target ? pad(Math.floor(diff / 60_000) % 60) : '—' },
    { label: pick(lang, 'Seconds', 'सेकंड'), value: target ? pad(Math.floor(diff / 1000) % 60) : '—' },
  ];

  const chipDate = (key: string) => {
    const v = upcoming ? upcoming[key as DateKey] : undefined;
    const ts = v ? new Date(v).getTime() : NaN;
    return Number.isNaN(ts) ? '—' : fmtDate(ts);
  };

  return (
    <section
      data-theme="dark"
      aria-label={pick(lang, 'Chhath Puja — Mahaparv countdown and rituals', 'छठ पूजा — महापर्व काउंटडाउन और विधियाँ')}
      className="theme-dark relative overflow-hidden bg-jaggery py-20 sm:py-28"
    >
      <MandalaWatermark className="-left-56 -top-56 h-[640px] w-[640px]" opacity={0.08} />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          {/* ── content ── */}
          <div>
            <Reveal>
              <SectionOrnament dark />
              <p className="text-eyebrow mt-5 text-turmeric">{pick(lang, 'Mahaparv is coming', 'महापर्व आ रहा है')}</p>
              <h2 className="font-display text-display-1 mt-3 text-cream">
                {pick(lang, 'Chhath Puja', 'छठ पूजा')}{' '}
                <span className={lang === 'en' ? 'font-dev-display text-turmeric-soft' : 'text-cream/70'}>
                  {lang === 'en' ? '· छठ पूजा' : '· Chhath Puja'}
                </span>
              </h2>
              <p className="mt-4 max-w-xl text-[15px] text-cream/80 sm:text-base">
                {pick(
                  lang,
                  'Order prasad that reaches before the first arghya.',
                  'ऐसा प्रसाद मंगाइए जो पहले अर्घ्य से पहले पहुँच जाए।',
                )}
              </p>
            </Reveal>

            {/* live countdown */}
            <Reveal delay={0.08} className="mt-9">
              {target ? (
                <div role="timer" aria-label={pick(lang, 'Countdown to Chhath Puja', 'छठ पूजा की काउंटडाउन')}>
                  <div className="grid grid-cols-4 gap-2.5 sm:gap-4">
                    {cells.map((c) => (
                      <div key={c.label} className="glass-dark rounded-2xl px-1.5 py-4 text-center sm:py-5">
                        <p className="font-display text-3xl font-semibold tabular-nums text-cream sm:text-4xl lg:text-5xl">
                          {c.value}
                        </p>
                        <p className="mt-1.5 text-[10.5px] font-bold uppercase tracking-[0.18em] text-cream/70 sm:text-[11px]">
                          {c.label}
                        </p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-sm text-cream/75">
                    <span className="font-dev-display text-base text-turmeric-soft">
                      {pick(lang, RITUAL_NAME_EN[target.key], RITUAL_NAME_HI[target.key])}
                    </span>
                    {' · '}
                    {fmtDate(target.ts)}
                  </p>
                </div>
              ) : (
                <div aria-live="polite">
                  {settings ? (
                    <div className="glass-dark rounded-2xl px-6 py-8 text-center">
                      <p className="font-dev-display text-xl text-turmeric-soft">छठी मइया सबके मनोकामना पूर्ण करें</p>
                      <p className="mt-2 text-sm text-cream/75">
                        {pick(lang, 'Dates for next year coming soon', 'अगले साल की तारीख़ें जल्द आ रही हैं')}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-2.5 sm:gap-4" aria-hidden>
                      {cells.map((c) => (
                        <div key={c.label} className="glass-dark animate-pulse rounded-2xl py-4 text-center sm:py-5">
                          <p className="font-display text-3xl text-cream/40 sm:text-4xl">—</p>
                          <p className="mt-1.5 text-[10.5px] uppercase tracking-[0.18em] text-cream/40">{c.label}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <MadhubaniDivider className="mt-8" color="var(--turmeric)" />
            </Reveal>

            {/* CTAs */}
            <Reveal delay={0.14} className="mt-8 flex flex-col gap-4 sm:flex-row">
              <button
                onClick={() => navigate('product', { slug: 'gur-thekua' })}
                className="btn-primary text-[15px]"
              >
                {pick(lang, 'Order Chhath Prasad Thekua', 'छठ प्रसाद ठेकुआ ऑर्डर करें')}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
              <button
                onClick={() => navigate('rituals')}
                className="btn-ghost border-cream/40! text-[15px] text-cream! hover:bg-cream/10!"
              >
                {pick(lang, 'Explore all rituals', 'सभी विधियाँ देखें')}
                <span aria-hidden>→</span>
              </button>
            </Reveal>
          </div>

          {/* ── hamper visual ── */}
          <Reveal delay={0.1} className="relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              <MandalaWatermark className="-right-20 -top-20 h-72 w-72 sm:h-96 sm:w-96" opacity={0.14} />
              <img
                src="/img/thekua-gur-2.jpg"
                alt={pick(lang, 'Fresh Gur Thekua arranged on a brass plate with marigolds — Chhath prasad made at home', 'पीतल की थाली में गेंदे के फूलों के साथ ताज़ा गुड़ ठेकुआ — घर का छठ प्रसाद')}
                loading="lazy"
                className="relative w-full rounded-[2rem] border border-cream/15 object-cover shadow-[0_50px_100px_-40px_rgba(0,0,0,0.8)]"
              />
              <span className="glass-dark absolute bottom-4 left-4 rounded-full px-4 py-2 text-[12.5px] font-bold text-turmeric-soft">
                {pick(lang, 'Chhath Special · packed first, always', 'छठ स्पेशल · हमेशा सबसे पहले पैक')}
              </span>
            </div>
          </Reveal>
        </div>

        {/* ── ritual timeline ── */}
        <Reveal delay={0.05} className="mt-16">
          <div className="flex items-baseline justify-between gap-4">
            <h3 className="font-display text-display-2 text-cream">
              {pick(lang, 'The four days', 'चार दिन')}{' '}
              <span className="font-dev-display text-lg text-turmeric-soft">चार व्रत</span>
            </h3>
            <p className="hidden shrink-0 text-xs uppercase tracking-[0.22em] text-cream/60 sm:block">
              {pick(lang, 'Swipe to explore', 'स्वाइप करें')}
            </p>
          </div>

          <div className="no-scrollbar mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
            {RITUAL_DAYS.map((d) => (
              <article
                key={d.key}
                className="glass-dark w-[268px] shrink-0 snap-start rounded-2xl p-5 sm:w-[300px]"
              >
                <div className="flex items-center justify-between">
                  <span className="font-display text-3xl tabular-nums text-turmeric">{`0${d.n}`}</span>
                  <span className="rounded-full bg-cream/10 px-3 py-1 text-[11px] font-semibold text-cream/80">
                    {chipDate(d.key)}
                  </span>
                </div>
                <h4 className="font-display mt-3 text-lg text-cream">
                  {d.titleEn}
                  <span className="font-dev-display ml-2 text-base text-turmeric-soft">{d.titleHi}</span>
                </h4>
                <p className="mt-2 text-[13px] leading-relaxed text-cream/70">
                  {(() => {
                    const desc = pick(lang, d.descEn, d.descHi);
                    return desc.length > 92 ? `${desc.slice(0, 89).trimEnd()}…` : desc;
                  })()}
                </p>
              </article>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

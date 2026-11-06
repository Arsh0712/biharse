'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, CalendarDays, Sun, Utensils } from 'lucide-react';
import { Magnetic } from '@/components/fx/magnetic';
import { Reveal, SplitText } from '@/components/fx/reveal';
import { SectionOrnament } from '@/components/fx/madhubani';
import { pick } from '@/lib/api';
import { useSettings, useUi } from '@/lib/store';
import { RITUAL_DAYS } from '@/lib/section-data';
import type { ChhathYearDto } from '@/lib/types';

type DayKey = 'nahayKhay' | 'kharna' | 'sandhyaArghya' | 'ushaArghya';

const pad = (n: number) => String(n).padStart(2, '0');

function fmtDay(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** The four days of Chhath — live countdown + day-by-day vrat timeline. */
export default function RitualsView() {
  const navigate = useUi((s) => s.navigate);
  const lang = useUi((s) => s.lang);
  const settings = useSettings((s) => s.data);

  const upcoming = settings?.chhathUpcoming ?? null;
  const years = settings?.chhathAll ?? [];
  const year: ChhathYearDto | null =
    years.find((y) => y.year === (upcoming?.year ?? new Date().getFullYear())) ?? null;

  const targetMs = upcoming ? new Date(upcoming.nahayKhay).getTime() : NaN;
  const hasTarget = Number.isFinite(targetMs);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!hasTarget) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [hasTarget]);

  const diff = hasTarget ? Math.max(0, targetMs - now) : 0;
  const reached = hasTarget && diff === 0;
  const cells = [
    { label: 'Days', value: pad(Math.floor(diff / 86_400_000)) },
    { label: 'Hours', value: pad(Math.floor(diff / 3_600_000) % 24) },
    { label: 'Minutes', value: pad(Math.floor(diff / 60_000) % 60) },
    { label: 'Seconds', value: pad(Math.floor(diff / 1000) % 60) },
  ];

  // which ritual day is "today" (compare calendar days from the CMS year)
  const currentKey: DayKey | null = (() => {
    if (!year) return null;
    const nowD = new Date(now);
    for (const d of RITUAL_DAYS) {
      const start = new Date(year[d.key as DayKey]);
      if (Number.isNaN(start.getTime())) continue;
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      if (nowD >= start && nowD < end) return d.key as DayKey;
    }
    return null;
  })();

  return (
    <div className="bg-cream">
      {/* ── Header ───────────────────────────────────────── */}
      <section className="mx-auto max-w-4xl px-6 pt-28 text-center">
        <Reveal>
          <p className="text-eyebrow text-brand-deep">The Four Days</p>
          <SplitText
            as="h1"
            text="Nahay Khay to Usha Arghya"
            highlight="Usha"
            className="mt-4 font-display text-display-1 text-jaggery"
          />
          <p className="mx-auto mt-5 max-w-2xl leading-relaxed text-muted-foreground">
            The complete Chhath vrat, day by day — dates CMS-editable every year.
          </p>
        </Reveal>
      </section>

      {/* ── Live countdown ───────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-6 pt-12" aria-live="polite">
        <Reveal>
          <div className="card-warm p-8 text-center sm:p-10">
            {upcoming && hasTarget ? (
              <>
                <p className="text-eyebrow text-brand-deep">
                  <Sun className="mr-2 inline h-4 w-4 text-turmeric" aria-hidden />
                  Countdown to Nahay Khay
                </p>
                <div className="mt-7 grid grid-cols-4 gap-2 sm:gap-6">
                  {cells.map((c) => (
                    <div key={c.label} role="timer" aria-label={`${c.value} ${c.label}`}>
                      <div className="text-sunrise font-display text-4xl font-semibold tabular-nums sm:text-5xl">
                        {c.value}
                      </div>
                      <div className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-jaggery-2 sm:text-[11px]">
                        {c.label}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-7 text-sm text-muted-foreground">
                  {reached ? (
                    'The Mahaparv is underway — see you at the ghat!'
                  ) : (
                    <>
                      Until{' '}
                      <span className="font-dev-display text-base text-brand">नहाय खाय</span>
                      {fmtDay(upcoming.nahayKhay) ? ` · ${fmtDay(upcoming.nahayKhay)}` : ''}
                    </>
                  )}
                </p>
              </>
            ) : (
              <p className="mx-auto max-w-md py-4 text-muted-foreground">
                Next year&rsquo;s dates will be announced after Dev Uthani Ekadashi.
              </p>
            )}
          </div>
        </Reveal>
      </section>

      {/* ── Timeline ─────────────────────────────────────── */}
      <section className="py-20" aria-label="Chhath vrat day by day">
        <div className="mx-auto max-w-5xl px-6">
          <div className="relative">
            <div
              aria-hidden
              className="absolute top-3 bottom-10 left-4 border-l-2 border-dashed border-jaggery-3/40 lg:left-1/2"
            />
            <ol className="space-y-10 lg:space-y-16">
              {RITUAL_DAYS.map((day, i) => {
                const iso = year ? year[day.key as DayKey] : undefined;
                const dateLabel = fmtDay(iso);
                const isToday = currentKey === day.key;
                const primary = pick(lang, day.descEn, day.descHi);
                const secondary = pick(lang, day.descHi, day.descEn);
                return (
                  <li key={day.key} className="relative lg:grid lg:grid-cols-2 lg:gap-24">
                    <span
                      aria-hidden
                      className={`absolute top-8 left-4 z-10 h-4 w-4 -translate-x-1/2 rounded-full border-2 lg:left-1/2 ${
                        isToday ? 'border-brand bg-brand ring-4 ring-brand/20' : 'border-jaggery-3 bg-cream'
                      }`}
                    />
                    <Reveal
                      className={`pl-12 lg:pl-0 ${i % 2 === 1 ? 'lg:col-start-2' : ''}`}
                      delay={0.05}
                    >
                      <article
                        className={`card-warm p-6 lg:p-8 ${isToday ? 'ring-2 ring-brand' : ''}`}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-brand px-3 py-1 text-xs font-bold text-cream">
                            Day {day.n}
                          </span>
                          {dateLabel && (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-line-warm px-3 py-1 text-xs font-medium text-jaggery-2">
                              <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                              {dateLabel}
                            </span>
                          )}
                          {isToday && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-turmeric px-3 py-1 text-xs font-bold text-ink">
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink" aria-hidden />
                              Today
                            </span>
                          )}
                        </div>
                        <h2 className="mt-4 font-display text-2xl text-jaggery">
                          {day.titleEn}{' '}
                          <span className="font-dev-display text-xl text-brand">{day.titleHi}</span>
                        </h2>
                        <p className="mt-3 leading-relaxed text-muted-foreground">{primary}</p>
                        <p className="mt-3 font-dev-body text-jaggery-3">{secondary}</p>
                        <p className="mt-4 flex items-start gap-2.5 rounded-xl bg-turmeric-soft/50 p-3.5 text-sm font-medium text-jaggery">
                          <Utensils className="mt-0.5 h-4 w-4 shrink-0 text-jaggery-2" aria-hidden />
                          {day.foodEn}
                        </p>
                      </article>
                    </Reveal>
                  </li>
                );
              })}
            </ol>
          </div>

          {!year && (
            <p className="mt-10 text-center text-sm text-muted-foreground">
              Dates for {new Date().getFullYear()} will be announced after Dev Uthani Ekadashi.
            </p>
          )}

          <Reveal className="mt-14 text-center">
            <Magnetic>
              <button
                type="button"
                onClick={() => navigate('product', { slug: 'gur-thekua' })}
                className="btn-primary"
              >
                Get prasad delivered before Day 3
                <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            </Magnetic>
            <p className="mt-6 text-xs text-muted-foreground">
              Dates are tithi-verified for {year?.year ?? new Date().getFullYear()} and editable in
              admin each year.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── closing ornament ─────────────────────────────── */}
      <div className="pb-16">
        <SectionOrnament />
      </div>
    </div>
  );
}

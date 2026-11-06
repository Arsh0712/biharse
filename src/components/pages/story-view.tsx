'use client';

import { Fragment } from 'react';
import { ArrowRight } from 'lucide-react';
import { CountUp, ImageReveal, Reveal } from '@/components/fx/reveal';
import { MandalaWatermark } from '@/components/fx/madhubani';
import { Magnetic } from '@/components/fx/magnetic';
import { useUi } from '@/lib/store';
import { STORY_PAGE } from '@/lib/section-data';

const STATS = [
  { to: 100, suffix: '%', label: 'homemade' },
  { to: 0, suffix: '', label: 'preservatives, ever' },
  { to: 30, suffix: '+', label: 'days fresh' },
  { to: 500, suffix: '+', label: 'pincodes served' },
];

const DROP_CAP =
  'first-letter:float-left first-letter:mr-3 first-letter:font-display first-letter:text-6xl first-letter:font-semibold first-letter:leading-[0.8] first-letter:text-brand';

/** Our Story / Our Kitchen — editorial page. */
export default function StoryView() {
  const navigate = useUi((s) => s.navigate);

  return (
    <div className="bg-cream">
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative pt-24">
        <ImageReveal
          src="/img/kitchen-wide.png"
          alt="The BiharSe family kitchen, wide shot"
          className="h-[46vh] min-h-[340px] w-full"
          imgClassName="h-full w-full object-cover"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 top-24 bg-gradient-to-t from-ink/85 via-ink/35 to-ink/10"
        />
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center pb-12 text-center">
          <Reveal>
            <p className="text-eyebrow text-turmeric">{STORY_PAGE.eyebrow}</p>
            <h1 className="mt-4 max-w-3xl px-6 font-display text-display-1 text-cream drop-shadow-sm">
              {STORY_PAGE.titleEn}
            </h1>
          </Reveal>
        </div>
      </section>

      {/* ── Editorial ────────────────────────────────────── */}
      <section className="py-20" aria-label="Our story">
        <div className="mx-auto max-w-3xl px-6">
          {STORY_PAGE.paragraphs.map((para, i) => (
            <Fragment key={i}>
              <Reveal delay={0.04}>
                <p
                  className={`leading-loose text-jaggery-2 ${i === 0 ? DROP_CAP : ''} ${i > 0 ? 'mt-8' : ''}`}
                >
                  {para}
                </p>
              </Reveal>
              {i === 0 && (
                <ImageReveal
                  src="/img/story-kneading.png"
                  alt="Hands kneading wheat dough with desi ghee"
                  className="my-12 w-full -rotate-1 rounded-[1.75rem] shadow-xl"
                  curtain="var(--jaggery)"
                />
              )}
              {i === 1 && (
                <ImageReveal
                  src="/img/story-frying.png"
                  alt="Thekua slow-frying in ghee over a low flame"
                  className="my-12 w-full rotate-1 rounded-[1.75rem] shadow-xl"
                  curtain="var(--jaggery)"
                />
              )}
            </Fragment>
          ))}
        </div>
      </section>

      {/* ── Values ───────────────────────────────────────── */}
      <section className="bg-cream-2 py-16" aria-labelledby="values-heading">
        <div className="mx-auto max-w-3xl px-6">
          <Reveal>
            <h2 id="values-heading" className="text-eyebrow text-brand-deep">
              What we hold on to
            </h2>
          </Reveal>
          <div className="mt-6 divide-y divide-line-warm border-b border-t border-line-warm">
            {STORY_PAGE.values.map(([hi, en]) => (
              <Reveal key={hi}>
                <div className="flex flex-col gap-1 py-7 sm:flex-row sm:items-center sm:gap-10">
                  <span className="w-44 shrink-0 font-dev-display text-4xl text-brand">{hi}</span>
                  <span className="text-muted-foreground">{en}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Kitchen stats ────────────────────────────────── */}
      <section className="theme-dark relative overflow-hidden bg-jaggery py-16" data-theme="dark">
        <MandalaWatermark className="-right-40 -top-40 h-[480px] w-[480px]" opacity={0.12} />
        <div className="relative mx-auto grid max-w-5xl grid-cols-2 gap-10 px-6 text-center lg:grid-cols-4">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.08}>
              <div className="font-display text-4xl font-semibold text-turmeric sm:text-5xl">
                <CountUp to={s.to} suffix={s.suffix} />
              </div>
              <div className="mt-2 text-xs font-bold uppercase tracking-[0.22em] text-cream/70">
                {s.label}
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────── */}
      <section className="bg-cream py-20 text-center">
        <Reveal>
          <p className="mx-auto max-w-xl px-6 text-muted-foreground">
            Everything you just read happens in one kitchen, every morning. Taste it.
          </p>
          <div className="mt-8">
            <Magnetic>
              <button type="button" onClick={() => navigate('shop')} className="btn-primary">
                Taste our kitchen
                <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            </Magnetic>
          </div>
        </Reveal>
      </section>
    </div>
  );
}

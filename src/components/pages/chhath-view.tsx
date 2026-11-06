'use client';

import { ArrowRight, HeartHandshake, Leaf, Sun, Waves, type LucideIcon } from 'lucide-react';
import { ImageReveal, Reveal, SplitText } from '@/components/fx/reveal';
import { MadhubaniDivider, MandalaWatermark } from '@/components/fx/madhubani';
import { Magnetic } from '@/components/fx/magnetic';
import { useUi } from '@/lib/store';
import { CHHATH_FACTS, CHHATH_STORY } from '@/lib/section-data';

const FACT_ICONS: Record<string, LucideIcon> = {
  sun: Sun,
  water: Waves,
  heart: HeartHandshake,
  leaf: Leaf,
};

/** About Chhath Puja — the Mahaparv story, facts and prasad CTA. */
export default function ChhathView() {
  const navigate = useUi((s) => s.navigate);

  return (
    <div className="bg-cream">
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="theme-dark relative overflow-hidden bg-jaggery pt-28 pb-16" data-theme="dark">
        <MandalaWatermark className="-left-48 -top-28 h-[560px] w-[560px]" opacity={0.14} />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <p className="text-eyebrow text-turmeric">Mahaparv · छठ पूजा</p>
            <h1 className="mt-5 font-display text-display-1 text-cream">
              The festival of the Sun
            </h1>
            <p className="mt-3 font-dev-display text-2xl text-turmeric sm:text-3xl">
              सूर्य उपासना का महापर्व
            </p>
            <p className="mt-6 max-w-lg leading-relaxed text-cream/80">
              Nahay Khay to Usha Arghya — four days when Bihar stands waist-deep in the river and
              offers arghya to Surya, and our kitchen packs prasad for every ghat.
            </p>
            <div className="mt-9">
              <Magnetic>
                <button
                  type="button"
                  onClick={() => navigate('product', { slug: 'gur-thekua' })}
                  className="btn-primary"
                >
                  Order Chhath Prasad Thekua
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </button>
              </Magnetic>
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <ImageReveal
              src="/img/thekua-gur-2.jpg"
              alt="Fresh Gur Thekua arranged on a brass plate with marigolds — homemade Chhath prasad"
              className="aspect-[4/3] w-full rounded-[2rem] object-cover shadow-2xl ring-1 ring-cream/15"
            />
          </Reveal>
        </div>
      </section>

      {/* ── Four facts ───────────────────────────────────── */}
      <section className="py-20" aria-labelledby="chhath-facts-heading">
        <div className="mx-auto max-w-7xl px-6">
          <Reveal className="text-center">
            <p className="text-eyebrow text-brand-deep">Why Mahaparv</p>
            <h2 id="chhath-facts-heading" className="mt-3 font-display text-display-2 text-jaggery">
              A festival older than memory
            </h2>
          </Reveal>
          <div className="mt-12 grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
            {CHHATH_FACTS.map((fact, i) => {
              const Icon = FACT_ICONS[fact.icon] ?? Sun;
              return (
                <Reveal key={fact.titleEn} delay={i * 0.08}>
                  <article className="card-warm h-full p-5 lg:p-6">
                    <span
                      className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-turmeric"
                      aria-hidden
                    >
                      <Icon className="h-6 w-6" />
                    </span>
                    <h3 className="mt-4 font-bold text-jaggery">
                      {fact.titleEn}{' '}
                      <span className="font-dev-display font-normal text-brand">{fact.titleHi}</span>
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{fact.desc}</p>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Story ────────────────────────────────────────── */}
      <section className="bg-cream-2 py-20" aria-labelledby="chhath-story-heading">
        <div className="mx-auto max-w-5xl px-6">
          <MadhubaniDivider className="mx-auto max-w-3xl" />
          <Reveal className="mt-8 text-center">
            <p className="text-eyebrow text-brand-deep">The Story</p>
            <SplitText
              as="h2"
              text={CHHATH_STORY.introEn}
              highlight="Mahaparv"
              className="mt-4 font-display text-display-2 text-jaggery"
            />
          </Reveal>
          <Reveal delay={0.1}>
            <div className="mt-12 gap-14 text-[15px] leading-loose text-jaggery-2 sm:columns-2 [&>p]:mb-6">
              {CHHATH_STORY.paragraphsEn.map((para, i) => (
                <p
                  key={i}
                  className={
                    i === 0
                      ? 'first-letter:float-left first-letter:mr-3 first-letter:font-display first-letter:text-6xl first-letter:font-semibold first-letter:leading-[0.8] first-letter:text-brand'
                      : undefined
                  }
                >
                  {para}
                </p>
              ))}
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="mt-12 text-center font-dev-display text-2xl text-brand sm:text-3xl">
              {CHHATH_STORY.closing}
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── CTA band ─────────────────────────────────────── */}
      <section className="bg-cream py-20">
        <Reveal className="mx-auto max-w-5xl px-6">
          <div className="sunrise-gradient relative overflow-hidden rounded-[2.5rem] p-10 text-center shadow-2xl sm:p-14">
            <MandalaWatermark className="-right-24 -top-24 h-80 w-80" opacity={0.18} />
            <MandalaWatermark className="-bottom-28 -left-24 h-80 w-80" opacity={0.18} />
            <h2 className="relative font-display text-display-2 text-cream drop-shadow-sm">
              Have the prasad ready before the first arghya
            </h2>
            <p className="relative mx-auto mt-3 max-w-xl text-cream/85">
              Chhath orders are packed first, always — hand-pressed thekua, sealed the same day it
              is fried.
            </p>
            <div className="relative mt-8">
              <Magnetic>
                <button
                  type="button"
                  onClick={() => navigate('shop', { category: 'chhath-prasad' })}
                  className="btn-gold"
                >
                  Shop thekua &amp; hampers
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </button>
              </Magnetic>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}

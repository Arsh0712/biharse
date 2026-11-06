'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { pick } from '@/lib/api';
import { useUi } from '@/lib/store';
import { Reveal, SplitText, ImageReveal } from '@/components/fx/reveal';
import { SectionOrnament } from '@/components/fx/madhubani';
import { PINNED_STORY } from '@/lib/section-data';

const STEPS = PINNED_STORY.steps;

/* prefers-reduced-motion as an external store (no setState-in-effect) */
function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}
const getReducedSnapshot = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const getReducedServerSnapshot = () => false;

export default function PinnedStory() {
  const lang = useUi((s) => s.lang);
  const reduced = useSyncExternalStore(subscribeReducedMotion, getReducedSnapshot, getReducedServerSnapshot);
  const [active, setActive] = useState(0);

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);

  /* Apple-style pinned scrub — GSAP ScrollTrigger, DOM-driven crossfades */
  useEffect(() => {
    if (reduced) return;
    const wrap = wrapRef.current;
    const panel = panelRef.current;
    const progress = progressRef.current;
    if (!wrap || !panel || !progress) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(panel);
      const n = STEPS.length;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: wrap,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.6,
          onUpdate: (self) => {
            progress.style.transform = `scaleX(${self.progress})`;
            const i = Math.min(n - 1, Math.floor(self.progress * n));
            setActive((prev) => (prev === i ? prev : i));
          },
        },
      });

      for (let i = 1; i < n; i++) {
        const at = i - 0.225;
        tl.to(q(`[data-img="${i - 1}"]`), { autoAlpha: 0, duration: 0.45, ease: 'power2.inOut' }, at);
        tl.fromTo(q(`[data-img="${i}"]`), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.45, ease: 'power2.inOut' }, at);
        tl.to(q(`[data-txt="${i - 1}"]`), { autoAlpha: 0, y: -26, duration: 0.45, ease: 'power2.inOut' }, at);
        tl.fromTo(q(`[data-txt="${i}"]`), { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: 'power2.inOut' }, at);
      }
      /* hold the last step through the end of the pin (timeline length = n) */
      tl.set({}, {}, n);
    }, panel);

    return () => ctx.revert();
  }, [reduced]);

  const header = (
    <Reveal className="flex flex-col items-center text-center">
      <SectionOrnament />
      <p className="text-eyebrow mt-5 text-brand">{pick(lang, 'The Journey', 'सफ़र')}</p>
      <SplitText
        text={pick(lang, PINNED_STORY.titleEn, PINNED_STORY.titleHi)}
        className="font-display text-display-1 mt-3 max-w-3xl text-ink"
      />
      <p className="mt-4 max-w-xl text-[15px] text-jaggery-2 sm:text-base">
        {pick(
          lang,
          'Six quiet steps between our kitchen and your chai — scroll slowly, this one deserves it.',
          'हमारी रसोई और आपकी चाय के बीच के छह ख़ामोश कदम — धीरे-धीरे स्क्रॉल करें।',
        )}
      </p>
    </Reveal>
  );

  /* ── Reduced motion: simple stacked list with reveals ── */
  if (reduced) {
    return (
      <section aria-label={pick(lang, PINNED_STORY.titleEn, PINNED_STORY.titleHi)} className="bg-cream-2 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          {header}
          <div className="mt-14 flex flex-col gap-14">
            {STEPS.map((s) => (
              <Reveal key={s.n}>
                <div className="grid items-center gap-6 md:grid-cols-2 md:gap-10">
                  <ImageReveal
                    src={s.image}
                    alt={pick(lang, s.titleEn, s.titleHi)}
                    className="h-64 rounded-[2rem] sm:h-80"
                  />
                  <div>
                    <p className="font-display text-4xl tabular-nums text-brand">{`0${s.n}`}</p>
                    <h3 className="font-display text-display-2 mt-2 text-ink">{pick(lang, s.titleEn, s.titleHi)}</h3>
                    <p className="font-dev-display mt-1 text-lg text-jaggery-2">{s.titleHi}</p>
                    <p className="mt-3 max-w-md text-[15px] text-jaggery-3">{pick(lang, s.descEn, s.descHi)}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    );
  }

  /* ── Pinned scrub version ── */
  return (
    <section aria-label={pick(lang, PINNED_STORY.titleEn, PINNED_STORY.titleHi)} className="relative bg-cream-2">
      <div className="mx-auto max-w-7xl px-5 pt-20 sm:px-8 sm:pt-28 lg:px-12">{header}</div>

      <div ref={wrapRef} className="relative h-[350vh]">
        <div ref={panelRef} className="sticky top-0 flex h-screen items-center overflow-hidden">
          {/* sunrise progress bar */}
          <div className="absolute inset-x-0 top-0 z-30 h-1 bg-cream/50">
            <div ref={progressRef} className="sunrise-gradient h-full w-full origin-left" style={{ transform: 'scaleX(0)' }} />
          </div>

          <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 pt-10 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14 lg:px-12 lg:pt-0">
            {/* step list — desktop */}
            <ol className="hidden flex-col justify-center gap-6 lg:flex" aria-label={pick(lang, 'Journey steps', 'सफ़र के कदम')}>
              {STEPS.map((s, i) => (
                <li key={s.n} className="flex items-baseline gap-4 transition-colors duration-300">
                  <span
                    aria-hidden
                    className={`font-display text-sm tabular-nums ${i === active ? 'text-brand' : 'text-jaggery-3/50'}`}
                  >
                    {`0${s.n}`}
                  </span>
                  <span
                    className={`font-display text-lg leading-snug transition-colors duration-300 ${
                      i === active ? 'font-semibold text-ink' : 'text-jaggery-3/60'
                    }`}
                  >
                    {pick(lang, s.titleEn, s.titleHi)}
                  </span>
                </li>
              ))}
            </ol>

            {/* image card — right */}
            <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
              {/* mobile step dots */}
              <div className="mb-4 flex justify-center gap-2 lg:hidden" aria-hidden>
                {STEPS.map((s, i) => (
                  <span key={s.n} className={`h-1.5 w-6 rounded-full transition-colors duration-300 ${i === active ? 'bg-brand' : 'bg-jaggery/25'}`} />
                ))}
              </div>

              <div className="relative h-[58vh] overflow-hidden rounded-[2rem] shadow-[0_40px_90px_-40px_rgba(61,31,18,0.6)] sm:h-[62vh] lg:h-[70vh]">
                {STEPS.map((s, i) => (
                  <img
                    key={s.n}
                    data-img={i}
                    src={s.image}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                    style={{ opacity: i === 0 ? 1 : 0, visibility: i === 0 ? 'visible' : 'hidden' }}
                    loading={i === 0 ? 'eager' : 'lazy'}
                  />
                ))}

                {/* legibility scrim */}
                <div aria-hidden className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-jaggery/95 via-jaggery/45 to-transparent" />

                {/* text stack — crossfades with the scrub */}
                {STEPS.map((s, i) => (
                  <div
                    key={s.n}
                    data-txt={i}
                    aria-hidden={i !== active}
                    className="absolute inset-x-0 bottom-0 p-6 sm:p-8"
                    style={{ opacity: i === 0 ? 1 : 0, visibility: i === 0 ? 'visible' : 'hidden' }}
                  >
                    <p className="font-display text-5xl tabular-nums text-cream/90">{`0${s.n}`}</p>
                    <h3 className="font-display text-display-2 mt-2 max-w-md text-cream">
                      {pick(lang, s.titleEn, s.titleHi)}
                    </h3>
                    <p className="font-dev-display mt-1 text-lg text-turmeric-soft sm:text-xl">
                      {lang === 'en' ? s.titleHi : s.titleEn}
                    </p>
                    <p className="mt-2 max-w-md text-sm text-cream/85 sm:text-[15px]">{pick(lang, s.descEn, s.descHi)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

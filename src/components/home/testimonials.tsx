'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useReducedMotion } from 'framer-motion';
import { BadgeCheck, ChevronLeft, ChevronRight, MoveHorizontal, Star } from 'lucide-react';
import { Reveal, SplitText } from '@/components/fx/reveal';
import { SectionOrnament } from '@/components/fx/madhubani';
import { api } from '@/lib/api';

const EDGE_FADE = 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)';

interface FeaturedReview {
  id: string;
  name: string;
  city: string;
  rating: number;
  title: string;
  body: string;
  verified: boolean;
  createdAt: string;
  productSlug: string;
  productNameEn: string;
}

/**
 * Testimonials — REAL approved reviews only, fetched from /api/reviews?featured=8.
 * "Verified buyer" renders only when the review's verified flag is true (server-derived
 * from a delivered order). No approved reviews → the section renders nothing at all.
 */
export default function Testimonials() {
  const reduce = useReducedMotion();
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [maxOverflow, setMaxOverflow] = useState(0);
  const [reviews, setReviews] = useState<FeaturedReview[] | null>(null);

  /* Fetch real approved reviews (newest first) — section stays hidden when there are none */
  useEffect(() => {
    let alive = true;
    api<{ reviews: FeaturedReview[] }>('/api/reviews?featured=8')
      .then((d) => {
        if (alive) setReviews(d.reviews ?? []);
      })
      .catch(() => {
        if (alive) setReviews([]); // section disappears on failure too — no fake fallback
      });
    return () => {
      alive = false;
    };
  }, []);

  // measure how far the track can slide (track width − viewport width)
  useEffect(() => {
    const measure = () => {
      const vp = viewportRef.current;
      const tr = trackRef.current;
      if (!vp || !tr) return;
      setMaxOverflow(Math.max(0, tr.scrollWidth - vp.clientWidth));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (viewportRef.current) ro.observe(viewportRef.current);
    if (trackRef.current) ro.observe(trackRef.current);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  const nudge = useCallback(
    (dir: 'prev' | 'next') => {
      const vp = viewportRef.current;
      const step = vp ? Math.min(400, vp.clientWidth * 0.75) : 360;
      const delta = dir === 'next' ? -step : step;
      const target = Math.min(0, Math.max(-maxOverflow, x.get() + delta));
      animate(x, target, { type: 'spring', stiffness: 300, damping: 32 });
    },
    [maxOverflow, x],
  );

  /* No approved reviews (or still loading them) → nothing to show; the section disappears
     rather than showing invented quotes. */
  if (reviews === null) {
    return (
      <section className="bg-cream py-20 sm:py-28" aria-label="Customer testimonials" aria-busy="true">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="text-center">
            <SectionOrnament />
            <p className="text-eyebrow mt-6 text-brand">Letters from your table</p>
            <SplitText text="Real reviews, real cities" className="mx-auto mt-3 font-display font-semibold text-display-1 text-ink" />
          </div>
          <div className="mt-10 flex gap-5 overflow-hidden" style={{ maskImage: EDGE_FADE, WebkitMaskImage: EDGE_FADE }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton card-warm h-52 w-[300px] min-w-[300px] shrink-0 sm:w-[360px] sm:min-w-[360px]" />
            ))}
          </div>
        </div>
      </section>
    );
  }
  if (reviews.length === 0) return null;

  return (
    <section className="bg-cream py-20 sm:py-28" aria-label="Customer testimonials">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="text-center">
          <SectionOrnament />
          <p className="text-eyebrow mt-6 text-brand">Letters from your table</p>
          <SplitText
            text="Real reviews, real cities"
            className="mx-auto mt-3 font-display font-semibold text-display-1 text-ink"
          />
        </div>

        {/* drag hint + arrow controls */}
        <div className="mt-8 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => nudge('prev')}
            aria-label="Show previous testimonials"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line-warm bg-card text-jaggery transition-all duration-300 hover:border-brand hover:bg-brand hover:text-cream"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>
          <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.18em] text-jaggery-3">
            <MoveHorizontal className="h-4 w-4" aria-hidden />
            Drag to explore
          </p>
          <button
            type="button"
            onClick={() => nudge('next')}
            aria-label="Show next testimonials"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line-warm bg-card text-jaggery transition-all duration-300 hover:border-brand hover:bg-brand hover:text-cream"
          >
            <ChevronRight className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <Reveal className="mt-8">
          <div
            ref={viewportRef}
            className="overflow-hidden py-2"
            style={{ maskImage: EDGE_FADE, WebkitMaskImage: EDGE_FADE }}
          >
            <motion.div
              ref={trackRef}
              drag={reduce ? false : 'x'}
              dragConstraints={{ left: -maxOverflow, right: 0 }}
              dragElastic={0.08}
              style={{ x }}
              className="flex w-max cursor-grab gap-5 px-1 active:cursor-grabbing"
              role="list"
              aria-label="Reviews from verified buyers"
            >
              {reviews.map((r) => (
                <article
                  key={r.id}
                  role="listitem"
                  className="card-warm flex w-[300px] min-w-[300px] shrink-0 flex-col p-6 sm:w-[360px] sm:min-w-[360px]"
                >
                  <div className="flex items-center gap-1" aria-hidden>
                    {[0, 1, 2, 3, 4].map((s) => (
                      <Star
                        key={s}
                        className={`h-4 w-4 ${s < r.rating ? 'fill-turmeric text-turmeric' : 'text-turmeric/45'}`}
                      />
                    ))}
                  </div>
                  <span className="sr-only">Rated {r.rating} out of 5</span>

                  {r.title && <p className="font-display mt-3 text-[16px] font-semibold text-ink">{r.title}</p>}
                  <p className="mt-2 flex-1 text-[15.5px] leading-relaxed text-ink">&ldquo;{r.body}&rdquo;</p>

                  {r.productNameEn && (
                    <p className="mt-3 text-[12.5px] font-semibold text-jaggery-2">
                      on <span className="underline decoration-line-warm underline-offset-2">{r.productNameEn}</span>
                    </p>
                  )}

                  <div className="mt-5 flex items-center gap-3 border-t border-line-warm pt-4">
                    <span
                      aria-hidden
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand font-display text-[16px] font-bold text-cream"
                    >
                      {r.name[0]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-bold text-ink">
                        {r.name}
                        {r.city ? ` — ${r.city}` : ''}
                      </p>
                      {r.verified && (
                        <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-jaggery-3/45 px-2 py-[2px] text-[10px] font-bold tracking-wide text-jaggery-2">
                          <BadgeCheck className="h-3 w-3" aria-hidden /> Verified buyer
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </motion.div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

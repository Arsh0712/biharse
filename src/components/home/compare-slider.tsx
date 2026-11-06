'use client';

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { pick } from '@/lib/api';
import { useUi } from '@/lib/store';
import { Reveal, SplitText } from '@/components/fx/reveal';
import { COMPARE } from '@/lib/section-data';

const MIN = 10;
const MAX = 90;
const NOTE_KEYS = ['Taste', 'Sweetness', 'Best for'] as const;
const NOTE_HI: Record<string, string> = { Taste: 'स्वाद', Sweetness: 'मिठास', 'Best for': 'सबसे बढ़िया' };

type Side = typeof COMPARE.left;

function SideContent({
  data,
  side,
  lang,
  onShop,
}: {
  data: Side;
  side: 'left' | 'right';
  lang: 'en' | 'hi';
  onShop: (slug: string) => void;
}) {
  const isLeft = side === 'left';
  const notes = NOTE_KEYS.map((key) => ({
    key,
    value: data.notes.find((nv) => nv[0] === key)?.[1] ?? '',
  }));

  return (
    <div className="flex h-full flex-col">
      <div className="relative min-h-0 flex-1">
        <img
          src={data.image}
          alt={`${data.name} (${data.nameHi}) — BiharSe thekua`}
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>

      {/* notes + CTA anchored to the panel's own half, so the default split looks complete */}
      <div
        className={`shrink-0 border-t border-line-warm px-4 pb-4 pt-3 sm:px-6 ${isLeft ? 'bg-card' : 'bg-cream-2'}`}
      >
        <div className={`flex w-[94%] flex-col gap-2 sm:w-[46%] ${isLeft ? 'items-start' : 'items-end ml-auto'}`}>
          <h3 className="font-display text-lg text-ink sm:text-xl">
            {data.name}
            <span className="font-dev-display ml-1.5 text-base text-jaggery-2">{data.nameHi}</span>
          </h3>
          <ul className={`flex flex-wrap gap-1.5 ${isLeft ? 'justify-start' : 'justify-end'}`}>
            {notes.map((n) => (
              <li
                key={n.key}
                className="inline-flex max-w-full items-baseline gap-1.5 rounded-full bg-jaggery/10 px-3 py-1 text-[11.5px] sm:text-[12.5px]"
              >
                <span className="whitespace-nowrap font-bold text-jaggery-3">{pick(lang, n.key, NOTE_HI[n.key])}</span>
                <span className="text-jaggery-2">{n.value}</span>
              </li>
            ))}
          </ul>
          <button
            onClick={() => onShop(data.slug)}
            className={`${isLeft ? 'btn-primary' : 'btn-gold'} px-5! py-3! text-sm!`}
          >
            {isLeft ? pick(lang, 'Shop Chini', 'चीनी ठेकुआ खरीदें') : pick(lang, 'Shop Gur', 'गुड़ ठेकुआ खरीदें')}
            <span aria-hidden>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CompareSlider() {
  const lang = useUi((s) => s.lang);
  const navigate = useUi((s) => s.navigate);

  const [pos, setPos] = useState(50);
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const clamp = (v: number) => Math.min(MAX, Math.max(MIN, v));

  const updateFromClientX = (clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0) return;
    setPos(clamp(((clientX - rect.left) / rect.width) * 100));
  };

  /* global move/up listeners only while dragging */
  useEffect(() => {
    if (!dragging) return;
    const move = (e: globalThis.PointerEvent) => updateFromClientX(e.clientX);
    const up = () => setDragging(false);
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [dragging]);

  const onContainerPointerDown = (e: ReactPointerEvent) => {
    if ((e.target as HTMLElement).closest('button, a')) return;
    updateFromClientX(e.clientX);
    setDragging(true);
  };

  const onHandlePointerDown = (e: ReactPointerEvent) => {
    e.stopPropagation();
    setDragging(true);
  };

  const onHandleKeyDown = (e: ReactKeyboardEvent) => {
    const step = e.shiftKey ? 12 : 4;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      setPos((p) => clamp(p - step));
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      setPos((p) => clamp(p + step));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setPos(MIN);
    } else if (e.key === 'End') {
      e.preventDefault();
      setPos(MAX);
    }
  };

  const onShop = (slug: string) => navigate('product', { slug });

  return (
    <section aria-label={pick(lang, COMPARE.titleEn, COMPARE.titleHi)} className="bg-cream py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 lg:px-12">
        {/* Header */}
        <Reveal className="flex flex-col items-center text-center">
          <p className="text-eyebrow text-brand">{pick(lang, 'The Great Debate', 'महातर्क')}</p>
          <SplitText
            text={pick(lang, COMPARE.titleEn, COMPARE.titleHi)}
            className="font-display text-display-1 mt-3 max-w-3xl text-ink"
          />
          <p className="font-dev-display mt-3 text-xl text-jaggery-2 sm:text-2xl">
            {lang === 'en' ? COMPARE.titleHi : COMPARE.titleEn}
          </p>
        </Reveal>

        {/* Slider */}
        <Reveal delay={0.1}>
          <div role="group" aria-label={pick(lang, 'Chini vs Gur comparison', 'चीनी बनाम गुड़ तुलना')} className="mt-12">
            <p className="sr-only">
              {pick(
                lang,
                'Drag the divider — or focus it and use the arrow keys — to reveal more of either side.',
                'डिवाइडर को खींचें — या तीर कुंजियों से — दोनों तरफ़ देखने के लिए।',
              )}
            </p>

            <div
              ref={containerRef}
              onPointerDown={onContainerPointerDown}
              className="relative aspect-[4/5] cursor-ew-resize touch-pan-y select-none overflow-hidden rounded-[2rem] border border-line-warm shadow-[0_30px_70px_-35px_rgba(61,31,18,0.5)] sm:aspect-[16/10] lg:aspect-[16/9]"
            >
              {/* base layer — Chini */}
              <div className="absolute inset-0">
                <SideContent data={COMPARE.left} side="left" lang={lang} onShop={onShop} />
              </div>

              {/* clipped overlay — Gur */}
              <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${pos}%)` }}>
                <SideContent data={COMPARE.right} side="right" lang={lang} onShop={onShop} />
              </div>

              {/* corner labels */}
              <span className="pointer-events-none absolute left-4 top-4 z-10 rounded-full bg-ink/70 px-4 py-1.5 text-xs font-bold tracking-wide text-cream backdrop-blur-sm">
                {pick(lang, 'Chini', 'चीनी')}
              </span>
              <span className="pointer-events-none absolute right-4 top-4 z-10 rounded-full bg-turmeric/90 px-4 py-1.5 text-xs font-bold tracking-wide text-ink backdrop-blur-sm">
                {pick(lang, 'Gur', 'गुड़')}
              </span>

              {/* divider + draggable handle */}
              <div className="pointer-events-none absolute inset-y-0 z-20" style={{ left: `${pos}%` }}>
                <div aria-hidden className="absolute inset-y-0 -left-px w-0.5 bg-cream shadow-[0_0_14px_rgba(0,0,0,0.45)]" />
                <button
                  type="button"
                  role="slider"
                  tabIndex={0}
                  aria-label={pick(lang, 'Compare divider — Chini and Gur thekua', 'तुलना डिवाइडर — चीनी और गुड़ ठेकुआ')}
                  aria-valuemin={MIN}
                  aria-valuemax={MAX}
                  aria-valuenow={Math.round(pos)}
                  aria-valuetext={pick(
                    lang,
                    `Divider at ${Math.round(pos)}% — Chini on the left, Gur on the right`,
                    `डिवाइडर ${Math.round(pos)}% — बाएँ चीनी, दाएँ गुड़`,
                  )}
                  onPointerDown={onHandlePointerDown}
                  onKeyDown={onHandleKeyDown}
                  className={`pointer-events-auto absolute top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize touch-none place-items-center rounded-full border-[3px] border-cream bg-brand text-cream shadow-[0_12px_30px_-8px_rgba(0,0,0,0.5)] transition-transform duration-200 ${
                    dragging ? 'scale-110' : 'hover:scale-105 active:scale-95'
                  }`}
                >
                  <ArrowLeftRight className="h-5 w-5" aria-hidden />
                </button>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '@/lib/use-reduced-motion';

/** Madhubani/Mithila-inspired SVG line-art border that draws itself in on scroll. */
export function MadhubaniDivider({ className, color = 'var(--brand-red)', flip = false }: { className?: string; color?: string; flip?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [drawn, setDrawn] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setDrawn(true); io.disconnect(); } }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);

  const motifs = Array.from({ length: 9 });

  return (
    <div ref={ref} className={`line-draw ${reduced || drawn ? 'drawn' : ''} ${className ?? ''}`} style={flip ? { transform: 'scaleY(-1)' } : undefined}>
      <svg viewBox="0 0 720 34" fill="none" className="h-8 w-full min-w-[480px]" preserveAspectRatio="xMidYMid meet" aria-hidden>
        <line x1="0" y1="17" x2="720" y2="17" stroke={color} strokeWidth="1.4" opacity="0.55" />
        {motifs.map((_, i) => {
          const cx = 40 + i * 80;
          return (
            <g key={i} stroke={color} strokeWidth="1.6" fill="none">
              {/* lotus petal */}
              <path d={`M${cx - 16} 17 Q${cx - 8} 4 ${cx} 17 Q${cx + 8} 30 ${cx + 16} 17`} />
              <path d={`M${cx - 10} 17 Q${cx - 4} 9 ${cx + 2} 17 Q${cx + 8} 25 ${cx + 12} 17`} opacity="0.6" />
              {/* vine leaves */}
              <path d={`M${cx + 16} 17 q8 -7 16 0 q-8 7 -16 0`} opacity="0.8" />
              <circle cx={cx + 38} cy="17" r="2.4" fill={color} stroke="none" />
              <path d={`M${cx + 44} 17 q6 -9 12 0 q-6 9 -12 0`} opacity="0.5" />
            </g>
          );
        })}
        {/* end peacock feather */}
        <g stroke={color} strokeWidth="1.4" fill="none">
          <circle cx="716" cy="17" r="5" />
          <circle cx="716" cy="17" r="9" opacity="0.5" />
        </g>
      </svg>
    </div>
  );
}

/** Rotating mandala watermark */
export function MandalaWatermark({ className, opacity = 0.06 }: { className?: string; opacity?: number }) {
  return (
    <div aria-hidden className={`pointer-events-none absolute ${className ?? ''}`} style={{ opacity }}>
      <img src="/brand/mandala.png" alt="" className="animate-spin-slow h-full w-full rounded-full object-cover" draggable={false} />
    </div>
  );
}

/** Section ornament — small mandala with flanking rules */
export function SectionOrnament({ dark = false }: { dark?: boolean }) {
  const line = dark ? 'bg-cream/30' : 'bg-jaggery/25';
  return (
    <div className="flex items-center justify-center gap-3" aria-hidden>
      <span className={`h-px w-16 ${line}`} />
      <img src="/brand/mandala.png" alt="" className="h-8 w-8 rounded-full object-cover" />
      <span className={`h-px w-16 ${line}`} />
    </div>
  );
}

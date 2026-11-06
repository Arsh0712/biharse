'use client';

import { useEffect, useRef, useState, type ElementType } from 'react';
import { useReducedMotion } from '@/lib/use-reduced-motion';

/** Split-text headline reveal — line by line, staggered, once on first view. */
export function SplitText({
  text,
  className,
  as: Tag = 'h2',
  delay = 0,
  stagger = 0.14,
  highlight,
}: {
  text: string;
  className?: string;
  as?: ElementType;
  delay?: number;
  stagger?: number;
  highlight?: string; // substring to paint in brand red
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [seen, setSeen] = useState(false);
  const reduced = useReducedMotion();
  const shown = reduced || seen;

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);

  const words = text.split(' ');
  let hiWords: string[] = [];
  if (highlight) hiWords = highlight.split(' ');

  return (
    <Tag ref={ref as unknown as ElementType} className={className} aria-label={text}>
      {words.map((w, i) => {
        const isHi = hiWords.some((h) => h && w.includes(h));
        return (
          <span key={`${w}-${i}`} className="inline-block overflow-hidden pb-[0.12em] -mb-[0.12em] align-bottom" aria-hidden>
            <span
              className="inline-block will-change-transform"
              style={{
                transform: shown ? 'translateY(0) rotate(0deg)' : 'translateY(110%) rotate(2deg)',
                opacity: shown ? 1 : 0,
                transition: `transform 0.9s cubic-bezier(0.22,1,0.36,1) ${delay + i * stagger}s, opacity 0.7s ease ${delay + i * stagger}s`,
                color: isHi ? 'var(--brand-red)' : undefined,
              }}
            >
              {w}
            </span>
            <span className="inline-block">&nbsp;</span>
          </span>
        );
      })}
    </Tag>
  );
}

/** Generic in-view reveal (rise + fade) */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 28,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  const reduced = useReducedMotion();
  const shown = reduced || seen;

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'translateY(0)' : `translateY(${y}px)`,
        transition: `opacity 0.8s ease ${delay}s, transform 0.9s cubic-bezier(0.22,1,0.36,1) ${delay}s`,
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </div>
  );
}

/** Count-up number on first view */
export function CountUp({ to, suffix = '', duration = 1.6, className }: { to: number; suffix?: string; duration?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced) {
      // set the final value asynchronously (avoids sync setState in effect)
      const t = setTimeout(() => setVal(to), 0);
      return () => clearTimeout(t);
    }
    let raf = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / (duration * 1000));
          const eased = 1 - Math.pow(1 - p, 3);
          setVal(Math.round(eased * to));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [to, duration, reduced]);

  return (
    <span ref={ref} className={className}>
      {val.toLocaleString('en-IN')}
      {suffix}
    </span>
  );
}

/** Image reveal with curtain wipe */
export function ImageReveal({
  src,
  alt,
  className,
  imgClassName,
  curtain = 'var(--brand-red)',
}: {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  curtain?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  const reduced = useReducedMotion();
  const shown = reduced || seen;

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);

  return (
    <div ref={ref} className={`relative overflow-hidden ${className ?? ''}`}>
      <div
        aria-hidden
        className="absolute inset-0 z-10 origin-bottom"
        style={{
          background: curtain,
          transform: shown ? 'scaleY(0)' : 'scaleY(1)',
          transformOrigin: 'top',
          transition: 'transform 1.1s cubic-bezier(0.76,0,0.24,1)',
        }}
      />
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={imgClassName ?? 'h-full w-full object-cover'}
        style={{
          transform: shown ? 'scale(1)' : 'scale(1.15)',
          transition: 'transform 1.4s cubic-bezier(0.22,1,0.36,1)',
        }}
      />
    </div>
  );
}

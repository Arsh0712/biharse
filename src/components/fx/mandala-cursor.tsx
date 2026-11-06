'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Mandala cursor — desktop (pointer:fine) only.
 * The BiharSe mandala disc IS the pointer: it follows with lag everywhere and
 * the OS cursor is never shown (globals.css keeps `cursor: none` site-wide).
 * It grows slightly over anything clickable for affordance and morphs into a
 * red "Add"/"View" pill over elements carrying [data-cursor="add" | "view"].
 */
export function MandalaCursor() {
  const ref = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<'idle' | 'add' | 'view' | 'press'>('idle');
  const [overClickable, setOverClickable] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    document.documentElement.classList.add('mandala-cursor-active');

    const el = ref.current;
    if (!el) return;
    let x = -100, y = -100, tx = -100, ty = -100, raf = 0;

    /* affordance: grow over anything clickable — the disc never hides and the
     * OS pointer never appears. */
    const CLICKABLE = 'button, a, input, textarea, select, label, summary, [role="button"], [data-cursor-hide]';

    const onMove = (e: MouseEvent) => {
      tx = e.clientX; ty = e.clientY;
      setVisible(true);
      const target = (e.target as HTMLElement)?.closest?.('[data-cursor]');
      const m = target?.getAttribute('data-cursor');
      setMode(m === 'add' || m === 'view' ? m : 'idle');
      setOverClickable(Boolean((e.target as HTMLElement)?.closest?.(CLICKABLE)));
    };
    const onDown = () => setMode((m) => (m === 'idle' ? 'press' : m));
    const onUp = () => setMode((m) => (m === 'press' ? 'idle' : m));
    const onLeave = () => setVisible(false);

    const loop = () => {
      x += (tx - x) * 0.22;
      y += (ty - y) * 0.22;
      el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    document.documentElement.addEventListener('mouseleave', onLeave);

    return () => {
      cancelAnimationFrame(raf);
      document.documentElement.classList.remove('mandala-cursor-active');
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      document.documentElement.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  if (typeof window === 'undefined') return null;

  const showMorph = visible && (mode === 'add' || mode === 'view');

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[100] transition-opacity duration-150"
      style={{ opacity: visible ? 1 : 0 }}
    >
      {showMorph ? (
        <div className="grid h-12 w-12 place-items-center rounded-full bg-brand text-[10px] font-bold uppercase tracking-widest text-cream shadow-[0_10px_24px_-8px_rgba(216,0,24,0.7)] transition-transform duration-200">
          {mode === 'add' ? 'Add' : 'View'}
        </div>
      ) : (
        <div
          className="grid h-8 w-8 place-items-center rounded-full border border-brand/40 bg-cream/80 backdrop-blur-sm transition-transform duration-150"
          style={{ transform: `scale(${mode === 'press' ? 0.72 : overClickable ? 1.3 : 1})` }}
        >
          <img src="/brand/mandala.png" alt="" className="h-5 w-5 rounded-full object-cover" />
        </div>
      )}
    </div>
  );
}

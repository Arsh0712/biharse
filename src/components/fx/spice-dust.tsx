'use client';

import { useEffect, useRef } from 'react';

/**
 * Spice-dust — warm floating particle field (canvas, GPU-cheap).
 * Pauses when off-screen; static fallback under reduced motion.
 */
export function SpiceDust({
  className,
  density = 70,
  colors = ['rgba(255,217,138,0.85)', 'rgba(244,101,42,0.55)', 'rgba(255,246,233,0.5)', 'rgba(216,0,24,0.35)'],
}: {
  className?: string;
  density?: number;
  colors?: string[];
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0, h = 0, raf = 0, running = true;
    const DPR = Math.min(2, window.devicePixelRatio || 1);

    interface P { x: number; y: number; r: number; vx: number; vy: number; c: string; tw: number; }
    let parts: P[] = [];

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = Math.max(1, Math.floor(w * DPR));
      canvas.height = Math.max(1, Math.floor(h * DPR));
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const n = Math.min(density, Math.floor((w * h) / 14000));
      parts = Array.from({ length: n }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.7 + Math.random() * 2.4,
        vx: (Math.random() - 0.5) * 0.22,
        vy: -0.12 - Math.random() * 0.3,
        c: colors[Math.floor(Math.random() * colors.length)],
        tw: Math.random() * Math.PI * 2,
      }));
    };

    const draw = () => {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.x += p.vx; p.y += p.vy; p.tw += 0.02;
        if (p.y < -8) { p.y = h + 8; p.x = Math.random() * w; }
        if (p.x < -8) p.x = w + 8;
        if (p.x > w + 8) p.x = -8;
        const alpha = 0.45 + 0.55 * Math.abs(Math.sin(p.tw));
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.c;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };

    const io = new IntersectionObserver(([e]) => {
      running = e.isIntersecting;
      if (running) { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); }
      else cancelAnimationFrame(raf);
    }, { threshold: 0 });
    io.observe(canvas);

    resize();
    draw();
    window.addEventListener('resize', resize);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, [density, colors]);

  return <canvas ref={ref} aria-hidden className={className ?? 'absolute inset-0 h-full w-full'} />;
}

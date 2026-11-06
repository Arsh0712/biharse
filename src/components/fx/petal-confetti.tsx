'use client';

import { useEffect, useRef } from 'react';

/** Marigold-petal confetti burst. Call `burst()` via ref or fire on mount when `fire` is true. */
export function PetalConfetti({ fire, fireDelay = 400 }: { fire?: boolean; fireDelay?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const burstRef = useRef<() => void>(() => {});

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;
    const DPR = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = w * DPR; canvas.height = h * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    interface Petal {
      x: number; y: number; vx: number; vy: number; rot: number; vr: number;
      w: number; h: number; color: string; life: number;
    }
    let petals: Petal[] = [];
    let raf = 0;
    const colors = ['#f4652a', '#f0a81c', '#ffd98a', '#d80018', '#ffb84d', '#fff6e9'];

    const burst = () => {
      if (reduced) return;
      const originX = w / 2;
      for (let i = 0; i < 90; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 4 + Math.random() * 9;
        petals.push({
          x: originX + (Math.random() - 0.5) * 120,
          y: h * 0.28 + (Math.random() - 0.5) * 40,
          vx: Math.cos(angle) * speed * 0.7,
          vy: Math.sin(angle) * speed - 6,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.25,
          w: 8 + Math.random() * 9,
          h: 5 + Math.random() * 6,
          color: colors[Math.floor(Math.random() * colors.length)],
          life: 1,
        });
      }
      if (!raf) raf = requestAnimationFrame(tick);
    };
    burstRef.current = burst;

    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      petals = petals.filter((p) => p.y < h + 30 && p.life > 0);
      if (petals.length === 0) { raf = 0; return; }
      for (const p of petals) {
        p.vy += 0.22; p.vx *= 0.992; p.vy *= 0.995;
        p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        p.life -= 0.004;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.w / 2, p.h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      raf = requestAnimationFrame(tick);
    };

    const onResize = () => { w = window.innerWidth; h = window.innerHeight; canvas.width = w * DPR; canvas.height = h * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0); };
    window.addEventListener('resize', onResize);

    if (fire) {
      const t = setTimeout(() => burstRef.current(), fireDelay);
      return () => { clearTimeout(t); cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
    }
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
  }, [fire, fireDelay]);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 z-[95]" style={{ width: '100vw', height: '100vh' }} />;
}

'use client';

import { useEffect, useRef, type RefObject } from 'react';

/* ── FlowerFall — delicate festive rain of Bihar's flowers ────────────────
 * Tiny genda florets, madhubani blossoms and loose petals drift down the
 * hero on landing and dissolve away as you scroll into the story.
 * Canvas-rendered from pre-baked gradient sprites: 60fps, GPU-cheap,
 * pauses fully off-screen and honours prefers-reduced-motion. */

type Kind = 'marigold' | 'madhubani' | 'blossom' | 'petal';

interface Sprite { c: HTMLCanvasElement; size: number }

interface Flower {
  sprite: Sprite;
  x: number;        // sway centre
  y: number;        // current top position
  vy: number;       // fall speed px/s
  amp: number;      // sway amplitude px
  freq: number;     // sway Hz
  phase: number;    // sway phase
  rot: number;      // current rotation rad
  vr: number;       // rotation speed rad/s
  scale: number;
  alpha: number;    // individual fade (0→1 on spawn)
  delay: number;    // seconds until it enters
}

const PALETTE: Record<Kind, string[]> = {
  marigold: ['#F0A81C', '#E8890C', '#F4652A'],
  madhubani: ['#D80018', '#F4652A'],
  blossom: ['#FFF6E9', '#FFD98A'],
  petal: ['#F4652A', '#D80018', '#FFD98A'],
};

/** shade helper — blends a colour toward jaggery for depth */
function shade(hex: string, mix: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const dr = Math.round(r + (61 - r) * mix);
  const dg = Math.round(g + (31 - g) * mix);
  const db = Math.round(b + (18 - b) * mix);
  return `rgb(${dr},${dg},${db})`;
}

/** radial-gradient disc — light top-left, shaded rim (soft 3D floret) */
function floret(g: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  const grad = g.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.15, x, y, r);
  grad.addColorStop(0, 'rgba(255,246,233,0.55)');
  grad.addColorStop(0.35, color);
  grad.addColorStop(1, shade(color, 0.32));
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fillStyle = grad;
  g.fill();
}

function buildSprite(kind: Kind, color: string, size = 96): Sprite {
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const g = c.getContext('2d')!;
  const m = size / 2;
  const dark = shade(color, 0.4);

  const petal = (angle: number, dist: number, rx: number, ry: number, fill: string, stroke?: string) => {
    g.save(); g.translate(m, m); g.rotate(angle); g.translate(0, -dist);
    g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    g.fillStyle = fill; g.fill();
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = 1.2; g.stroke(); }
    g.restore();
  };

  if (kind === 'marigold') {
    // genda phool — two rings of plump gradient florets + a warm dark eye
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      floret(g, m + Math.cos(a) * 26, m + Math.sin(a) * 26, 9.5, color);
    }
    for (let i = 0; i < 9; i++) {
      const a = ((i + 0.5) / 9) * Math.PI * 2;
      floret(g, m + Math.cos(a) * 14.5, m + Math.sin(a) * 14.5, 7.6, shade(color, 0.1));
    }
    g.beginPath(); g.arc(m, m, 7, 0, Math.PI * 2);
    const eye = g.createRadialGradient(m - 2, m - 2, 1, m, m, 7);
    eye.addColorStop(0, shade(color, 0.25));
    eye.addColorStop(1, dark);
    g.fillStyle = eye; g.fill();
    g.beginPath(); g.arc(m - 1.8, m - 1.8, 2.2, 0, Math.PI * 2);
    g.fillStyle = 'rgba(255,246,233,0.9)'; g.fill();
  } else if (kind === 'madhubani') {
    // six outlined madhubani petals around a golden heart
    for (let i = 0; i < 6; i++) {
      petal((i / 6) * Math.PI * 2, 19, 9.4, 17.5, color, dark);
      // inner vein line for the folk-art look
      g.save(); g.translate(m, m); g.rotate((i / 6) * Math.PI * 2); g.translate(0, -19);
      g.beginPath(); g.ellipse(0, 0, 3.4, 10.5, 0, 0, Math.PI * 2);
      g.fillStyle = 'rgba(255,246,233,0.28)'; g.fill();
      g.restore();
    }
    g.beginPath(); g.arc(m, m, 8.6, 0, Math.PI * 2); g.fillStyle = shade(color, 0.42); g.fill();
    g.beginPath(); g.arc(m, m, 3.6, 0, Math.PI * 2); g.fillStyle = '#FFD98A'; g.fill();
  } else if (kind === 'blossom') {
    // soft five-petal phool — translucent cream with golden heart
    g.globalAlpha = 0.92;
    for (let i = 0; i < 5; i++) petal((i / 5) * Math.PI * 2, 15.5, 11, 15, color);
    g.globalAlpha = 1;
    g.beginPath(); g.arc(m, m, 6.4, 0, Math.PI * 2); g.fillStyle = '#E8890C'; g.fill();
    g.beginPath(); g.arc(m - 1.6, m - 1.6, 2.4, 0, Math.PI * 2); g.fillStyle = 'rgba(255,246,233,0.9)'; g.fill();
  } else {
    // loose petal drifting on the wind — crescent curve + vein
    g.save(); g.translate(m, m); g.rotate(-0.5);
    const grad = g.createLinearGradient(-11, -20, 11, 20);
    grad.addColorStop(0, color);
    grad.addColorStop(1, shade(color, 0.3));
    g.beginPath(); g.ellipse(0, 0, 10.5, 21, 0, 0, Math.PI * 2);
    g.fillStyle = grad; g.fill();
    g.beginPath(); g.ellipse(0, 2.5, 3.4, 12.5, 0, 0, Math.PI * 2);
    g.fillStyle = shade(color, 0.2); g.fill();
    g.restore();
  }
  return { c, size };
}

export function FlowerFall({ sectionRef }: { sectionRef: RefObject<HTMLElement | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = canvasRef.current;
    const section = sectionRef.current;
    if (!canvas || !section) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // ── sprite set: every kind in the festive palette ──
    const sprites: Sprite[] = [];
    (Object.keys(PALETTE) as Kind[]).forEach((kind) => {
      PALETTE[kind].forEach((col) => sprites.push(buildSprite(kind, col)));
    });

    let w = 0; let h = 0; let dpr = 1;
    const resize = () => {
      const r = section.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(1, Math.round(r.width));
      h = Math.max(1, Math.round(r.height));
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    // ── size window: tiny, delicate blossoms (10–24px on screen) ──
    const rollScale = () => rand(0.11, 0.25);
    const rollVy = () => rand(14, 34);

    const count = Math.min(28, Math.max(14, Math.round(w / 52)));
    const flowers: Flower[] = Array.from({ length: count }, () => ({
      sprite: sprites[Math.floor(Math.random() * sprites.length)],
      x: rand(0.02, 0.98) * w,
      y: -60,
      vy: rollVy(),
      amp: rand(8, 26),
      freq: rand(0.15, 0.45),
      phase: rand(0, Math.PI * 2),
      rot: rand(0, Math.PI * 2),
      vr: rand(-0.55, 0.55),
      scale: rollScale(),
      alpha: 0,
      delay: rand(0, 3.4), // staggered entry — flowers begin dropping on landing
    }));

    let raf = 0;
    let last = performance.now();
    let t = 0;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;

      const rect = section.getBoundingClientRect();
      ctx.clearRect(0, 0, w, h);
      if (rect.bottom <= 0) return; // hero fully scrolled past — sleep

      // fade the whole shower as the hero leaves the viewport
      const globalAlpha = rect.top >= 0 ? 1 : Math.max(0, 1 + rect.top / (rect.height * 0.55));
      if (globalAlpha <= 0) return;

      for (const f of flowers) {
        if (f.delay > 0) { f.delay -= dt; continue; }
        f.alpha = Math.min(1, f.alpha + dt * 1.2);
        f.y += f.vy * dt;
        f.rot += f.vr * dt;
        if (f.y > h + f.sprite.size * f.scale) {
          // recycle back above the sky
          f.y = -f.sprite.size * f.scale - rand(10, 90);
          f.x = rand(0.02, 0.98) * w;
          f.alpha = 0;
          f.sprite = sprites[Math.floor(Math.random() * sprites.length)];
          f.scale = rollScale();
          f.vy = rollVy();
        }
        const sway = Math.sin(t * f.freq * Math.PI * 2 + f.phase) * f.amp;
        const s = f.sprite.size * f.scale;
        ctx.save();
        ctx.globalAlpha = globalAlpha * f.alpha * 0.78; // airy, never dominant
        ctx.translate(f.x + sway, f.y);
        ctx.rotate(f.rot);
        ctx.drawImage(f.sprite.c, -s / 2, -s / 2, s, s);
        ctx.restore();
      }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [sectionRef]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 h-full w-full"
    />
  );
}

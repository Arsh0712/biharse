'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

let registered = false;

export function SmoothScroll({ children }: { children: ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!registered) {
      gsap.registerPlugin(ScrollTrigger);
      registered = true;
    }

    let raf = 0;
    let lenis: Lenis | null = null;
    if (!reduced) {
      lenis = new Lenis({
        duration: 1.15,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        touchMultiplier: 1.6,
      });
      lenisRef.current = lenis;
      lenis.on('scroll', ScrollTrigger.update);
      const loop = (time: number) => {
        lenis?.raf(time);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }

    // scroll direction → nav hide/reappear
    let lastY = 0;
    const onScroll = () => {
      const y = window.scrollY;
      const down = y > lastY && y > 140;
      const st = (window as unknown as { __biharseNavDown?: boolean }).__biharseNavDown;
      if (down !== !!st) {
        (window as unknown as { __biharseNavDown?: boolean }).__biharseNavDown = down;
        window.dispatchEvent(new CustomEvent('biharse:navdir', { detail: down }));
      }
      lastY = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      lenis?.destroy();
      lenisRef.current = null;
    };
  }, []);

  return <>{children}</>;
}

export function scrollTopInstant() {
  window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
}

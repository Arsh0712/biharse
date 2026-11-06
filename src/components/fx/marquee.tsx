'use client';

import { useRef, type ReactNode } from 'react';

/** Infinite marquee — duplicated track, CSS animation, pause on hover. */
export function Marquee({ children, className, speed = 32 }: { children: ReactNode; className?: string; speed?: number }) {
  return (
    <div className={`marquee-paused relative overflow-hidden ${className ?? ''}`} aria-hidden>
      <div
        className="animate-marquee flex w-max items-center gap-8 pr-8"
        style={{ animationDuration: `${speed}s` }}
      >
        <div className="flex items-center gap-8">{children}</div>
        <div className="flex items-center gap-8">{children}</div>
      </div>
    </div>
  );
}

/** Fly-to-cart: clone the clicked product image and arc it into the cart icon. */
export function flyToCart(imgSrc: string, fromEl?: HTMLElement | null) {
  if (typeof window === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const target = document.getElementById('cart-icon-anchor');
  if (!target) return;
  const to = target.getBoundingClientRect();
  const from = fromEl?.getBoundingClientRect();

  const el = document.createElement('div');
  el.style.cssText = `position:fixed;z-index:98;pointer-events:none;width:64px;height:64px;border-radius:1rem;overflow:hidden;box-shadow:0 18px 40px -12px rgba(61,31,18,.5);transition:all .8s cubic-bezier(.45,0,.25,1);left:${(from?.left ?? window.innerWidth / 2) + (from?.width ?? 0) / 2 - 32}px;top:${(from?.top ?? window.innerHeight / 2)}px;`;
  const img = document.createElement('img');
  img.src = imgSrc;
  img.alt = '';
  img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
  el.appendChild(img);
  document.body.appendChild(el);

  requestAnimationFrame(() => {
    el.style.width = '28px';
    el.style.height = '28px';
    el.style.borderRadius = '999px';
    el.style.left = `${to.left + to.width / 2 - 14}px`;
    el.style.top = `${to.top + to.height / 2 - 14}px`;
    el.style.opacity = '0.4';
    el.style.transform = 'scale(0.4)';
  });

  setTimeout(() => {
    el.remove();
    target.dispatchEvent(new CustomEvent('biharse:cartbump'));
  }, 820);
}

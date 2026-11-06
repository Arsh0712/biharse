'use client';

import { useSyncExternalStore } from 'react';

let listeners: (() => void)[] = [];
const mql = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

if (mql) {
  mql.addEventListener('change', () => listeners.forEach((l) => l()));
}

/** Reduced-motion preference, reactive & SSR-safe. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.push(cb);
      return () => { listeners = listeners.filter((l) => l !== cb); };
    },
    () => mql?.matches ?? false,
    () => false,
  );
}

/** Non-reactive check for use inside callbacks/effects. */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

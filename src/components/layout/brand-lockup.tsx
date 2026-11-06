'use client';

import Image from 'next/image';

/** Typeset BiharSe lockup — mandala badge (supplied asset) + wordmark + बिहारसे. */
export function BrandLockup({
  variant = 'light',
  className,
  size = 34,
  onClick,
}: {
  variant?: 'light' | 'dark'; // light = for light backgrounds (ink text), dark = for dark backgrounds (cream text)
  className?: string;
  size?: number;
  onClick?: () => void;
}) {
  const word = variant === 'dark' ? 'text-cream' : 'text-ink';
  return (
    <button
      onClick={onClick}
      className={`group flex items-center gap-2.5 ${className ?? ''}`}
      aria-label="BiharSe — go to home"
      data-cursor="view"
    >
      <span className="relative shrink-0 transition-transform duration-500 group-hover:rotate-12">
        <Image src="/brand/mandala.png" alt="BiharSe mandala — बि" width={size} height={size} priority className="rounded-full object-cover" />
      </span>
      <span className="relative flex flex-col items-start leading-none">
        <span className="font-dev-display absolute -top-[0.72em] right-0 text-[0.62em] text-brand">{variant === 'dark' ? 'बिहारसे' : 'बिहारसे'}</span>
        <span className={`font-sans text-[1.5em] font-extrabold tracking-tight ${word}`}>
          bihar<span className="text-brand">se</span>
        </span>
      </span>
    </button>
  );
}

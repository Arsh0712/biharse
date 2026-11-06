'use client';

import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { Sparkles, Copy, Check, TriangleAlert } from 'lucide-react';
import { useSettings } from '@/lib/store';

/** Announcement ticker — signature line + BIHARSE15 click-to-copy. */
export function AnnouncementBar() {
  const settings = useSettings((s) => s.data);
  const [copied, setCopied] = useState(false);
  const a = settings?.announcement;

  // Off / not configured yet — collapse fully; the hero starts flush at the top
  // and the floating nav sits at its 10px resting position.
  if (!a?.active || !a.code) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(a.code);
      setCopied(true);
      toast({ title: 'Code copied', description: `${a.code} — apply it at checkout`, duration: 2400 });
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard denied */ }
  };

  return (
    <div id="announcement-bar" className="relative z-40 w-full overflow-hidden bg-jaggery text-cream" role="region" aria-label="Announcement">
      <div className="mx-auto flex h-9 max-w-7xl items-center justify-center gap-3 px-3 text-[12.5px] tracking-wide">
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-turmeric" aria-hidden />
        <span className="truncate font-dev-body text-[13.5px]">{a.textHi}</span>
        <span className="hidden sm:inline" aria-hidden>·</span>
        <button
          onClick={copy}
          className="group flex shrink-0 items-center gap-1.5 rounded-full border border-turmeric/50 bg-turmeric/15 px-2.5 py-0.5 font-mono text-[11.5px] font-bold text-turmeric-soft transition-colors hover:bg-turmeric/30"
          aria-label={`Copy coupon code ${a.code} for ${a.discount}`}
        >
          {a.code}
          <span className="hidden md:inline font-sans font-semibold">· {a.discount}</span>
          {copied ? <Check className="h-3 w-3" aria-hidden /> : <Copy className="h-3 w-3 opacity-60 transition-opacity group-hover:opacity-100" aria-hidden />}
        </button>
        <span className="hidden items-center gap-1 rounded-full bg-brand/25 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-cream/90 sm:flex">
          <TriangleAlert className="h-3 w-3" aria-hidden />
          {a.note}
        </span>
      </div>
    </div>
  );
}

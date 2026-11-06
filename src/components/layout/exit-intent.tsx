'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { X, TicketPercent, Copy, Check } from 'lucide-react';
import { useUi } from '@/lib/store';
import { useSettings } from '@/lib/store';
import { toast } from '@/hooks/use-toast';

/** Exit-intent offer — desktop mouseleave top, once per session, dismissible, feature-flagged. */
export function ExitIntent() {
  const overlay = useUi((s) => s.overlay);
  const setOverlay = useUi((s) => s.setOverlay);
  const navigate = useUi((s) => s.navigate);
  const flags = useSettings((s) => s.data?.flags);
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!flags?.exitIntent) return;
    if (sessionStorage.getItem('biharse-exit-shown')) return;
    if (window.matchMedia('(pointer: coarse)').matches) return; // mobile: no exit intent

    const onLeave = (e: MouseEvent) => {
      if (e.clientY <= 8) {
        setShow(true);
        sessionStorage.setItem('biharse-exit-shown', '1');
        document.removeEventListener('mouseout', onLeave);
      }
    };
    // small delay so first-load jitter doesn't trigger it
    const t = setTimeout(() => document.addEventListener('mouseout', onLeave), 4000);
    return () => { clearTimeout(t); document.removeEventListener('mouseout', onLeave); };
  }, [flags?.exitIntent]);

  const dismiss = () => setShow(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText('BIHARSE15');
      setCopied(true);
      toast({ title: 'Code copied!', description: 'BIHARSE15 — apply at checkout for 15% off' });
    } catch { /* noop */ }
  };

  return (
    <AnimatePresence>
      {(show || overlay === 'exitoffer') && (
        <motion.div className="fixed inset-0 z-[80] grid place-items-center bg-jaggery/60 px-4 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={dismiss} role="dialog" aria-modal="true" aria-label="Offer">
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="relative w-full max-w-md overflow-hidden rounded-[2rem] bg-card text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sunrise-gradient relative px-8 pb-16 pt-10 text-cream">
              <button onClick={dismiss} className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-black/20 text-cream" aria-label="Close offer">
                <X className="h-4 w-4" />
              </button>
              <Image src="/brand/mandala.png" alt="" width={64} height={64} className="mx-auto rounded-full shadow-lg" />
            </div>
            <div className="px-8 pb-8 pt-[-2rem]">
              <p className="font-dev-display -mt-10 text-2xl text-ink drop-shadow-sm">रुकिए! 🪔</p>
              <h2 className="font-display mt-2 text-2xl font-semibold text-ink">Before you go —</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-jaggery-2">
                take <b className="text-brand">15% off</b> your first order of fresh thekua. Limited stock from today&apos;s batch.
              </p>
              <button onClick={copy} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand/50 bg-brand/5 py-3.5 font-mono text-lg font-bold text-brand transition hover:bg-brand/10">
                <TicketPercent className="h-5 w-5" /> BIHARSE15
                {copied ? <Check className="h-4 w-4 text-jaggery-2" /> : <Copy className="h-4 w-4 opacity-60" />}
              </button>
              <button onClick={() => { dismiss(); navigate('shop'); }} className="btn-primary mt-4 w-full">
                Shop with 15% off
              </button>
              <button onClick={dismiss} className="mt-3 text-[13px] text-muted-foreground underline underline-offset-2 hover:text-ink">
                No thanks, I&apos;ll pay full price
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

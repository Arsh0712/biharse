'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Loader2, Package, Heart, ArrowRight, Sparkles, User } from 'lucide-react';
import { useUi, useAuth } from '@/lib/store';
import { api, pick } from '@/lib/api';
import { formatINR } from '@/lib/money';
import type { Product } from '@/lib/types';

/** ⌘K command palette — instant product search + quick navigation. Remounts on open to reset state. */
export function CommandPalette() {
  const overlay = useUi((s) => s.overlay);
  if (overlay !== 'search') return null;
  return <CommandInner key="search-open" />;
}

function CommandInner() {
  const overlay = useUi((s) => s.overlay);
  const setOverlay = useUi((s) => s.setOverlay);
  const navigate = useUi((s) => s.navigate);
  const lang = useUi((s) => s.lang);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const displayResults = q.trim() ? results : [];
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOverlay('search');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setOverlay]);

  useEffect(() => {
    if (!q.trim()) return;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const j = await api<{ products: Product[] }>(`/api/products?q=${encodeURIComponent(q)}&perPage=8`);
        setResults(j.products);
      } catch { /* ignore */ }
      setLoading(false);
    }, 220);
    return () => clearTimeout(t);
  }, [q, overlay]);

  const go = (fn: () => void) => { setOverlay(null); fn(); };

  return (
    <AnimatePresence>
      {overlay === 'search' && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-start justify-center bg-jaggery/55 px-4 pt-[14vh] backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={() => setOverlay(null)}
          role="dialog" aria-modal="true" aria-label="Search"
        >
          <motion.div
            initial={{ opacity: 0, y: -14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-xl overflow-hidden rounded-3xl border border-line-warm bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Command shouldFilter={false} className="w-full">
              <div className="flex items-center gap-3 border-b border-line-warm px-5 py-4">
                <Search className="h-4.5 w-4.5 text-jaggery-2" aria-hidden />
                <Command.Input
                  autoFocus
                  value={q}
                  onValueChange={setQ}
                  placeholder="Search thekua…"
                  className="w-full bg-transparent text-[15px] font-medium outline-none placeholder:text-muted-foreground"
                />
                {loading && <Loader2 className="h-4 w-4 animate-spin text-brand" />}
                <kbd className="hidden rounded-md border border-line-warm px-1.5 py-0.5 text-[10px] text-muted-foreground sm:block">ESC</kbd>
              </div>
              <Command.List className="scroll-warm max-h-[46vh] overflow-y-auto p-2">
                <Command.Empty className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {q ? 'Nothing found — try "thekua" or "gur"' : 'Type to search, or jump below'}
                </Command.Empty>

                {displayResults.length > 0 && (
                  <Command.Group heading="Products" className="px-1 py-1">
                    {displayResults.map((p) => (
                      <Command.Item
                        key={p.slug}
                        onSelect={() => go(() => navigate('product', { slug: p.slug }))}
                        className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 data-[selected=true]:bg-cream-2"
                      >
                                      <img src={p.images[0]} alt="" className="h-11 w-11 rounded-lg object-cover" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{pick(lang, p.nameEn, p.nameHi)}</span>
                          <span className="block truncate text-xs text-muted-foreground">{p.taglineEn}</span>
                        </span>
                        <span className="text-sm font-bold text-brand">{formatINR(p.price)}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                <Command.Group heading="Go to" className="px-1 pb-1 pt-1 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground">
                  {[
                    { label: 'Shop all products', icon: Package, fn: () => navigate('shop') },
                    { label: 'About Chhath Puja', icon: Sparkles, fn: () => navigate('chhath') },
                    { label: 'Rituals & live countdown', icon: Sparkles, fn: () => navigate('rituals') },
                    { label: 'Track an order', icon: ArrowRight, fn: () => navigate('track') },
                    { label: 'My wishlist', icon: Heart, fn: () => navigate('wishlist') },
                    { label: 'My account', icon: User, fn: () => navigate('account') },
                  ].map((x) => (
                    <Command.Item key={x.label} onSelect={() => go(x.fn)} className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium data-[selected=true]:bg-cream-2">
                      <x.icon className="h-4 w-4 text-jaggery-2" /> {x.label}
                    </Command.Item>
                  ))}
                </Command.Group>
              </Command.List>
            </Command>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// keep router import referenced (palette may deep-link later)
void useRouter;

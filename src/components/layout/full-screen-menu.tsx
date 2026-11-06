'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { X, Home, Store, Sparkles, Clock, BookOpen, Mail, User, ShoppingBag, Heart, Package } from 'lucide-react';
import { useUi, useAuth, useCart, useWishlist, type View } from '@/lib/store';

/** Mobile full-screen menu — staggered reveal with Mithila backdrop */
export function FullScreenMenu() {
  const overlay = useUi((s) => s.overlay);
  const setOverlay = useUi((s) => s.setOverlay);
  const navigate = useUi((s) => s.navigate);
  const user = useAuth((s) => s.user);
  const cartCount = useCart((s) => s.lines.reduce((a, l) => a + l.qty, 0));
  const wishCount = useWishlist((s) => s.slugs.length);

  const go = (v: View) => { setOverlay(null); navigate(v); };

  const items: { label: string; hi: string; icon: React.ElementType; fn: () => void; count?: number }[] = [
    { label: 'Home', hi: 'होम', icon: Home, fn: () => go('home') },
    { label: 'Shop', hi: 'दुकान', icon: Store, fn: () => go('shop'), count: cartCount },
    { label: 'Chhath Puja', hi: 'छठ पूजा', icon: Sparkles, fn: () => go('chhath') },
    { label: 'Rituals & Dates', hi: 'विधियाँ', icon: Clock, fn: () => go('rituals') },
    { label: 'Our Story', hi: 'हमारी कहानी', icon: BookOpen, fn: () => go('story') },
    { label: 'Contact', hi: 'संपर्क', icon: Mail, fn: () => go('contact') },
    { label: 'My Orders', hi: 'ऑर्डर', icon: Package, fn: () => go(user ? 'orders' : 'account') },
    { label: 'Wishlist', hi: 'पसंदीदा', icon: Heart, fn: () => go('wishlist'), count: wishCount },
    { label: user ? 'My Account' : 'Sign in', hi: 'खाता', icon: User, fn: () => go('account') },
  ];

  return (
    <AnimatePresence>
      {overlay === 'menu' && (
        <motion.div className="fixed inset-0 z-[75] overflow-hidden bg-jaggery text-cream lg:hidden"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} data-theme="dark" role="dialog" aria-modal="true" aria-label="Menu">
          {/* Mithila backdrop: giant mandala + madhubani motifs */}
          <Image src="/brand/mandala.png" alt="" width={700} height={700} className="pointer-events-none absolute -bottom-40 -right-40 animate-spin-slow rounded-full opacity-15" />
          <Image src="/brand/mandala.png" alt="" width={340} height={340} className="pointer-events-none absolute -left-24 top-24 rounded-full opacity-10" />

          <div className="relative flex items-center justify-between px-6 py-5">
            <Image src="/brand/lockup-dark.png" alt="BiharSe" width={130} height={41} className="w-28" />
            <button onClick={() => setOverlay(null)} className="grid h-11 w-11 place-items-center rounded-full bg-cream/10" aria-label="Close menu">
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="relative mt-6 px-6">
            <ul className="space-y-1.5">
              {items.map((it, i) => (
                <motion.li
                  key={it.label}
                  initial={{ opacity: 0, x: -28 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: 0.05 + i * 0.045, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                >
                  <button
                    onClick={it.fn}
                    className="flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-left transition-colors hover:bg-cream/8 active:bg-cream/15"
                  >
                    <span className="flex items-center gap-3.5">
                      <span className="grid h-10 w-10 place-items-center rounded-full bg-brand/20 text-turmeric-soft">
                        <it.icon className="h-4.5 w-4.5" />
                      </span>
                      <span>
                        <span className="block text-[17px] font-semibold">{it.label}</span>
                        <span className="font-dev-body block text-[13px] text-turmeric-soft/80">{it.hi}</span>
                      </span>
                    </span>
                    {typeof it.count === 'number' && it.count > 0 && (
                      <span className="grid h-6 min-w-6 place-items-center rounded-full bg-brand px-1.5 text-[11px] font-bold">{it.count}</span>
                    )}
                  </button>
                </motion.li>
              ))}
            </ul>
            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}
              className="font-dev-display mt-10 text-center text-xl text-turmeric/90"
            >
              माटी, ममता आ नव वर्ष — सब एक संग
            </motion.p>
          </nav>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

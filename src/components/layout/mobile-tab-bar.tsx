'use client';

import { motion } from 'framer-motion';
import { Home, Store, Search, Heart, ShoppingBag } from 'lucide-react';
import { useUi, useCart, useWishlist, useAuth } from '@/lib/store';

/** Mobile glass bottom tab bar */
export function MobileTabBar() {
  const navigate = useUi((s) => s.navigate);
  const view = useUi((s) => s.view);
  const setOverlay = useUi((s) => s.setOverlay);
  const cartCount = useCart((s) => s.lines.reduce((a, l) => a + l.qty, 0));
  const wishCount = useWishlist((s) => s.slugs.length);
  const user = useAuth((s) => s.user);

  const tabs = [
    { id: 'home' as const, label: 'Home', icon: Home, onClick: () => navigate('home'), active: view === 'home' },
    { id: 'shop' as const, label: 'Shop', icon: Store, onClick: () => navigate('shop'), active: view === 'shop' || view === 'product' },
    { id: 'search' as const, label: 'Search', icon: Search, onClick: () => setOverlay('search'), active: false },
    { id: 'wish' as const, label: 'Saved', icon: Heart, onClick: () => navigate('wishlist'), active: view === 'wishlist', badge: wishCount },
    { id: 'cart' as const, label: 'Cart', icon: ShoppingBag, onClick: () => setOverlay('cart'), active: false, badge: cartCount },
  ];

  return (
    <nav
      aria-label="Mobile"
      className="glass fixed inset-x-3 bottom-3 z-50 flex items-center justify-around rounded-3xl px-2 py-1.5 lg:hidden"
      style={{ paddingBottom: 'max(6px, env(safe-area-inset-bottom, 6px))' }}
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={t.onClick}
          aria-label={t.label}
          aria-current={t.active ? 'page' : undefined}
          className="relative flex min-h-[48px] min-w-[52px] flex-col items-center justify-center gap-0.5 rounded-2xl px-1"
        >
          {t.active && (
            <motion.span layoutId="tabbar-pill" className="absolute inset-0 rounded-2xl bg-brand/12" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
          )}
          <span className="relative">
            <t.icon className={`h-5 w-5 ${t.active ? 'text-brand' : 'text-ink/70'}`} strokeWidth={t.active ? 2.4 : 1.8} />
            {typeof t.badge === 'number' && t.badge > 0 && (
              <span className="absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[9.5px] font-bold text-cream">
                {t.badge}
              </span>
            )}
            {t.id === 'wish' && !user && t.badge === 0 ? null : null}
          </span>
          <span className={`text-[9.5px] font-semibold tracking-wide ${t.active ? 'text-brand' : 'text-ink/55'}`}>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}

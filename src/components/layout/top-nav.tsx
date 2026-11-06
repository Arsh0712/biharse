'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Heart, User, ShoppingBag, Menu } from 'lucide-react';
import { useUi, useCart, useWishlist, useAuth, useSettings, type View } from '@/lib/store';
import { BrandLockup } from './brand-lockup';
import { toast } from '@/hooks/use-toast';

const LINKS: { view: View; label: string }[] = [
  { view: 'home', label: 'Home' },
  { view: 'shop', label: 'Shop' },
  { view: 'chhath', label: 'Chhath' },
  { view: 'rituals', label: 'Rituals' },
  { view: 'story', label: 'Our Story' },
  { view: 'contact', label: 'Contact' },
];

/** Floating glassmorphism nav — centered pill, blur(18px) saturate(160%), sliding red
 *  hover indicator, hides on scroll-down / reappears on scroll-up, adapts to dark sections.
 *  Docks BELOW the announcement ticker while it is on screen, then glides to the top edge. */
const TOP_BASE = 10;
const TICKER_GAP = 8;
const TICKER_FALLBACK_H = 36;

export function TopNav() {
  const navigate = useUi((s) => s.navigate);
  const view = useUi((s) => s.view);
  const setOverlay = useUi((s) => s.setOverlay);
  const cartCount = useCart((s) => s.lines.reduce((a, l) => a + l.qty, 0));
  const wishlistCount = useWishlist((s) => s.slugs.length);
  const user = useAuth((s) => s.user);
  const tickerActive = useSettings((s) => Boolean(s.data?.announcement?.active));

  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [onDark, setOnDark] = useState(false);
  const [bump, setBump] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [docked, setDocked] = useState(true);
  const [tickerH, setTickerH] = useState(tickerActive ? TICKER_FALLBACK_H : 0);
  const tickerHRef = useRef(tickerActive ? TICKER_FALLBACK_H : 0);
  const barRef = useRef<HTMLElement>(null);

  // measure the live ticker height (falls back to 0 when inactive)
  useEffect(() => {
    const measure = () => {
      const h = tickerActive ? (document.getElementById('announcement-bar')?.offsetHeight ?? TICKER_FALLBACK_H) : 0;
      tickerHRef.current = h;
      setTickerH(h);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [tickerActive]);

  useEffect(() => {
    const onDir = (e: Event) => setHidden((e as CustomEvent<boolean>).detail);
    window.addEventListener('biharse:navdir', onDir);
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 24);
      // dock below the ticker while it is visible, glide to the top edge after
      setDocked(tickerHRef.current > 0 && y <= tickerHRef.current);
      // detect the section sitting directly beneath the pill (probe just past its bottom edge)
      const off = tickerHRef.current > 0 && y <= tickerHRef.current ? tickerHRef.current + TICKER_GAP : TOP_BASE;
      const el = document.elementFromPoint(window.innerWidth / 2, off + 76);
      const section = el?.closest('[data-theme="dark"]');
      setOnDark(Boolean(section));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('biharse:navdir', onDir);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  // cart bump animation on add
  useEffect(() => {
    const onBump = () => {
      setBump(true);
      setTimeout(() => setBump(false), 650);
    };
    const anchor = document.getElementById('cart-icon-anchor');
    anchor?.addEventListener('biharse:cartbump', onBump);
    return () => anchor?.removeEventListener('biharse:cartbump', onBump);
  }, [cartCount]);

  const go = (v: View) => {
    if (v === 'account' && !useAuth.getState().user) {
      setOverlay('auth');
      return;
    }
    navigate(v);
  };

  const topOffset = tickerH > 0 && docked ? tickerH + TICKER_GAP : TOP_BASE;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-50 flex justify-center px-3 transition-[top,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:px-4"
      style={{ top: topOffset, transform: hidden ? 'translateY(-130%)' : 'translateY(0)' }}
    >
      <nav
        ref={barRef}
        className={`pointer-events-auto flex w-full max-w-5xl items-center justify-between gap-2 rounded-full px-3 py-2 transition-all duration-500 ${onDark ? 'glass-dark' : 'glass'} ${scrolled ? 'scale-[0.985] bg-opacity-90' : ''}`}
        aria-label="Primary"
      >
        {/* Left — lockup */}
        <BrandLockup variant={onDark ? 'dark' : 'light'} onClick={() => navigate('home')} className="shrink-0 pl-1 text-[13px]" />

        {/* Centre — links with sliding pill */}
        <ul className="hidden items-center lg:flex" role="list">
          {LINKS.map((l) => (
            <li key={l.view} className="relative">
              <button
                onMouseEnter={() => setHovered(l.view)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => go(l.view)}
                aria-current={view === l.view ? 'page' : undefined}
                className={`relative rounded-full px-4 py-2 text-[13.5px] font-semibold transition-colors ${onDark ? 'text-cream/85 hover:text-cream' : 'text-ink/80 hover:text-ink'} ${view === l.view ? (onDark ? 'text-cream' : 'text-cream') : ''}`}
              >
                {(hovered === l.view || view === l.view) && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-full bg-brand shadow-[0_8px_20px_-8px_rgba(216,0,24,0.6)]"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  />
                )}
                <span className="relative z-10">{l.label}</span>
              </button>
            </li>
          ))}
        </ul>

        {/* Right — actions */}
        <div className="flex items-center gap-0.5 pr-1">
          <IconBtn label="Search (Ctrl+K)" onClick={() => setOverlay('search')} dark={onDark}>
            <Search className="h-[18px] w-[18px]" />
          </IconBtn>
          <IconBtn label="Wishlist" onClick={() => go('wishlist')} dark={onDark} badge={wishlistCount}>
            <Heart className="h-[18px] w-[18px]" />
          </IconBtn>
          <IconBtn label={user ? `Account — ${user.name}` : 'Sign in'} onClick={() => go('account')} dark={onDark}>
            {user ? (
              <span className="grid h-[18px] w-[18px] place-items-center rounded-full bg-brand text-[10px] font-bold text-cream" aria-hidden>
                {user.name.slice(0, 1).toUpperCase()}
              </span>
            ) : (
              <User className="h-[18px] w-[18px]" />
            )}
          </IconBtn>
          <span id="cart-icon-anchor" className="relative inline-flex">
            <IconBtn label={`Cart — ${cartCount} items`} onClick={() => setOverlay('cart')} dark={onDark} badge={cartCount} bump={bump}>
              <ShoppingBag className="h-[18px] w-[18px]" />
            </IconBtn>
          </span>
          <IconBtn label="Menu" onClick={() => setOverlay('menu')} dark={onDark} className="lg:hidden">
            <Menu className="h-[18px] w-[18px]" />
          </IconBtn>
        </div>
      </nav>
    </div>
  );
}

function IconBtn({
  children, label, onClick, dark, badge, bump, className,
}: {
  children: React.ReactNode; label: string; onClick?: () => void; dark?: boolean; badge?: number; bump?: boolean; className?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`relative grid h-10 w-10 place-items-center rounded-full transition-all duration-200 hover:scale-105 active:scale-95 ${dark ? 'text-cream/85 hover:bg-cream/10' : 'text-ink/75 hover:bg-jaggery/8'} ${className ?? ''}`}
    >
      {children}
      {typeof badge === 'number' && badge > 0 && (
        <motion.span
          key={badge}
          initial={{ scale: 0.4 }}
          animate={{ scale: bump ? [1, 1.45, 1] : 1 }}
          className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-brand px-1 text-[10.5px] font-bold text-cream shadow"
        >
          {badge > 99 ? '99+' : badge}
        </motion.span>
      )}
    </button>
  );
}

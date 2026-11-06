'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';
import { useUi, useAuth, useSettings, useProductCache, View } from '@/lib/store';
import { POLICIES } from '@/lib/section-data';
import { SmoothScroll } from '@/components/fx/smooth-scroll';
import { MandalaCursor } from '@/components/fx/mandala-cursor';
import { AnnouncementBar } from '@/components/layout/announcement-bar';
import { TopNav } from '@/components/layout/top-nav';
import { MobileTabBar } from '@/components/layout/mobile-tab-bar';
import { Footer } from '@/components/layout/footer';
import { CommandPalette } from '@/components/layout/command-palette';
import { AuthModal } from '@/components/layout/auth-modal';
import { FullScreenMenu } from '@/components/layout/full-screen-menu';
import { ExitIntent } from '@/components/layout/exit-intent';
import { CartDrawer } from '@/components/cart/cart-drawer';
import { QuickViewModal } from '@/components/shop/quick-view';
import { ConsentGate } from '@/components/layout/consent-gate';
import { MusicToggle } from '@/components/layout/music-toggle';
import { MandalaLoader } from '@/components/layout/consent-gate';

// views — code-split
const HomeView = dynamic(() => import('@/components/home/home-view'), { ssr: false });
const ShopView = dynamic(() => import('@/components/shop/shop-view'), { ssr: false, loading: () => <ViewSkeleton /> });
const PdpView = dynamic(() => import('@/components/product/pdp-view'), { ssr: false, loading: () => <ViewSkeleton /> });
const CheckoutView = dynamic(() => import('@/components/cart/checkout-view'), { ssr: false });
const SuccessView = dynamic(() => import('@/components/cart/success-view'), { ssr: false });
const ChhathView = dynamic(() => import('@/components/pages/chhath-view'), { ssr: false });
const RitualsView = dynamic(() => import('@/components/pages/rituals-view'), { ssr: false });
const StoryView = dynamic(() => import('@/components/pages/story-view'), { ssr: false });
const ContactView = dynamic(() => import('@/components/pages/contact-view'), { ssr: false });
const PolicyView = dynamic(() => import('@/components/pages/policy-view'), { ssr: false });
const TrackView = dynamic(() => import('@/components/pages/track-view'), { ssr: false });
const AccountView = dynamic(() => import('@/components/account/account-view'), { ssr: false });
const OrdersView = dynamic(() => import('@/components/account/orders-view'), { ssr: false });
const WishlistView = dynamic(() => import('@/components/account/wishlist-view'), { ssr: false });
const AdminView = dynamic(() => import('@/components/admin/admin-view'), { ssr: false });

function ViewSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-32">
      <div className="skeleton h-10 w-64 rounded-full" />
      <div className="mt-8 grid grid-cols-2 gap-6 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton aspect-[4/5] rounded-3xl" />
        ))}
      </div>
    </div>
  );
}

const VIEW_TRANSITION = { duration: 0.42, ease: [0.22, 1, 0.36, 1] as const };

/* ── SEO: canonical base, titles, JSON-LD ─────────────────────────────
   The single-route storefront renders views client-side, so the canonical
   link, document title and BreadcrumbList JSON-LD are kept in sync with the
   active view here. The base URL is captured once from the canonical link
   that Next metadata (layout.tsx, SITE_URL pattern) rendered on the server —
   never from the preview origin. */
let CANONICAL_BASE: string | null = null;

function canonicalBase(): string {
  if (CANONICAL_BASE) return CANONICAL_BASE;
  if (typeof document !== 'undefined') {
    const rendered = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.getAttribute('href');
    if (rendered) {
      CANONICAL_BASE = rendered.replace(/\/+$/, '');
      return CANONICAL_BASE;
    }
  }
  // Matches the layout.tsx SITE_URL fallback for the no-SSR-canonical edge case.
  CANONICAL_BASE = 'https://biharse.org';
  return CANONICAL_BASE;
}

const VIEW_TITLES: Partial<Record<View, string>> = {
  home: 'BiharSe — Order Fresh & Authentic Thekua From Bihar',
  shop: 'Shop All — BiharSe',
  chhath: 'About Chhath Puja — BiharSe',
  rituals: 'Chhath Rituals & Dates — BiharSe',
  story: 'Our Story — BiharSe',
  contact: 'Contact Us — BiharSe',
  track: 'Track Your Order — BiharSe',
  checkout: 'Secure Checkout — BiharSe',
  success: 'Order Confirmed — BiharSe',
  account: 'My Account — BiharSe',
  orders: 'My Orders — BiharSe',
  wishlist: 'My Wishlist — BiharSe',
  admin: 'Staff Admin — BiharSe',
};

/** Canonical per active view — mirrors urlFor() shapes. Null = not for indexing. */
function canonicalFor(view: View, params: { slug?: string; policySlug?: string }): string | null {
  const base = canonicalBase();
  switch (view) {
    case 'home': return base;
    case 'shop': return `${base}/?v=shop`;
    case 'product': return params.slug ? `${base}/?v=product&p=${params.slug}` : null;
    case 'policy': return `${base}/?v=policy&page=${params.policySlug || 'privacy'}`;
    case 'chhath':
    case 'rituals':
    case 'story':
    case 'contact':
    case 'track':
      return `${base}/?v=${view}`;
    default:
      // checkout / success / account / orders / wishlist / admin — ephemeral or gated
      return null;
  }
}

/** Site-level WebSite schema — SearchAction targets the shop view's q param. */
function websiteJsonLd(): string {
  const base = canonicalBase();
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'BiharSe',
    alternateName: 'बिहारसे',
    url: base,
    inLanguage: ['en-IN', 'hi-IN'],
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${base}/?v=shop&q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  });
}

export function AppShell() {
  const view = useUi((s) => s.view);
  const params = useUi((s) => s.params);
  const lang = useUi((s) => s.lang);
  const syncFromUrl = useUi((s) => s.syncFromUrl);
  const loadUser = useAuth((s) => s.load);
  const loadSettings = useSettings((s) => s.load);
  const settingsReady = useSettings((s) => Boolean(s.data));
  const settingsDegraded = useSettings((s) => s.degraded);
  const retrySettings = useSettings((s) => s.retry);
  // PDP title/breadcrumb need the product name — comes from the client product cache.
  const pdpProduct = useProductCache((s) => (view === 'product' && params.slug ? s.map[params.slug] : undefined));
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    syncFromUrl();
    loadUser();
    loadSettings();
    const t = setTimeout(() => setBooted(true), 550);
    return () => clearTimeout(t);
  }, [syncFromUrl, loadUser, loadSettings]);

  useEffect(() => {
    const onPop = () => syncFromUrl();
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [syncFromUrl]);

  /* ── <html lang> mirrors the active UI language (a11y + crawlers) ── */
  useEffect(() => {
    document.documentElement.lang = lang === 'hi' ? 'hi' : 'en';
  }, [lang]);

  /* ── per-view document title + canonical link ── */
  useEffect(() => {
    let title = VIEW_TITLES[view];
    if (view === 'product') title = pdpProduct ? `${pdpProduct.nameEn} — BiharSe` : 'Shop All — BiharSe';
    if (view === 'policy') {
      const pt = POLICIES[params.policySlug || 'privacy']?.title;
      title = `${pt || 'Policy'} — BiharSe`;
    }
    document.title = title || 'BiharSe';

    const href = canonicalFor(view, params);
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (href) {
      if (!link) {
        link = document.createElement('link');
        link.rel = 'canonical';
        document.head.appendChild(link);
      }
      link.href = href;
    } else {
      // Ephemeral/gated view — drop the SSR'd canonical rather than point it at the wrong page.
      link?.remove();
    }
  }, [view, params, pdpProduct?.nameEn]);

  /* ── BreadcrumbList JSON-LD: one script tag, rewritten as the view changes ── */
  useEffect(() => {
    const base = canonicalBase();
    const home = { '@type': 'ListItem', position: 1, name: 'Home', item: base };
    const shop = { '@type': 'ListItem', position: 2, name: 'Shop', item: `${base}/?v=shop` };
    let list: Array<{ '@type': string; position: number; name: string; item: string }> | null = null;
    if (view === 'shop') {
      list = [home, shop];
    } else if (view === 'product' && params.slug) {
      list = [
        home,
        shop,
        { '@type': 'ListItem', position: 3, name: pdpProduct?.nameEn || params.slug, item: `${base}/?v=product&p=${params.slug}` },
      ];
    }
    const id = 'biharse-breadcrumb-ld';
    let el = document.getElementById(id) as HTMLScriptElement | null;
    if (!list) {
      el?.remove();
      return;
    }
    if (!el) {
      el = document.createElement('script');
      el.id = id;
      el.type = 'application/ld+json';
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: list });
  }, [view, params.slug, pdpProduct?.nameEn]);

  const viewKey = `${view}:${params.slug ?? ''}:${params.policySlug ?? ''}:${params.orderNumber ?? ''}`;

  /* The back office renders as its own full-screen app — no storefront chrome. */
  if (view === 'admin') {
    return (
      <div className="min-h-screen">
        {booted && settingsReady ? <AdminView /> : <MandalaLoader />}
        <ConsentGate />
      </div>
    );
  }

  if (!booted || !settingsReady) {
    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: websiteJsonLd() }}
        />
        <MandalaLoader />
      </>
    );
  }

  return (
    <SmoothScroll>
      <div className="grain flex min-h-screen flex-col">
        {/* Site-level WebSite schema (incl. SearchAction → /?v=shop&q={search_term_string}) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: websiteJsonLd() }}
        />
        {/* Degraded mode — live data unreachable; offline preview is shown.
            Auto-dismisses the moment the API recovers. */}
        {settingsDegraded && (
          <div
            role="status"
            aria-live="polite"
            className="fixed inset-x-3 bottom-[68px] z-[45] flex items-center justify-center gap-3 rounded-full bg-jaggery px-4 py-2 text-[12px] font-semibold text-cream shadow-lg lg:inset-x-auto lg:bottom-4 lg:left-1/2 lg:-translate-x-1/2"
          >
            <span>Live kitchen data couldn&apos;t load — browsing offline preview</span>
            <button
              onClick={retrySettings}
              className="rounded-full bg-cream px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-jaggery transition-transform hover:scale-105"
            >
              Retry
            </button>
          </div>
        )}
        <AnnouncementBar />
        <TopNav />
        <main className="flex-1" id="main">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={viewKey}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={VIEW_TRANSITION}
            >
              {view === 'home' && <HomeView />}
              {view === 'shop' && <ShopView />}
              {view === 'product' && params.slug && <PdpView slug={params.slug} />}
              {view === 'checkout' && <CheckoutView />}
              {view === 'success' && <SuccessView orderNumber={params.orderNumber} />}
              {view === 'chhath' && <ChhathView />}
              {view === 'rituals' && <RitualsView />}
              {view === 'story' && <StoryView />}
              {view === 'contact' && <ContactView />}
              {view === 'policy' && <PolicyView policySlug={params.policySlug || 'privacy'} />}
              {view === 'track' && <TrackView initialOrder={params.orderNumber} />}
              {view === 'account' && <AccountView />}
              {view === 'orders' && <OrdersView />}
              {view === 'wishlist' && <WishlistView />}
            </motion.div>
          </AnimatePresence>
        </main>
        <Footer />
        <CommandPalette />
        <AuthModal />
        <CartDrawer />
        <QuickViewModal />
        <FullScreenMenu />
        <ExitIntent />
        <ConsentGate />
        <MusicToggle />
        <MandalaCursor />
        <MobileTabBar />
      </div>
    </SmoothScroll>
  );
}

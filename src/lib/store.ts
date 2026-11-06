'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AddressDto, Bootstrap, CartLine, Product, User } from './types';

export type View =
  | 'home' | 'shop' | 'product' | 'checkout' | 'success' | 'track'
  | 'chhath' | 'rituals' | 'story' | 'contact' | 'policy'
  | 'account' | 'orders' | 'wishlist' | 'admin';

export type Overlay = 'cart' | 'auth' | 'search' | 'menu' | 'quickview' | 'exitoffer' | null;

export interface ViewParams {
  slug?: string;
  policySlug?: string;
  orderNumber?: string;
  category?: string;
  /** Shop search deep link (?v=shop&q=…) — read by syncFromUrl so the param survives in store state. */
  q?: string;
}

interface UiState {
  view: View;
  params: ViewParams;
  overlay: Overlay;
  lang: 'en' | 'hi';
  navHidden: boolean;
  navigate: (view: View, params?: ViewParams) => void;
  setOverlay: (o: Overlay) => void;
  toggleLang: () => void;
  setNavHidden: (h: boolean) => void;
  syncFromUrl: () => void;
}

function urlFor(view: View, params?: ViewParams) {
  const sp = new URLSearchParams();
  sp.set('v', view);
  if (params?.slug) sp.set('p', params.slug);
  if (params?.policySlug) sp.set('page', params.policySlug);
  if (params?.orderNumber) sp.set('order', params.orderNumber);
  if (params?.category) sp.set('cat', params.category);
  return `/?${sp.toString()}`;
}

export const useUi = create<UiState>((set, get) => ({
  view: 'home',
  params: {},
  overlay: null,
  lang: 'en',
  navHidden: false,
  navigate: (view, params = {}) => {
    try {
      window.history.pushState({}, '', urlFor(view, params));
    } catch { /* SSR guard */ }
    set({ view, params, overlay: null });
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }));
  },
  setOverlay: (o) => set({ overlay: o }),
  toggleLang: () => set({ lang: get().lang === 'en' ? 'hi' : 'en' }),
  setNavHidden: (h) => set({ navHidden: h }),
  syncFromUrl: () => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    const v = (sp.get('v') as View) || 'home';
    // ?lang=hi|en deep link — referenced by the hreflang alternates in layout.tsx.
    // URL param wins on boot; without it the existing (stored/toggled) preference is kept.
    const langParam = sp.get('lang');
    set({
      view: v,
      ...(langParam === 'hi' || langParam === 'en' ? { lang: langParam } : {}),
      params: {
        slug: sp.get('p') || undefined,
        policySlug: sp.get('page') || undefined,
        orderNumber: sp.get('order') || undefined,
        category: sp.get('cat') || undefined,
        q: sp.get('q') || undefined,
      },
    });
  },
}));

/* ── Cart ──────────────────────────────────────────── */
export interface CartState {
  lines: CartLine[];
  couponCode: string;
  giftNote: string;
  add: (p: Product, variantLabel?: string, qty?: number) => void;
  setQty: (slug: string, variantLabel: string, qty: number) => void;
  remove: (slug: string, variantLabel: string) => void;
  clear: () => void;
  setCoupon: (code: string) => void;
  setGiftNote: (note: string) => void;
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      couponCode: '',
      giftNote: '',
      add: (p, variantLabel, qty = 1) => {
        const variants = p.variants || [];
        const v = variants.find((x) => x.label === variantLabel) || variants[0] || { label: '', weightG: 0, priceDelta: 0 };
        set((s) => {
          const existing = s.lines.find((l) => l.slug === p.slug && l.variantLabel === v.label);
          if (existing) {
            return { lines: s.lines.map((l) => (l === existing ? { ...l, qty: l.qty + qty } : l)) };
          }
          return {
            lines: [...s.lines, {
              slug: p.slug,
              variantLabel: v.label,
              weightG: v.weightG,
              unitPrice: p.price + v.priceDelta,
              mrp: p.mrp,
              qty,
            }],
          };
        });
      },
      setQty: (slug, variantLabel, qty) =>
        set((s) => ({
          lines: qty <= 0
            ? s.lines.filter((l) => !(l.slug === slug && l.variantLabel === variantLabel))
            : s.lines.map((l) => (l.slug === slug && l.variantLabel === variantLabel ? { ...l, qty } : l)),
        })),
      remove: (slug, variantLabel) =>
        set((s) => ({ lines: s.lines.filter((l) => !(l.slug === slug && l.variantLabel === variantLabel)) })),
      clear: () => set({ lines: [], couponCode: '', giftNote: '' }),
      setCoupon: (code) => set({ couponCode: code.trim().toUpperCase() }),
      setGiftNote: (note) => set({ giftNote: note }),
    }),
    { name: 'biharse-cart-v1' },
  ),
);

export function cartTotals(lines: CartLine[], discountPaise = 0, shippingPaise = 0) {
  const subtotal = lines.reduce((a, l) => a + l.unitPrice * l.qty, 0);
  const mrpTotal = lines.reduce((a, l) => a + (l.mrp || l.unitPrice) * l.qty, 0);
  return {
    subtotal,
    mrpTotal,
    savings: Math.max(0, mrpTotal - subtotal),
    discount: discountPaise,
    shipping: shippingPaise,
    total: Math.max(0, subtotal - discountPaise + shippingPaise),
    count: lines.reduce((a, l) => a + l.qty, 0),
  };
}

/* ── Wishlist ──────────────────────────────────────── */
export const useWishlist = create<{ slugs: string[]; toggle: (slug: string) => void; has: (slug: string) => boolean; clear: () => void }>()(
  persist(
    (set, get) => ({
      slugs: [],
      toggle: (slug) => {
        set((s) => ({ slugs: s.slugs.includes(slug) ? s.slugs.filter((x) => x !== slug) : [...s.slugs, slug] }));
        scheduleWishlistSync();
      },
      has: (slug) => get().slugs.includes(slug),
      clear: () => {
        set({ slugs: [] });
        scheduleWishlistSync();
      },
    }),
    { name: 'biharse-wishlist-v1' },
  ),
);

/* ── Wishlist → server sync (silent, offline-safe) ───
   The local list stays the source of truth. When the visitor is signed in
   (useAuth.user — populated by /api/auth/me or a successful login) every
   toggle debounce-pushes the FULL slug list via PUT; on sign-in the server
   list is merged in (union) and pushed back. Guest = localStorage only. */
let wlSyncTimer: ReturnType<typeof setTimeout> | null = null;
let wlMergedFor: string | null = null;

async function pushWishlistToServer(): Promise<void> {
  try {
    if (!useAuth.getState().user) return;
    await fetch('/api/account/wishlist', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slugs: useWishlist.getState().slugs }),
      keepalive: true,
    });
  } catch { /* offline-safe: local list is authoritative */ }
}

function scheduleWishlistSync(): void {
  if (!useAuth.getState().user) return; // guest → localStorage only
  if (wlSyncTimer) clearTimeout(wlSyncTimer);
  wlSyncTimer = setTimeout(() => {
    wlSyncTimer = null;
    void pushWishlistToServer();
  }, 800);
}

async function mergeServerWishlist(): Promise<void> {
  const user = useAuth.getState().user;
  if (!user || wlMergedFor === user.id) return; // once per sign-in
  wlMergedFor = user.id;
  try {
    const r = await fetch('/api/account/wishlist', { cache: 'no-store' });
    if (!r.ok) return;
    const j = (await r.json()) as { slugs?: unknown };
    const server = Array.isArray(j.slugs) ? j.slugs.filter((x): x is string => typeof x === 'string') : [];
    if (server.length > 0) {
      useWishlist.setState((s) => ({ slugs: Array.from(new Set([...s.slugs, ...server])) }));
    }
    void pushWishlistToServer(); // reflect the union back to the server
  } catch { /* offline-safe */ }
}

/* ── Consent (DPDP Act 2023) ───────────────────────── */
export interface ConsentPrefs {
  analytics: boolean;
  marketing: boolean;
  decided: boolean;
}

interface ConsentState {
  consent: ConsentPrefs;
  setConsent: (partial: Partial<Omit<ConsentPrefs, 'decided'>>) => void;
  reopenConsent: () => void;
}

export const useConsent = create<ConsentState>()(
  persist(
    (set) => ({
      consent: { analytics: false, marketing: false, decided: false },
      setConsent: (partial) => set((s) => ({ consent: { ...s.consent, ...partial, decided: true } })),
      reopenConsent: () => set((s) => ({ consent: { ...s.consent, decided: false } })),
    }),
    { name: 'biharse-consent-v2' },
  ),
);

/* ── Recently viewed ───────────────────────────────── */
export const useRecentlyViewed = create<{ slugs: string[]; push: (slug: string) => void }>()(
  persist(
    (set) => ({
      slugs: [],
      push: (slug) => set((s) => ({ slugs: [slug, ...s.slugs.filter((x) => x !== slug)].slice(0, 8) })),
    }),
    { name: 'biharse-recent-v1' },
  ),
);

/* ── Auth ──────────────────────────────────────────── */
interface AuthState {
  user: User | null;
  ready: boolean;
  set: (u: User | null) => void;
  load: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  ready: false,
  set: (u) => {
    set({ user: u, ready: true });
    if (u) void mergeServerWishlist(); // signed in → pull + merge server wishlist
    else wlMergedFor = null; // signed out → next sign-in re-merges
  },
  load: async () => {
    try {
      const r = await fetch('/api/auth/me', { cache: 'no-store' });
      const j = await r.json();
      const u = (j.user ?? null) as User | null;
      set({ user: u, ready: true });
      if (u) void mergeServerWishlist();
    } catch {
      set({ user: null, ready: true });
    }
  },
  logout: async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    wlMergedFor = null;
    set({ user: null });
  },
}));

/* ── Bootstrap / settings ──────────────────────────── */

/**
 * Offline fallback used ONLY when /api/bootstrap is unreachable after retries
 * (e.g. a stripped deploy). Mirrors the real seeded content so the storefront
 * still renders instead of hanging on the boot loader forever. The moment the
 * API answers, live data replaces this — the banner disappears automatically.
 */
export const FALLBACK_BOOTSTRAP: Bootstrap = {
  announcement: { active: false, textEn: '', textHi: '', code: '', discount: '', note: '' },
  hero: {
    titleEn: 'Order Fresh & Authentic Thekua From Bihar',
    titleHi: 'ऑनलाइन ठेकुआ खरीदें | बिहार का पारंपरिक ठेकुआ | शुद्ध ठेकुआ डिलीवरी',
    subEn: 'Taste the joy of home with our delicious homemade Thekua — crispy, sweet, and inspired by the rich traditions of Bihar, delivered fresh to your door.',
    ctaPrimary: 'Shop now',
    ctaSecondary: 'Our story',
    proof: [],
  },
  business: { email: 'support@biharse.org', phone: '', address: '', gstin: '' },
  shipping: { freeAbovePaise: 99900, flatPaise: 9900, defaultMinDays: 5, defaultMaxDays: 8 },
  flags: { music: false, exitIntent: false, whatsapp: false, reviews: true },
  footer: { signoff: 'Designed & Crafted with ❤️ in Bharat', tagHi: 'शुद्ध • पारंपरिक • विश्वसनीय' },
  categories: [],
  chhathUpcoming: null,
  chhathAll: [],
  paymentMode: 'sandbox',
  razorpayKeyId: '',
  googleEnabled: false,
};

interface SettingsState {
  data: Bootstrap | null;
  /** degraded = live data unavailable; FALLBACK_BOOTSTRAP is being shown. */
  degraded: boolean;
  /** Initial boot fetch — retries, then degrades gracefully. Never hangs. */
  load: () => Promise<void>;
  /** Manual retry (degraded banner button) — always goes back through load(). */
  retry: () => void;
}

const BOOT_ATTEMPTS = 3;
const BOOT_BACKOFF_MS = [600, 1500, 3000];

function looksLikeBootstrap(j: unknown): j is Bootstrap {
  return Boolean(j) && typeof j === 'object' && 'announcement' in (j as object) && 'categories' in (j as object);
}

/** One /api/bootstrap attempt with a hard 8s timeout — a hung response can't block boot. */
async function fetchBootstrap(): Promise<Bootstrap> {
  const r = await fetch('/api/bootstrap', { cache: 'no-store', signal: AbortSignal.timeout(8000) });
  const j: unknown = await r.json();
  if (!r.ok || !looksLikeBootstrap(j)) throw new Error(`bootstrap ${r.status}`);
  return j;
}

/* Background self-heal (degraded mode): a single chained timer that keeps
   probing the API every 20s until live data arrives. Never overlapping. */
let healTimer: ReturnType<typeof setTimeout> | null = null;

function stopHeal() {
  if (healTimer) { clearTimeout(healTimer); healTimer = null; }
}

function scheduleHeal(set: (p: Partial<SettingsState>) => void) {
  stopHeal();
  healTimer = setTimeout(() => {
    healTimer = null;
    fetchBootstrap()
      .then((data) => set({ data, degraded: false }))
      .catch(() => scheduleHeal(set));
  }, 20000);
}

export const useSettings = create<SettingsState>((set) => ({
  data: null,
  degraded: false,
  load: async () => {
    stopHeal();
    for (let attempt = 0; attempt < BOOT_ATTEMPTS; attempt++) {
      try {
        const data = await fetchBootstrap();
        set({ data, degraded: false });
        return;
      } catch {
        if (attempt < BOOT_ATTEMPTS - 1) {
          await new Promise((res) => setTimeout(res, BOOT_BACKOFF_MS[attempt]));
        }
      }
    }
    // All attempts failed — render the store with the offline fallback and
    // keep probing in the background so recovery is automatic.
    set({ data: FALLBACK_BOOTSTRAP, degraded: true });
    scheduleHeal(set);
  },
  retry: () => { void useSettings.getState().load(); },
}));

/* ── Product cache (client-side) ───────────────────── */
interface ProductCache {
  map: Record<string, Product>;
  putMany: (ps: Product[]) => void;
  put: (p: Product) => void;
}
export const useProductCache = create<ProductCache>((set) => ({
  map: {},
  putMany: (ps) => set((s) => ({ map: { ...s.map, ...Object.fromEntries(ps.map((p) => [p.slug, p])) } })),
  put: (p) => set((s) => ({ map: { ...s.map, [p.slug]: p } })),
}));

/* ── Checkout address draft ────────────────────────── */
export const useCheckout = create<{
  address: AddressDto | null;
  gstName: string; gstin: string; invoiceEmail: string;
  setAddress: (a: AddressDto | null) => void;
  setGst: (g: { gstName?: string; gstin?: string; invoiceEmail?: string }) => void;
}>((set) => ({
  address: null,
  gstName: '', gstin: '', invoiceEmail: '',
  setAddress: (address) => set({ address }),
  setGst: (g) => set((s) => ({ gstName: g.gstName ?? s.gstName, gstin: g.gstin ?? s.gstin, invoiceEmail: g.invoiceEmail ?? s.invoiceEmail })),
}));

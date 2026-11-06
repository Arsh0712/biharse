'use client';

// "Save for later" — persisted, guest-friendly list kept OUTSIDE the cart store
// (src/lib/store.ts is untouched). Each row stores a minimal snapshot so the
// drawer can render instantly; "Move to cart" re-resolves the live product via
// /api/products?slugs= (same pattern as reorder) so prices/variants stay honest.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useCart } from './store';
import type { Product } from './types';

export interface SavedItem {
  slug: string;
  variantLabel: string;
  qty: number;
  /* display snapshot */
  nameEn: string;
  nameHi?: string;
  image?: string;
  unitPrice: number; // paise, incl. variant delta
  mrp: number;
  weightG: number;
}

interface SavedState {
  items: SavedItem[];
  add: (item: SavedItem) => void;
  remove: (slug: string, variantLabel: string) => void;
  has: (slug: string, variantLabel: string) => boolean;
  moveToCart: (slug: string, variantLabel: string) => Promise<boolean>;
  clear: () => void;
}

export const useSavedForLater = create<SavedState>()(
  persist(
    (set, get) => ({
      items: [],

      add: (item) =>
        set((s) => ({
          items: s.items.some((i) => i.slug === item.slug && i.variantLabel === item.variantLabel)
            ? s.items.map((i) =>
                i.slug === item.slug && i.variantLabel === item.variantLabel ? { ...i, qty: item.qty, nameEn: item.nameEn, image: item.image ?? i.image } : i,
              )
            : [{ ...item }, ...s.items].slice(0, 24),
        })),

      remove: (slug, variantLabel) =>
        set((s) => ({ items: s.items.filter((i) => !(i.slug === slug && i.variantLabel === variantLabel)) })),

      has: (slug, variantLabel) => get().items.some((i) => i.slug === slug && i.variantLabel === variantLabel),

      moveToCart: async (slug, variantLabel) => {
        const item = get().items.find((i) => i.slug === slug && i.variantLabel === variantLabel);
        if (!item) return false;
        try {
          const r = await fetch('/api/products?slugs=' + encodeURIComponent(slug), { cache: 'no-store' });
          const j = (await r.json()) as { products?: Product[] };
          const p = j.products?.[0];
          if (!p) return false;
          const variant =
            p.variants.find((v) => v.label === item.variantLabel)?.label || p.variants[0]?.label;
          useCart.getState().add(p, variant, item.qty);
          set((s) => ({ items: s.items.filter((i) => !(i.slug === slug && i.variantLabel === variantLabel)) }));
          return true;
        } catch {
          return false;
        }
      },

      clear: () => set({ items: [] }),
    }),
    { name: 'biharse-saved-v1' },
  ),
);

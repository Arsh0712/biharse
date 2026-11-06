'use client';

import { useUi } from './store';

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j as { error?: string })?.error || `Request failed (${r.status})`);
  return j as T;
}

/* Tiny i18n — UI strings only; product/content is bilingual in the DB */
const DICT = {
  en: {
    shop: 'Shop', home: 'Home', chhath: 'Chhath', rituals: 'Rituals', ourStory: 'Our Story', contact: 'Contact',
    addToCart: 'Add to Cart', addedToCart: 'Added to cart', quickView: 'Quick view', viewAll: 'View all',
    cart: 'Cart', checkout: 'Checkout', wishlist: 'Wishlist', account: 'Account', search: 'Search',
    mrp: 'MRP', save: 'Save', orderNow: 'Order now', outOfStock: 'Out of stock', lowStock: 'Low stock',
    from: 'From', reviews: 'reviews', free: 'FREE', track: 'Track Order', orders: 'My Orders',
    deliveryCheck: 'Check delivery date', enterPincode: 'Enter pincode', check: 'Check',
    total: 'Total', subtotal: 'Subtotal', discount: 'Discount', shipping: 'Shipping',
    placeOrder: 'Pay securely', orderPlaced: 'Order placed!', continueShopping: 'Continue shopping',
    signIn: 'Sign in', signOut: 'Sign out', welcome: 'Namaste',
    soldByBatch: 'Made in small batches', batch: 'Batch', viewCart: 'View cart',
  },
  hi: {
    shop: 'दुकान', home: 'होम', chhath: 'छठ', rituals: 'विधियाँ', ourStory: 'हमारी कहानी', contact: 'संपर्क',
    addToCart: 'कार्ट में डालें', addedToCart: 'कार्ट में जुड़ गया', quickView: 'झलक देखें', viewAll: 'सब देखें',
    cart: 'कार्ट', checkout: 'चेकआउट', wishlist: 'पसंदीदा', account: 'खाता', search: 'खोजें',
    mrp: 'एमआरपी', save: 'बचत', orderNow: 'अभी ऑर्डर करें', outOfStock: 'स्टॉक खत्म', lowStock: 'कम स्टॉक',
    from: 'से', reviews: 'समीक्षाएँ', free: 'मुफ़्त', track: 'ऑर्डर ट्रैक करें', orders: 'मेरे ऑर्डर',
    deliveryCheck: 'डिलीवरी तारीख़ देखें', enterPincode: 'पिनकोड डालें', check: 'देखें',
    total: 'कुल', subtotal: 'उप-योग', discount: 'छूट', shipping: 'शिपिंग',
    placeOrder: 'सुरक्षित भुगतान', orderPlaced: 'ऑर्डर हो गया!', continueShopping: 'और खरीदें',
    signIn: 'साइन इन', signOut: 'साइन आउट', welcome: 'नमस्ते',
    soldByBatch: 'छोटे बैच में बना', batch: 'बैच', viewCart: 'कार्ट देखें',
  },
} as const;

export type DictKey = keyof typeof DICT.en;

export function t(key: DictKey): string {
  const lang = useUi.getState().lang;
  return DICT[lang][key] ?? DICT.en[key] ?? key;
}

export function pick(lang: 'en' | 'hi', en: string, hi: string) {
  return lang === 'hi' ? hi || en : en;
}

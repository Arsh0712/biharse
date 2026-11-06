// BiharSe — restock catalog from the LIVE biharse.org storefront (scraped 2026-11-06).
// Sources:
//   • https://biharse.org/products.json  — exact titles, prices, MRP, weights, descriptions, images
//   • https://biharse.org/ (homepage)    — announcement offer (BIHARSE15 · 15% OFF · Limited stock),
//                                          hero copy, proof chips, contact email, footer sign-off
//   • https://biharse.org/pages/rituals  — Chhath Puja 2025 ritual dates
// Images live in db/uploads/products/ (served via /api/media/products/…) and public/img/.
// Prices in paise. No invented reviews, stock scarcity, or dates — only content published on the live store.

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

/* ── 1. Category (the live store's only product family) ─────────────── */
const thekuaCategory = await db.category.upsert({
  where: { slug: 'thekua' },
  update: {
    nameEn: 'Thekua',
    nameHi: 'ठेकुआ',
    descEn: 'A beloved traditional sweet from Bihar, made with wheat flour, jaggery/sugar & pure ghee. Loved during Chhath Puja and as a snack.',
    descHi: 'बिहार की पारंपरिक मिठाई, गेहूँ के आटे, गुड़/चीनी और घी से बना। छठ पूजा और चाय-स्नैक के रूप में प्रिय।',
    isActive: true,
    sortOrder: 0,
  },
  create: {
    slug: 'thekua',
    nameEn: 'Thekua',
    nameHi: 'ठेकुआ',
    descEn: 'A beloved traditional sweet from Bihar, made with wheat flour, jaggery/sugar & pure ghee. Loved during Chhath Puja and as a snack.',
    descHi: 'बिहार की पारंपरिक मिठाई, गेहूँ के आटे, गुड़/चीनी और घी से बना। छठ पूजा और चाय-स्नैक के रूप में प्रिय।',
    sortOrder: 0,
    isActive: true,
  },
});

/* ── 2. Products — exact live catalog (2 SKUs) ──────────────────────── */
// Wipe previous catalog (demo SKUs) — order items keep their snapshots (productId → SET NULL).
await db.product.deleteMany({});

const chini = await db.product.create({
  data: {
    slug: 'chini-thekua',
    nameEn: 'Chini Thekua - 250g- चीनी ठेकुआ',
    nameHi: 'Chini Thekua - 250g- चीनी ठेकुआ',
    taglineEn: 'Light and delicate with refined sugar and flour. Elegant sweetness perfect for prasad.',
    taglineHi: 'परिष्कृत चीनी और मैदे से बना हल्का और बारीक स्वाद। प्रसाद के लिए उत्तम।',
    storyEn: 'Light and delicate with refined sugar and flour. Elegant sweetness perfect for prasad. Premium quality ingredients.',
    storyHi: 'परिष्कृत चीनी और मैदे से बना हल्का और बारीक स्वाद। प्रसाद के लिए उत्तम। प्रीमियम गुणवत्ता वाली सामग्री।',
    ingredientsEn: 'Wheat flour (maida), refined sugar, pure ghee.',
    ingredientsHi: 'मैदा, परिष्कृत चीनी, शुद्ध घी।',
    allergensEn: 'Contains wheat (gluten) and milk solids (ghee). Prepared in a homemade food kitchen.',
    allergensHi: 'इसमें गेहूँ (ग्लूटेन) और दूध का ठोस पदार्थ (घी) है। घर के भोजन की रसोई में तैयार।',
    storageEn: 'Store in an airtight container, away from moisture and direct sunlight. Best consumed within 30 days.',
    storageHi: 'एयरटाइट डिब्बे में, नमी और धूप से दूर रखें। 30 दिनों के भीतर सबसे अच्छा।',
    shelfLifeDays: 30,
    categoryId: thekuaCategory.id,
    mrp: 59900,
    price: 39900,
    gstRate: 5,
    hsn: '1905',
    stock: 40,
    isFeatured: true,
    isDemo: false,
    isActive: true,
    imagesJson: JSON.stringify([
      '/api/media/products/chini-thekua-1.webp',
      '/api/media/products/chini-thekua-2.jpg',
    ]),
    variantsJson: JSON.stringify([]),
    faqJson: JSON.stringify([]),
    nutritionJson: JSON.stringify([]),
    seoTitle: 'Chini Thekua Online 250g | Sugar Thekua from Bihar — BiharSe',
    seoDesc: 'Light and delicate with refined sugar and flour. Elegant sweetness perfect for prasad. Premium quality ingredients.',
    rating: 0,
    reviewCount: 0,
  },
});

const gur = await db.product.create({
  data: {
    slug: 'gur-thekua',
    nameEn: 'Gur Thekua - 250g - गुड़ ठेकुआ',
    nameHi: 'Gur Thekua - 250g - गुड़ ठेकुआ',
    taglineEn: 'Traditional earthy sweetness made with pure jaggery and wheat flour.',
    taglineHi: 'शुद्ध गुड़ और गेहूँ के आटे से बनी पारंपरिक मिठास।',
    storyEn: 'Traditional earthy sweetness made with pure jaggery and wheat flour. Rich aroma and authentic taste. Handcrafted with devotion. Freshly made.',
    storyHi: 'शुद्ध गुड़ और गेहूँ के आटे से बनी पारंपरिक मिठास। समृद्ध सुगंध और असली स्वाद। श्रद्धा से हाथ से बनाया गया। ताज़ा बनाया जाता है।',
    ingredientsEn: 'Wheat flour, pure jaggery, pure ghee.',
    ingredientsHi: 'गेहूँ का आटा, शुद्ध गुड़, शुद्ध घी।',
    allergensEn: 'Contains wheat (gluten) and milk solids (ghee). Prepared in a homemade food kitchen.',
    allergensHi: 'इसमें गेहूँ (ग्लूटेन) और दूध का ठोस पदार्थ (घी) है। घर के भोजन की रसोई में तैयार।',
    storageEn: 'Store in an airtight container, away from moisture and direct sunlight. Best consumed within 30 days.',
    storageHi: 'एयरटाइट डिब्बे में, नमी और धूप से दूर रखें। 30 दिनों के भीतर सबसे अच्छा।',
    shelfLifeDays: 30,
    categoryId: thekuaCategory.id,
    mrp: 79900,
    price: 49900,
    gstRate: 5,
    hsn: '1905',
    stock: 40,
    isFeatured: true,
    isDemo: false,
    isActive: true,
    imagesJson: JSON.stringify([
      '/api/media/products/gur-thekua-1.webp',
      '/api/media/products/gur-thekua-2.jpg',
    ]),
    variantsJson: JSON.stringify([]),
    faqJson: JSON.stringify([]),
    nutritionJson: JSON.stringify([]),
    seoTitle: 'Gur Thekua Online 250g | Jaggery Thekua from Bihar — BiharSe',
    seoDesc: 'Traditional earthy sweetness made with pure jaggery and wheat flour. Rich aroma and authentic taste. Handcrafted with devotion.',
    rating: 5,
    reviewCount: 1,
  },
});

/* ── 3. The live offer — BIHARSE15 · 15% OFF (announcement bar) ─────── */
await db.coupon.upsert({
  where: { code: 'BIHARSE15' },
  update: {
    type: 'PERCENT',
    value: 15,
    minSubtotal: 0,
    maxDiscount: 0,
    active: true,
    expiresAt: null,
    note: 'Site-wide offer as announced on biharse.org — माटी, ममता आ नव वर्ष',
  },
  create: {
    code: 'BIHARSE15',
    type: 'PERCENT',
    value: 15,
    minSubtotal: 0,
    maxDiscount: 0,
    active: true,
    expiresAt: null,
    note: 'Site-wide offer as announced on biharse.org — माटी, ममता आ नव वर्ष',
  },
});

/* ── 4. Review — the testimonial published on the live homepage ─────── */
// "Perfect taste of home! Fresh and exactly like grandmother made" - Anjali, Delhi
await db.review.deleteMany({});
await db.review.create({
  data: {
    productId: gur.id,
    name: 'Anjali',
    city: 'Delhi',
    rating: 5,
    title: 'Perfect taste of home',
    body: 'Perfect taste of home! Fresh and exactly like grandmother made.',
    verified: false,
    approved: true,
  },
});

/* ── 5. Site settings — exact homepage copy from biharse.org ────────── */
const settings = [
  {
    key: 'announcement',
    valueJson: JSON.stringify({
      active: true,
      textEn: 'माटी, ममता आ नव वर्ष - सब एक संग 💛',
      textHi: 'माटी, ममता आ नव वर्ष - सब एक संग 💛',
      code: 'BIHARSE15',
      discount: '15% OFF',
      note: 'Limited stock',
    }),
  },
  {
    key: 'hero',
    valueJson: JSON.stringify({
      titleEn: 'Order Fresh & Authentic Thekua From Bihar',
      titleHi: 'ऑनलाइन ठेकुआ खरीदें | बिहार का पारंपरिक ठेकुआ | शुद्ध ठेकुआ डिलीवरी',
      subEn: 'Taste the joy of home with our delicious homemade Thekua — crispy, sweet, and inspired by the rich traditions of Bihar, delivered fresh to your door.',
      subHi: 'बिहार की परंपरा और स्वाद, अब आपके घर तक ।',
      ctaPrimary: 'Order Fresh & Authentic Thekua Online',
      ctaSecondary: 'Our Story',
      proof: ['Pure & natural ingredients', 'No Preservatives or Chemicals', 'Delivered in 5–8 days'],
    }),
  },
  {
    key: 'business',
    valueJson: JSON.stringify({
      email: 'support@biharse.org',
      phone: '',
      address: '',
      gstin: '',
    }),
  },
  {
    key: 'footer',
    valueJson: JSON.stringify({
      signoff: 'Designed & Crafted with ❤️ in Bharat',
      tagHi: 'शुद्ध • पारंपरिक • विश्वसनीय',
    }),
  },
];

for (const s of settings) {
  await db.siteSetting.upsert({
    where: { key: s.key },
    update: { valueJson: s.valueJson },
    create: { key: s.key, valueJson: s.valueJson },
  });
}

/* ── 6. Chhath Puja 2025 dates (as published on biharse.org/pages/rituals) ── */
await db.chhathYear.upsert({
  where: { year: 2025 },
  update: {
    nahayKhay: new Date('2025-10-27T00:00:00+05:30'),
    kharna: new Date('2025-10-28T00:00:00+05:30'),
    sandhyaArghya: new Date('2025-10-29T00:00:00+05:30'),
    ushaArghya: new Date('2025-10-30T00:00:00+05:30'),
    note: 'Chhath Puja 2025 ritual schedule — as published on biharse.org',
  },
  create: {
    year: 2025,
    nahayKhay: new Date('2025-10-27T00:00:00+05:30'),
    kharna: new Date('2025-10-28T00:00:00+05:30'),
    sandhyaArghya: new Date('2025-10-29T00:00:00+05:30'),
    ushaArghya: new Date('2025-10-30T00:00:00+05:30'),
    note: 'Chhath Puja 2025 ritual schedule — as published on biharse.org',
  },
});

console.log('✅ Restocked from biharse.org:');
console.log('   Category: Thekua');
console.log(`   Products: ${chini.slug} (₹399/MRP ₹599), ${gur.slug} (₹499/MRP ₹799)`);
console.log('   Offer: BIHARSE15 — 15% OFF (active)');
console.log('   Review: Anjali · Delhi · 5★ (live homepage testimonial)');
console.log('   Settings: announcement / hero / business / footer');
console.log('   ChhathYear: 2025 ritual dates');
await db.$disconnect();

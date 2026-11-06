// BiharSe seed — catalogue, CMS, Chhath dates, pincode rules, coupons, admin
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

if (!bcrypt) throw new Error('bcryptjs missing');
const db = new PrismaClient();

const now = new Date('2026-11-05T00:00:00+05:30');

const cat = {
  thekua: { slug: 'thekua', nameEn: 'Thekua', nameHi: 'ठेकुआ', descEn: 'Sun-baked devotion from Bihar — crisp handmade wheat cookies fried in ghee.', descHi: 'बिहार की सूरज-परंपरा — हाथ से बना, घी में तला क्रिस्प ठेकुआ।', sortOrder: 1 },
  namkeen: { slug: 'namkeen', nameEn: 'Namkeen', nameHi: 'नमकीन', descEn: 'Savoury Bihari classics — flaky, crunchy, honest.', descHi: 'बिहारी स्वाद की नमकीन — खस्ता, कुरकुरी, ईमानदार।', sortOrder: 2 },
  gift: { slug: 'gift-boxes', nameEn: 'Gift Boxes', nameHi: 'गिफ्ट बॉक्स', descEn: 'Send a taste of home, beautifully boxed.', descHi: 'घर का स्वाद, खूबसूरत डिब्बे में।', sortOrder: 3 },
  chhath: { slug: 'chhath-prasad', nameEn: 'Chhath Prasad', nameHi: 'छठ प्रसाद', descEn: 'Prasad hampers blessed by Chhath traditions.', descHi: 'छठ परंपरा से जुड़े प्रसाद हैम्पर।', sortOrder: 4 },
};

const variants3 = JSON.stringify([
  { label: '250g', weightG: 250, priceDelta: 0 },
  { label: '500g', weightG: 500, priceDelta: 25000 },
  { label: '1kg', weightG: 1000, priceDelta: 60000 },
]);

const p = (slug) => `/img/${slug}.png`;

const products = [
  {
    slug: 'chini-thekua', cat: 'thekua', nameEn: 'Chini Thekua', nameHi: 'चीनी ठेकुआ',
    taglineEn: 'Crisp wheat cookies kissed with raw sugar', taglineHi: 'चीनी की मिठास, घी की खुशबू',
    storyEn: 'The classic offering of Chhath Puja — wheat flour kneaded with ghee and raw sugar, pressed by hand into wooden moulds, slow-fried till deep gold. Every piece carries the imprint of the mould our nani brought from her maayka in Mithila.',
    storyHi: 'छठ पूजा की शाश्वत परंपरा — गेहूं का आटा, देसी घी और चीनी, हाथ की मूल में थपकी, कड़ाहे में धीमी आंच। हर ठेकुआ पर मिथिला की माटी की छाप है।',
    ingredientsEn: 'Wheat flour, raw sugar (chini), desi ghee, fennel seeds, water. No preservatives, no essence, no shortening.',
    ingredientsHi: 'गेहूं का आटा, चीनी, देसी घी, सौंफ, शुद्ध जल। कोई प्रिज़र्वेटिव नहीं।',
    storageEn: 'Store in an airtight container away from moisture. Stays crisp for 30 days.', storageHi: 'एयरटाइट डिब्बे में, नमी से दूर। 30 दिन तक क्रिस्प।',
    shelfLifeDays: 30, mrp: 59900, price: 39900, stock: 38, lowStockAt: 12, isFeatured: true, batchDate: 'Nov 02, 2026',
    images: [p('thekua-chini-1'), p('thekua-chini-2')],
    faq: [
      { qEn: 'Is it exactly the Chhath prasad thekua?', qHi: 'क्या यह छठ प्रसाद वाला ठेकुआ है?', aEn: 'Yes — the same recipe, same wooden moulds, made with devotion and hygiene. It is offered in homes across Bihar every Chhath.', aHi: 'जी — वही रेसिपी, वही पारंपरिक मूल, पूरी स्वच्छता के साथ।' },
      { qEn: 'Will it survive 5–8 days of shipping?', qHi: 'क्या 5–8 दिन की डिलीवरी में खराब नहीं होगा?', aEn: 'Thekua is naturally long-keeping — low moisture, ghee-sealed. We vacuum-friendly pack in food-grade pouches; it reaches you crisp.', aHi: 'ठेकुआ चाय की तरह देर तक चलता है — घी की सीलिंग और फूड-ग्रेड पैकिंग में क्रिस्प ही आता है।' },
      { qEn: 'Can I offer it during Sandhya Arghya?', qHi: 'क्या संध्या अर्घ्य में चढ़ा सकते हैं?', aEn: 'Absolutely. Order at least 8–10 days before Chhath to be safe.', aHi: 'बिल्कुल। छठ से 8–10 दिन पहले ऑर्डर करें तो सही दिन तक पहुंच जाएगा।' },
    ],
    nutrition: [
      { label: 'Energy', per100g: '498 kcal' }, { label: 'Carbohydrate', per100g: '58 g' },
      { label: 'Protein', per100g: '8.2 g' }, { label: 'Fat', per100g: '24 g' },
      { label: 'Fibre', per100g: '3.1 g' },
    ],
  },
  {
    slug: 'gur-thekua', cat: 'thekua', nameEn: 'Gur Thekua', nameHi: 'गुड़ ठेकुआ',
    taglineEn: 'Deep amber, jaggery-rich, the elder’s favourite', taglineHi: 'गुड़ की गहरी मिठास, दादी-नानी की पसंद',
    storyEn: 'Melted jaggery from Sitamarhi replaces sugar entirely — darker, earthier, with notes of caramel and smoke. Elders say gur thekua is the “real” thekua; we agree.',
    storyHi: 'सीतामढ़ी का असली गुड़ — गहरा, मिट्टी जैसा, कैरमेल की महक। कहते हैं गुड़ ठेकुआ ही असली ठेकुआ है — हम मानते हैं।',
    ingredientsEn: 'Wheat flour, Sitamarhi jaggery (gur), desi ghee, sesame, cardamom. No preservatives.',
    ingredientsHi: 'गेहूं का आटा, सीतामढ़ी का गुड़, देसी घी, तिल, इलायची। कोई प्रिज़र्वेटिव नहीं।',
    storageEn: 'Airtight, cool & dry. Jaggery keeps it soft-centred for 25–30 days.', storageHi: 'एयरटाइट, ठंडी जगह। 25–30 दिन तक ताज़ा।',
    shelfLifeDays: 30, mrp: 79900, price: 49900, stock: 9, lowStockAt: 12, isFeatured: true, batchDate: 'Nov 02, 2026',
    images: [p('thekua-gur-1'), p('thekua-gur-2')],
    faq: [
      { qEn: 'Why is Gur Thekua costlier than Chini?', qHi: 'गुड़ ठेकुआ महंगा क्यों है?', aEn: 'Pure jaggery costs nearly double sugar and demands slower frying at lower flame. The depth of flavour is worth it.', aHi: 'असली गुड़ चीनी से दोगुना महंगा है और धीमी आंच मांगता है — स्वाद की गहराई ही तो है।' },
      { qEn: 'Is it too sweet?', qHi: 'बहुत मीठा तो नहीं?', aEn: 'Balanced — jaggery sweetens with mineral depth, not sharpness. Most guests call it “perfect with chai”.', aHi: 'संतुलित है — चाय के साथ “एकदम सही” कहते हैं सब।' },
    ],
    nutrition: [
      { label: 'Energy', per100g: '487 kcal' }, { label: 'Carbohydrate', per100g: '56 g' },
      { label: 'Protein', per100g: '8.0 g' }, { label: 'Fat', per100g: '23 g' },
      { label: 'Iron (from jaggery)', per100g: '2.4 mg' },
    ],
  },
  {
    slug: 'bihar-bhujia-namkeen', cat: 'namkeen', nameEn: 'Bihari Bhujia Namkeen', nameHi: 'बिहारी भुजिया नमकीन', isDemo: true,
    taglineEn: 'Thin, crisp, slow-fried moth dal sev', taglineHi: 'पतली, कुरकुरी, धीमे तली भुजिया',
    storyEn: 'A demo SKU from our planned namkeen range — moth dal batter pressed into thin ribbons and fried small-batch in groundnut oil. Feel free to edit price & stock in admin.',
    storyHi: 'हमारी नमकीन श्रेणी का डेमो SKU — मोठ दाल की पतली भुजिया, छोटे बैच में तली। प्राइस और स्टॉक एडमिन से बदलें।',
    ingredientsEn: 'Moth dal flour, gram flour, groundnut oil, rock salt, red chilli, ajwain.',
    ingredientsHi: 'मोठ दाल, बेसन, मूंगफली तेल, सेंधा नमक, लाल मिर्च, अजवाइन।',
    storageEn: 'Airtight. 45 days.', storageHi: 'एयरटाइट। 45 दिन।',
    shelfLifeDays: 45, mrp: 34900, price: 24900, stock: 60, images: [p('namkeen-bhujia')],
    faq: [{ qEn: 'Demo product?', qHi: 'डेमो प्रोडक्ट है?', aEn: 'Yes — sample SKU flagged as demo; fully editable in admin.', aHi: 'जी — डेमो SKU, एडमिन से पूरी तरह एडिट करें।' }],
    nutrition: [{ label: 'Energy', per100g: '520 kcal' }, { label: 'Protein', per100g: '12 g' }, { label: 'Fat', per100g: '28 g' }],
  },
  {
    slug: 'silao-khaja', cat: 'namkeen', nameEn: 'Silao Khaja', nameHi: 'सीलाव खाजा', isDemo: true,
    taglineEn: 'Nalanda’s legendary layered crisp', taglineHi: 'नालंदा की प्रसिद्ध लच्छेदार खाजा',
    storyEn: 'Demo SKU — the 700-year-old sweet-crisp of Silao, layered like parchment and glazed lightly. Sample data; editable in admin.',
    storyHi: 'डेमो SKU — सीलाव की 700 साल पुरानी खाजा, परत-दर-परत खस्ता। एडमिन से एडिट करें।',
    ingredientsEn: 'Maida, ghee, sugar glaze, cardamom.', ingredientsHi: 'मैदा, घी, चीनी की चाशनी, इलायची।',
    storageEn: 'Airtight. 21 days.', storageHi: 'एयरटाइट। 21 दिन।',
    shelfLifeDays: 21, mrp: 44900, price: 32900, stock: 40, images: [p('namkeen-khaja')],
    faq: [], nutrition: [{ label: 'Energy', per100g: '470 kcal' }],
  },
  {
    slug: 'nimki-namakpara', cat: 'namkeen', nameEn: 'Nimki Namakpara', nameHi: 'नमकी नमकपारा', isDemo: true,
    taglineEn: 'Diamond-cut tea-time classic with ajwain', taglineHi: 'चाय के साथ खस्ता नमकी, अजवाइन वाली',
    storyEn: 'Demo SKU — diamond-cut dough with ajwain and methi, fried till golden. Sample data; editable in admin.',
    storyHi: 'डेमो SKU — अजवाइन-मेथी वाली खस्ता नमकी। एडमिन से एडिट करें।',
    ingredientsEn: 'Wheat flour, ghee, ajwain, methi, rock salt.', ingredientsHi: 'गेहूं का आटा, घी, अजवाइन, मेथी, सेंधा नमक।',
    storageEn: 'Airtight. 30 days.', storageHi: 'एयरटाइट। 30 दिन।',
    shelfLifeDays: 30, mrp: 29900, price: 19900, stock: 55, images: [p('namkeen-nimki')],
    faq: [], nutrition: [{ label: 'Energy', per100g: '460 kcal' }],
  },
  {
    slug: 'sattu-laddu', cat: 'namkeen', nameEn: 'Sattu Energy Laddu', nameHi: 'सत्तू लड्डू', isDemo: true,
    taglineEn: 'Roasted gram-power balls from Magadh', taglineHi: 'मगध का देसी प्रोटीन बूस्ट',
    storyEn: 'Demo SKU — roasted sattu bound with gur and ghee, the farmer’s protein ball reimagined for your gym bag. Sample data; editable in admin.',
    storyHi: 'डेमो SKU — गुड़-घी वाला सत्तू लड्डू, किसानों का देसी प्रोटीन। एडमिन से एडिट करें।',
    ingredientsEn: 'Roasted sattu, jaggery, desi ghee, coconut.', ingredientsHi: 'भुना सत्तू, गुड़, देसी घी, नारियल।',
    storageEn: 'Airtight. 20 days.', storageHi: 'एयरटाइट। 20 दिन।',
    shelfLifeDays: 20, mrp: 39900, price: 29900, stock: 45, images: [p('namkeen-sattu')],
    faq: [], nutrition: [{ label: 'Energy', per100g: '420 kcal' }, { label: 'Protein', per100g: '18 g' }],
  },
  {
    slug: 'signature-gift-box', cat: 'gift-boxes', nameEn: 'BiharSe Signature Gift Box', nameHi: 'बिहारसे सिग्नेचर गिफ्ट बॉक्स',
    taglineEn: 'Chini + Gur thekua & namkeen in a mandala keepsake box', taglineHi: 'ठेकुआ और नमकीन, मंडला डिब्बे में',
    storyEn: '750g of our best — Chini Thekua, Gur Thekua and Bhujia Namkeen in a rigid box embossed with the BiharSe mandala, with a hand-signed message card. Add your gift note at checkout.',
    storyHi: '750g का सेट — चीनी ठेकुआ, गुड़ ठेकुआ और भुजिया, मंडला-अंकित डिब्बे में, हस्तलिखित मैसेज कार्ड के साथ।',
    ingredientsEn: 'See individual products. All natural.', ingredientsHi: 'देखें अलग प्रोडक्ट। सब प्राकृतिक।',
    storageEn: 'Airtight. 30 days.', storageHi: 'एयरटाइट। 30 दिन।',
    shelfLifeDays: 30, mrp: 149900, price: 119900, stock: 25, images: [p('gift-box'), p('thekua-chini-1')],
    variants: JSON.stringify([{ label: '750g box', weightG: 750, priceDelta: 0 }]),
    faq: [{ qEn: 'Can I add a personal message?', qHi: 'अपना मैसेज जोड़ सकते हैं?', aEn: 'Yes — add a gift note at checkout; we hand-write it on the card.', aHi: 'जी — चेकआउट पर गिफ्ट नोट जोड़ें, हम कार्ड पर लिख देंगे।' }],
    nutrition: [],
  },
  {
    slug: 'chhath-prasad-hamper', cat: 'chhath-prasad', nameEn: 'Chhath Prasad Hamper', nameHi: 'छठ प्रसाद हैम्पर',
    taglineEn: 'Thekua, khaja & diyas — argya-ready', taglineHi: 'अर्घ्य के लिए तैयार प्रसाद सेट',
    storyEn: 'Everything the four days ask for: 500g Chini thekua, 250g Gur thekua, Silao khaja, and a pair of hand-painted diyas packed in a soop-inspired tray.',
    storyHi: 'चारों दिनों के लिए: 500g चीनी ठेकुआ, 250g गुड़ ठेकुआ, सीलाव खाजा और हाथ से रंगे दो दीये, सूप-प्रेरित ट्रे में।',
    ingredientsEn: 'See individual products. All natural.', ingredientsHi: 'देखें अलग प्रोडक्ट। सब प्राकृतिक।',
    storageEn: 'Airtight. 30 days.', storageHi: 'एयरटाइट। 30 दिन।',
    shelfLifeDays: 30, mrp: 219900, price: 169900, stock: 18, isFeatured: true, images: [p('chhath-hamper'), p('story-mould')],
    variants: JSON.stringify([{ label: '1.25kg hamper', weightG: 1250, priceDelta: 0 }]),
    faq: [
      { qEn: 'Will it arrive before Chhath?', qHi: 'छठ से पहले आ जाएगा?', aEn: 'Order by Nov 4 for Nov 13 delivery to most pincodes; we prioritise Chhath orders first.', aHi: '4 नवंबर तक ऑर्डर करें तो 13 नवंबर तक पहुंच जाएगा। छठ ऑर्डर पहले भेजे जाते हैं।' },
    ],
    nutrition: [],
  },
];

// Reviews are NOT seeded — only real customer reviews live in the DB (approved after
// moderation or auto-approved for verified buyers). Products start with rating 0 / reviewCount 0
// and the UI shows a "New" badge until genuine reviews exist.

const pincodeRows = [
  ['110083', 'New Delhi (Mangol Puri)', 'Delhi', 4, 6], ['110001', 'New Delhi', 'Delhi', 5, 7],
  ['800001', 'Patna', 'Bihar', 2, 4], ['800020', 'Patna', 'Bihar', 2, 4],
  ['834001', 'Ranchi', 'Jharkhand', 3, 5], ['845401', 'Sitamarhi', 'Bihar', 2, 4],
  ['400001', 'Mumbai', 'Maharashtra', 5, 8], ['560001', 'Bengaluru', 'Karnataka', 5, 8],
  ['600001', 'Chennai', 'Tamil Nadu', 5, 8], ['700001', 'Kolkata', 'West Bengal', 3, 6],
  ['302001', 'Jaipur', 'Rajasthan', 4, 7], ['226001', 'Lucknow', 'Uttar Pradesh', 3, 5],
  ['208001', 'Kanpur', 'Uttar Pradesh', 4, 6], ['411001', 'Pune', 'Maharashtra', 5, 8],
  ['380001', 'Ahmedabad', 'Gujarat', 5, 8], ['500001', 'Hyderabad', 'Telangana', 5, 8],
  ['781001', 'Guwahati', 'Assam', 4, 7], ['492001', 'Raipur', 'Chhattisgarh', 4, 7],
  ['462001', 'Bhopal', 'Madhya Pradesh', 4, 7], ['751001', 'Bhubaneswar', 'Odisha', 4, 7],
  ['190001', 'Srinagar', 'J&K', 7, 10], ['603001', 'Chengalpattu', 'Tamil Nadu', 6, 9],
];

const settings = {
  announcement: { active: true, textEn: 'माटी, ममता आ नव वर्ष - सब एक संग', textHi: 'माटी, ममता आ नव वर्ष - सब एक संग', code: 'BIHARSE15', discount: '15% OFF', note: 'Limited stock' },
  hero: {
    titleEn: 'Order Fresh & Authentic Thekua From Bihar',
    titleHi: 'बिहार की परंपरा और स्वाद, अब आपके घर तक।',
    subEn: 'Each packet carries love, purity, and Bihar’s heritage in every bite.',
    ctaPrimary: 'Order Fresh Thekua', ctaSecondary: 'Our Story',
    proof: ['100% Homemade', 'Delivered in 5–8 days', 'Secured payments'],
  },
  business: { email: 'support@biharse.org', phone: '+91 97170 10083', address: 'Block H, House 158, Mangol Puri, New Delhi 110083', gstin: '' },
  shipping: { freeAbovePaise: 99900, flatPaise: 9900, defaultMinDays: 5, defaultMaxDays: 8 },
  flags: { music: false, exitIntent: true, whatsapp: false, reviews: true },
  footer: { signoff: 'Designed & Crafted with ❤️ in Bharat', tagHi: 'शुद्ध • पारंपरिक • विश्वसनीय' },
};

async function main() {
  // categories
  for (const c of Object.values(cat)) {
    await db.category.upsert({ where: { slug: c.slug }, update: { ...c }, create: { ...c } });
  }
  const cats = await db.category.findMany();
  const catId = Object.fromEntries(cats.map((c) => [c.slug, c.id]));

  // products
  for (const pr of products) {
    const base = {
      slug: pr.slug, nameEn: pr.nameEn, nameHi: pr.nameHi, taglineEn: pr.taglineEn, taglineHi: pr.taglineHi,
      storyEn: pr.storyEn, storyHi: pr.storyHi, ingredientsEn: pr.ingredientsEn, ingredientsHi: pr.ingredientsHi,
      storageEn: pr.storageEn, storageHi: pr.storageHi, shelfLifeDays: pr.shelfLifeDays,
      categoryId: catId[pr.cat], mrp: pr.mrp, price: pr.price, stock: pr.stock, lowStockAt: pr.lowStockAt ?? 12,
      isFeatured: pr.isFeatured ?? false, isDemo: pr.isDemo ?? false, batchDate: pr.batchDate ?? '',
      imagesJson: JSON.stringify(pr.images), variantsJson: pr.variants ?? variants3,
      faqJson: JSON.stringify(pr.faq ?? []), nutritionJson: JSON.stringify(pr.nutrition ?? []),
      seoTitle: `${pr.nameEn} — Order Fresh From Bihar | BiharSe`,
      seoDesc: `${pr.taglineEn}. 100% homemade, no preservatives, delivered across India in 5–8 days.`,
    };
    await db.product.upsert({ where: { slug: pr.slug }, update: base, create: base });
  }

  // ratings are recomputed from whatever real approved reviews exist (0 reviews → rating 0)
  const prods = await db.product.findMany();
  for (const prod of prods) {
    const agg = await db.review.aggregate({ where: { productId: prod.id, approved: true }, _avg: { rating: true }, _count: true });
    await db.product.update({ where: { id: prod.id }, data: { rating: Math.round((agg._avg.rating ?? 0) * 10) / 10, reviewCount: agg._count } });
  }

  // coupons
  await db.coupon.upsert({
    where: { code: 'BIHARSE15' },
    update: { active: true },
    create: { code: 'BIHARSE15', type: 'PERCENT', value: 15, minSubtotal: 0, note: 'Launch offer — 15% off everything' },
  });

  // Chhath years (2025 corrected, 2026 upcoming, 2027 estimate)
  const y = (d) => new Date(d);
  const years = [
    { year: 2025, nahayKhay: y('2025-10-25T06:00:00+05:30'), kharna: y('2025-10-26T06:00:00+05:30'), sandhyaArghya: y('2025-10-27T17:30:00+05:30'), ushaArghya: y('2025-10-28T06:30:00+05:30'), note: 'Corrected dates for Chhath Puja 2025' },
    { year: 2026, nahayKhay: y('2026-11-13T06:00:00+05:30'), kharna: y('2026-11-14T06:00:00+05:30'), sandhyaArghya: y('2026-11-15T17:28:00+05:30'), ushaArghya: y('2026-11-16T06:31:00+05:30'), note: 'Sunrise 06:31 / Sunset 17:28, Patna — tithi-verified' },
    { year: 2027, nahayKhay: y('2027-11-03T06:00:00+05:30'), kharna: y('2027-11-04T06:00:00+05:30'), sandhyaArghya: y('2027-11-05T17:30:00+05:30'), ushaArghya: y('2027-11-06T06:30:00+05:30'), note: 'Approximate — confirm tithi closer to the date' },
  ];
  for (const yr of years) {
    await db.chhathYear.upsert({ where: { year: yr.year }, update: { ...yr }, create: { ...yr } });
  }

  // pincodes
  for (const [pincode, city, state, minDays, maxDays] of pincodeRows) {
    await db.pincodeEstimate.upsert({ where: { pincode }, update: { city, state, minDays, maxDays }, create: { pincode, city, state, minDays, maxDays } });
  }

  // settings
  for (const [k, v] of Object.entries(settings)) {
    await db.siteSetting.upsert({ where: { key: k }, update: { valueJson: JSON.stringify(v) }, create: { key: k, valueJson: JSON.stringify(v) } });
  }

  // admin (Owner) from env
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@biharse.org';
  const adminPass = process.env.ADMIN_PASSWORD || 'biharse-admin-2026';
  await db.customer.upsert({
    where: { email: adminEmail },
    update: { role: 'OWNER', name: 'BiharSe Owner', emailVerified: true },
    create: { email: adminEmail, name: 'BiharSe Owner', role: 'OWNER', emailVerified: true, passwordHash: await bcrypt.hash(adminPass, 10) },
  });

  console.log('Seed complete:', { products: products.length, reviewsSeeded: 0, years: years.length, pincodes: pincodeRows.length, adminEmail });
}

main().finally(() => db.$disconnect());

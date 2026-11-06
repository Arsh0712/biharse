// BiharSe — editorial content shared across sections (design copy, not DB-CMS)
import type { ProductFaq } from './types';

export const PINNED_STORY = {
  titleEn: 'From a Bihari kitchen to your doorstep',
  titleHi: 'बिहारी रसोई से आपके द्वार तक',
  steps: [
    {
      n: 1, titleEn: 'Wheat flour & desi ghee', titleHi: 'आटा और देसी घी',
      descEn: 'Every morning starts with stone-ground wheat and cow ghee from a Mandi dairy we have trusted for nine years.',
      descHi: 'हर सुबह शुरू होती है चक्की के आटे और देसी घी से।',
      image: '/img/story-kneading.png',
    },
    {
      n: 2, titleEn: 'Jaggery melted low & slow', titleHi: 'गुड़ धीमी आंच पर पिघला',
      descEn: 'Sitamarhi jaggery melts in a copper pot until it threads — no sugar, no syrups, no shortcuts.',
      descHi: 'सीतामढ़ी का गुड़ तांबे की कड़ाही में धीमी आंच पर।',
      image: '/img/story-jaggery.png',
    },
    {
      n: 3, titleEn: 'Kneaded by hand, pressed by mould', titleHi: 'हाथ से गुंधा, मूल में थपका',
      descEn: 'The wooden moulds are older than our kitchen — each imprints a lotus from Mithila folk art onto every thekua.',
      descHi: 'लकड़ी के मूल में मिथिला की कमल छाप हर ठेकुआ पर उतरती है।',
      image: '/img/story-mould.png',
    },
    {
      n: 4, titleEn: 'Slow-fried in ghee', titleHi: 'घी में धीमा तला',
      descEn: 'Small batches, low flame, constant turning — the only way the centre stays soft and the rim stays crisp.',
      descHi: 'छोटे बैच, धीमी आंच — अंदर नरम, बाहर खस्ता।',
      image: '/img/story-frying.png',
    },
    {
      n: 5, titleEn: 'Hygienically packed same day', titleHi: 'उसी दिन स्वच्छ पैकिंग',
      descEn: 'Food-grade pouches, sealed within hours of frying, batch-dated by hand, boxed with a small diya sticker.',
      descHi: 'फूड-ग्रेड पाउच, हाथ से बैच-डेट, छोटे दिया स्टिकर के साथ।',
      image: '/img/story-packing.png',
    },
    {
      n: 6, titleEn: 'On its way to your home', titleHi: 'आपके घर की ओर',
      descEn: 'Dispatched across India in 5–8 days. Track every step; we pack Chhath orders first, always.',
      descHi: '5–8 दिन में पूरे भारत में। छठ के ऑर्डर सबसे पहले।',
      image: '/img/hero-ghat.png',
    },
  ],
};

export const COMPARE = {
  titleEn: 'Chini or Gur — which is yours?',
  titleHi: 'चीनी या गुड़ — आपकी पसंद?',
  left: {
    name: 'Chini Thekua', nameHi: 'चीनी ठेकुआ', image: '/img/thekua-chini-1.webp', slug: 'chini-thekua',
    color: 'var(--turmeric)',
    notes: [
      ['Taste', 'Light, clean sweetness with fennel lift'],
      ['Sweetness', '●●●○○'],
      ['Texture', 'Snappy crust, tender middle'],
      ['Shelf life', '30 days'],
      ['Best for', 'Chhath prasad & first-timers'],
      ['Pairs with', 'Adrak chai, cold milk'],
    ],
  },
  right: {
    name: 'Gur Thekua', nameHi: 'गुड़ ठेकुआ', image: '/img/thekua-gur-1.webp', slug: 'gur-thekua',
    color: 'var(--saffron)',
    notes: [
      ['Taste', 'Deep caramel, earthy jaggery warmth'],
      ['Sweetness', '●●●●○'],
      ['Texture', 'Chewier centre, darker crust'],
      ['Shelf life', '30 days'],
      ['Best for', 'Dadi-nani & chai connoisseurs'],
      ['Pairs with', 'Black tea, warm milk'],
    ],
  },
};

export const WHY_CARDS = [
  {
    icon: 'home',
    titleEn: '100% Homemade & Traditional',
    titleHi: 'पूरी तरह घर का और पारंपरिक',
    desc: 'Made in our family kitchen in New Delhi by hands from Mithila — recipes unchanged for three generations.',
    stat: 3, statSuffix: ' generations', statLabel: 'same recipe',
  },
  {
    icon: 'leaf',
    titleEn: 'Pure Ingredients, No Preservatives',
    titleHi: 'शुद्ध सामग्री, कोई प्रिज़र्वेटिव नहीं',
    desc: 'Stone-ground wheat, cow ghee, Sitamarhi jaggery, raw sugar. Nothing you cannot pronounce.',
    stat: 0, statSuffix: '', statLabel: 'preservatives, ever',
  },
  {
    icon: 'shield',
    titleEn: 'Freshly Made & Hygienically Packed',
    titleHi: 'ताज़ा बना, स्वच्छ पैक',
    desc: 'Small batches fried daily, sealed within hours, batch-dated by hand. Made to be eaten, not stored.',
    stat: 30, statSuffix: '+ days', statLabel: 'fresh shelf life',
  },
];

/**
 * Grievance Officer card — structure & labels only (Consumer Protection (E-commerce) Rules 2020).
 * Real officer details come from admin settings (business.grievance* keys); contact-view wires
 * settings values into this card and falls back to `pendingNote` when unset — never invented data.
 */
export const GRIEVANCE_CARD = {
  title: 'Grievance Officer',
  subtitle: 'Under the Consumer Protection (E-commerce) Rules 2020',
  pendingNote: 'To be appointed — details pending',
  fields: [
    { key: 'grievanceName', label: 'Name' },
    { key: 'grievanceDesignation', label: 'Designation' },
    { key: 'grievanceEmail', label: 'Email' },
    { key: 'grievancePhone', label: 'Phone' },
  ] as const,
  promise: 'Acknowledged within 48 hours · Resolved within 30 days',
};

export const HOME_FAQS: ProductFaq[] = [
  { qEn: 'How long does thekua stay fresh?', qHi: 'ठेकुआ कितने दिन ताज़ा रहता है?', aEn: '30 days in an airtight container — ghee acts as a natural preservative. We fry to order and ship the same week.', aHi: 'एयरटाइट डिब्बे में 30 दिन — घी नैसर्गिक प्रिज़र्वेटिव है।' },
  { qEn: 'When will my order arrive?', qHi: 'मेरा ऑर्डर कब आएगा?', aEn: 'Freshly prepared, hygienically packed, delivered across India in 5–8 days. Patna & Ranchi are faster (2–4 days). Check your pincode in the delivery checker.', aHi: 'पूरे भारत में 5–8 दिन। पटना-रांची में 2–4 दिन।' },
  { qEn: 'Are Chhath orders delivered before Arghya?', qHi: 'छठ के ऑर्डर अर्घ्य से पहले आते हैं?', aEn: 'Yes — Chhath orders are prioritised on our packing line. Order by Nov 4 for Nov 13 delivery to most pincodes.', aHi: 'जी — छठ के ऑर्डर पहले पैक होते हैं। 4 नवंबर तक ऑर्डर करें।' },
  { qEn: 'What ingredients do you use?', qHi: 'कौन सी सामग्री इस्तेमाल होती है?', aEn: 'Only what our nani used: wheat flour, cow ghee, raw sugar or jaggery, fennel, sesame, cardamom. No preservatives, no essence, no shortening.', aHi: 'सिर्फ वही जो नानी इस्तेमाल करती थीं। कोई प्रिज़र्वेटिव नहीं।' },
  { qEn: 'What payment methods work?', qHi: 'कौन से भुगतान तरीके हैं?', aEn: 'Secured payments — UPI (intent & QR), cards, netbanking, wallets. No COD; fresh food deserves a tight chain.', aHi: 'रेज़रपे से UPI, कार्ड, नेटबैंकिंग — सब चलता है।' },
  { qEn: 'What about refunds?', qHi: 'रिफंड कैसे मिलेगा?', aEn: 'Damaged or wrong item? Photo within 48 hours → full refund to the original payment method in 3–5 working days, no arguments.', aHi: 'खराब या गलत सामान? 48 घंटे में फोटो भेजें — 3–5 दिन में पूरा रिफंड।' },
  { qEn: 'Do you ship outside India?', qHi: 'विदेश में शिप करते हैं?', aEn: 'Not yet — we are a small batch kitchen and cannot guarantee freshness across borders. But we are working on it!', aHi: 'अभी नहीं — ताज़गी की गारंटी नहीं है। जल्द आ रहे हैं!' },
];

export const RITUAL_DAYS = [
  {
    key: 'nahayKhay', n: 1, titleEn: 'Nahay Khay', titleHi: 'नहाय खाय',
    descEn: 'The first day of purification. Devotees bathe in the holy river and carry water home for the offerings. The kitchen is scrubbed spotless; the vrat begins with a single satvik meal of lauki-chana dal, arwa chawal — cooked by the parvaitin herself.',
    descHi: 'शुद्धि का पहला दिन। नदी में स्नान, घर के लिए पवित्र जल। रसोई चमकती है और व्रत आरंभ होता है।',
    foodEn: 'Our pick: start the vrat with light sattu laddu energy balls.',
  },
  {
    key: 'kharna', n: 2, titleEn: 'Kharna', titleHi: 'खरना',
    descEn: 'The day of the great sweet. From sunrise to moonrise, a complete fast without even water. At night, after the moon rises, kheer puri is prepared in pure ghee on a clay chulha — the only meal that breaks 36 hours of tapasya, and the prasad for all four days is cooked.',
    descHi: '36 घंटे के निर्जल व्रत के बाद मूंगे के चूल्हे पर बनता है खीर-पूरी का प्रसाद।',
    foodEn: 'Our pick: Gur Thekua — the deep sweetness this day deserves.',
  },
  {
    key: 'sandhyaArghya', n: 3, titleEn: 'Sandhya Arghya', titleHi: 'संध्या अर्घ्य',
    descEn: 'The evening of the sun. Families walk to the ghat with soop, daura, sugarcane, thekua and thekua-shaped tikki in hand. As the sun melts into the river, thousands of lamps float and the sandhya arghya is offered to Surya with folded hands and a soaked red netrapatra.',
    descHi: 'सूरज डूबते समय सूप-ठेकुआ-गन्ने के साथ घाट। हज़ारों दीये बहते हैं और अर्घ्य चढ़ता है।',
    foodEn: 'Our pick: Chhath Prasad Hamper — soop-ready, argya-ready.',
  },
  {
    key: 'ushaArghya', n: 4, titleEn: 'Usha Arghya', titleHi: 'उषा अर्घ्य',
    descEn: 'Before the first light, the ghats hum again. The rising sun is greeted standing waist-deep in cold water — the final arghya. Bihaniya, the dawn song, ends; prasad is distributed; families break their fast and bless each other: Chhathi Maiya sabke manokamna puran karein.',
    descHi: 'पहली किरण से पहले फिर घाट। उगते सूरज को अंतिम अर्घ्य, फिर प्रसाद वितरण और आशीर्वाद।',
    foodEn: 'Our pick: Chini Thekua 500g — share the morning with everyone.',
  },
];

export const CHHATH_FACTS = [
  { icon: 'sun', titleEn: 'Sun Worship', titleHi: 'सूर्य उपासना', desc: 'Chhath is the only Vedic festival where both setting and rising sun are worshipped — gratitude to the source of all energy.' },
  { icon: 'water', titleEn: 'Sacred Waters', titleHi: 'पवित्र जल', desc: 'Standing in rivers and ponds, offering arghya with soaked netrapatra — water carries the devotion of millions.' },
  { icon: 'heart', titleEn: 'Pure Devotion', titleHi: 'शुद्ध भक्ति', desc: '36-hour nirjala fasts, midnight kheer on clay chulhas, folk songs echoing till dawn — faith in its rawest form.' },
  { icon: 'leaf', titleEn: "Nature's Blessing", titleHi: 'प्रकृति का आशीर्वाद', desc: 'Everything is biodegradable: bamboo soop, clay diyas, sugarcane, whole grains. Chhath is ecology before it is ritual.' },
];

export const CHHATH_STORY = {
  introEn: 'Chhath Puja — Mahaparv of the Surya upasak',
  paragraphsEn: [
    'Chhathi Maiya is worshipped as the sixth form of Prakriti — Devi Katayani, sister of Surya, nursing mother of Kartikeya. She is also known as Usha: the first light of dawn, the giver of progeny and prosperity.',
    'The Mahabharata tells that Draupadi, advised by the sage Dhaumya, performed the Chhath vrat — and whatever she wished, she received. In the Ramayana, it is said that after Rama and Sita returned from exile and performed the Rajyabhishek, Sita observed Chhath on the banks of the Ganga at the sage Valmiki’s hermitage.',
    'Kunti, too, offered arghya to Surya after her sons returned from the forest. In Mithila, the tradition says Sita herself began this vrat — which is why Chhath without Mithila is unimaginable, and why every thekua carries the imprint of her kitchen.',
  ],
  closing: 'छठी मइया सबके मनोकामना पूर्ण करें। 🙏',
};

export const STORY_PAGE = {
  eyebrow: 'Our Story · Our Kitchen',
  titleEn: 'Small batch. Big devotion.',
  paragraphs: [
    'BiharSe began in a one-burner kitchen in Mangol Puri, Delhi — with a mould our nani carried from her maayka in Sitamarhi, and a promise: when Biharis miss home, we will make home for them.',
    'We are not a factory. Every thekua is pressed by hand, fried in small batches, packed the same day and dated by hand. When the batch runs out, we fry tomorrow — freshness is not a marketing word here, it is a limit we accept.',
    'Every Chhath, we watch the sunrise orders flood in from Dubai to Bengaluru — soop images in one hand, soop-less balconies in another. This kitchen exists so that no Bihari celebrates Mahaparv without the taste of home.',
  ],
  images: ['/img/story-kneading.png', '/img/kitchen-wide.png', '/img/story-frying.png'],
  values: [
    ['माटी', 'Soil — everything starts with honest ingredients'],
    ['ममता', 'Mamta — cooked like it is for your own family'],
    ['परंपरा', 'Parampara — recipes that outrun us, we only guard them'],
  ],
};

export const POLICIES: Record<string, { title: string; updated: string; sections: { h: string; p: string }[] }> = {
  privacy: {
    title: 'Privacy Policy', updated: 'November 2026',
    sections: [
      { h: 'What we collect', p: 'Only what shipping and GST invoices legally need: name, delivery address, phone, email, order history. Payment instruments never touch our servers — Razorpay handles them under PCI-DSS.' },
      { h: 'How we use it', p: 'To prepare, pack, ship and support your orders; to send transactional emails (order confirmation, shipping, delivery); with your explicit consent, for analytics (GA4/Meta) and occasional batch stories via newsletter. DPDP Act 2023 compliant: analytics fire only after opt-in.' },
      { h: 'What we never do', p: 'We do not sell, rent or trade your data. No hidden trackers. No third-party ad networks beyond the consent-gated pixel.' },
      { h: 'Data removal', p: 'Write to support@biharse.org and we will erase your account and PII within 30 days, except records required by tax law (invoices are retained as mandated).' },
      { h: 'Security', p: 'HTTPS everywhere, HMAC-verified webhooks, hashed OTPs, rotating HttpOnly session cookies, audit-logged admin access.' },
    ],
  },
  refund: {
    title: 'Refund & Cancellation Policy', updated: 'November 2026',
    sections: [
      { h: 'Damaged or wrong item', p: 'Send a photo within 48 hours of delivery to support@biharse.org with your order number — full refund to the original payment method in 3–5 working days. No return shipping of food items; keep or dispose of them.' },
      { h: 'Before dispatch', p: 'Cancel any unpaid or paid order before dispatch for a full refund — one click in your account or a message to us.' },
      { h: 'After dispatch', p: 'Since everything is perishable food, dispatched orders cannot be returned. If tracking shows a delay beyond the promised window, we refund shipping in full.' },
      { h: 'Partial refunds', p: 'For mixed hampers with one affected item, we refund that item proportionally. Refunds are processed via Razorpay to the same instrument.' },
    ],
  },
  shipping: {
    title: 'Shipping Policy', updated: 'November 2026',
    sections: [
      { h: 'The promise', p: 'Freshly prepared, hygienically packed, delivered across India in 5–8 days. Bihar/Jharkhand metros: 2–4 days. Metro cities: 4–6. Remote pincodes: 7–10.' },
      { h: 'Free shipping', p: 'Orders above ₹999 ship free. Below that, a flat ₹99 covers cold-chain-safe padded packaging.' },
      { h: 'Chhath priority', p: 'During Chhath week, all Mahaparv orders are packed and dispatched first, in the order they were paid.' },
      { h: 'Tracking', p: 'AWB and courier updates land in your email at every stage. Track anytime from the Track Order page with your order number.' },
    ],
  },
  terms: {
    title: 'Terms of Service', updated: 'November 2026',
    sections: [
      { h: 'The service', p: 'BiharSe (operated from Block H, House 158, Mangol Puri, New Delhi 110083) sells freshly prepared food products online in India. Prices are in INR and include GST.' },
      { h: 'Orders & pricing', p: 'All totals are computed server-side at checkout. If a stock or pricing error is detected after payment, we refund in full and inform you immediately — no silent substitutions.' },
      { h: 'Food safety', p: 'Our shelf-life guidance (30 days for thekua, 45 for namkeen, per-product for others) assumes airtight, dry storage. We are a homemade brand; FSSAI registration is in process for the production kitchen.' },
      { h: 'Payments', p: 'All payments are processed by Razorpay (UPI/cards/netbanking/wallets). We never store card details. Sandbox mode is used only in demo environments.' },
      { h: 'Liability & law', p: 'Nothing here limits your statutory rights. Disputes are subject to Delhi jurisdiction.' },
    ],
  },
  accessibility: {
    title: 'Accessibility Statement', updated: 'November 2026',
    sections: [
      { h: 'Our target', p: 'BiharSe aims to conform to WCAG 2.2 Level AA across the storefront — every template, the checkout flow and the account area. Accessibility is treated as a release requirement, not an afterthought: new sections ship only after keyboard and screen-reader checks.' },
      { h: 'What we already do', p: 'The entire store is keyboard-navigable with visible focus states and skip-style navigation; all interactive targets meet a 44px minimum touch size. Animations auto-degrade under your OS reduced-motion preference (no parallax, no flying elements — content appears without motion). Text scales cleanly to 200% without loss of function, colour contrast on body copy meets or exceeds AA, images carry descriptive alt text, forms label every field with error messages announced to assistive technology, and star ratings/compliance data expose plain-text equivalents for screen readers.' },
      { h: 'Known limitations', p: 'We are honest about gaps: payment is completed inside Razorpay-hosted iframes whose internal accessibility we do not control; some third-party embeds (maps, chat widgets if enabled) may not be fully AA-compliant; a few decorative festival animations are skipped rather than adapted under reduced motion; and Hindi Devanagari display fonts may render with slightly lower letter contrast than their English counterparts.' },
      { h: 'Feedback & contact', p: 'If any part of this store blocks you, write to support@biharse.org describing the page and the assistive technology you use — we aim to acknowledge within 48 hours. Unresolved accessibility complaints can be escalated to our Grievance Officer (details on the Contact page) under the process below.' },
      { h: 'Enforcement', p: 'This commitment is made under the Consumer Protection (E-commerce) Rules 2020 and guided by the Rights of Persons with Disabilities Act, 2016 and GIGW (Guidelines for Indian Government Websites) good practices. Grievances are acknowledged within 48 hours and redressed within 30 days as required by the E-commerce Rules.' },
    ],
  },
};

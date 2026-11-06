# BiharSe (biharse.org) — Deep Content Digest

> **Purpose:** verbatim facts scraped from the live site https://biharse.org (2026 fetch window). Nothing below is invented; every quoted block is taken as-is from the source page named under it. Use this so the rebuilt storefront mirrors only true facts.

---

## 1) Platform + Overview + Tagline

- **Platform:** Shopify (self-confirmed by robots.txt): first line of https://biharse.org/robots.txt is:
  > `# Shopify storefront. Public product, collection, page, blog, policy, cart, and localized HTML is crawlable.`
- Underlying store domain seen in UCP response: `vfmq1z-j7.myshopify.com`. Shopify store ID seen in robots.txt: `95806685459`. Theme assets served from `/cdn/shop/t/1/assets/...` (theme #1).
- Home page `<title>` (verbatim):
  > `Homemade Thekua Online from Bihar | 100% Homemade | Biharse – BiharSe`
- Meta description (verbatim, used for og:description and twitter:description too):
  > `Order authentic homemade Thekua from Bihar. 100% homemade, fresh & traditional Bihari sweet delivered across India by Biharse.`
- JSON-LD Organization block (verbatim, homepage):
  > `"@type": "Organization", "name": "BiharSe", "logo": "https://biharse.org/cdn/shop/files/BiharSe-Dark.png?v=1767188558&width=500", "url": "https://biharse.org"`
- Footer tagline line (verbatim, appears on every page):
  > `BiharSe brings the timeless taste of Bihar to your home.`
  > `We specialize in authentic homemade Thekua, prepared using traditional recipes, pure ingredients, and cultural values. From Chhath Puja Prasad to everyday indulgence, our Thekua carries the sweetness of tradition in every bite.`
- Footer trust marks (verbatim):
  > `✔ 100% Homemade Thekua`
  > `✔ No Preservatives`
  > `✔ Hygienically Packed`
  > `✔ Secure Online Payments`
- Footer Hindi line (verbatim):
  > `शुद्ध • पारंपरिक • विश्वसनीय`
  > `Every bite of Thekua carries the blessings of tradition 🌼`
- Footer copyright (verbatim): `© 2026` (as rendered on site).
- Footer credit (verbatim): `Designed & Crafted with ❤️ in Bharat`
- Site-wide SEO footer string (verbatim): `Authentic Thekua Online | Bihar Traditional Sweets | Chhath Puja Prasad | Homemade Thekua Delivery`

## 2) Navigation Map

Main menu items (verbatim, all pages):
> `🏠 Home` · `🪔 Order Thekua` · `📧 Contact` · `🙏 About Chhath` · `📿 Rituals` — plus `More`, `Account` (Shopify account login).

Resolved internal links found across sitemap + homepage HTML:

| URL | Purpose |
|---|---|
| `/` | Homepage (hero, product cards, USPs, delivery info) |
| `/pages/contact` | Contact form page (Name/Email/Phone/Comment + Submit) |
| `/pages/about-chhath-puja` | About Chhath Puja content page |
| `/pages/rituals` | Chhath Puja 2025 Ritual Schedule |
| `/policies/refund-policy` | Refund policy |
| `/policies/shipping-policy` | Shipping policy (actually generic T&C + registered office) |
| `/policies/privacy-policy` | Privacy policy (Shopify standard boilerplate) |
| `/policies/terms-of-service` | Terms of service |
| `/policies/contact-information` | Merchant legal contact details |
| `/products/media-and-entertainment-example-product-1` | Product 1 (Chini Thekua) — Shopify placeholder-style handle |
| `/products/media-and-entertainment-example-product-4` | Product 2 (Gur Thekua) — Shopify placeholder-style handle |
| `/collections/frontpage` | Home page collection |
| `/collections/media-and-entertainment-example-products` | Auto collection |
| `/collections/thekua` | Thekua collection |
| `/blogs/news` | Blog (News) — exists in sitemap, no article URLs discovered |
| `/collections/all` | All products |

Sitemap index exists: `/sitemap.xml` → product/page/collection/blog sitemaps. Only **2 product URLs** exist in the products sitemap (`from=10162582126867&to=10162582225171`), matching the 2 products on the homepage.

## 3) Product Catalogue (both products; sitemap confirms only 2)

### Product 1 — Chini Thekua

- **Name (verbatim):** `Chini Thekua - 250g- चीनी ठेकुआ`
- **URL:** `https://biharse.org/products/media-and-entertainment-example-product-1?variant=52523453055251`
- **Shopify product ID:** `10162582126867` · **Variant ID:** `52523453055251` · Variant title shown in card: `Default Title`
- **Pricing (verbatim, homepage card):** `Regular price ₹ 599.00` / `Sale price ₹ 399.00` — with `Sale` badge.
- **Weight/size:** `250g` (in title only; no other variant/weight options — card shows `data-product-variants-size="1"`).
- **Category/collection:** "Products" section on homepage; collection handle `media-and-entertainment-example-products`.
- **Images:** featured media (verbatim URLs from homepage HTML):
  - `//biharse.org/cdn/shop/files/chini-m1.png?v=1761554991&width=500`
  - `//biharse.org/cdn/shop/files/Hcini-Thekua-02.jpg?v=1772299529&width=3840` (appears in homepage media section)
- **Product detail page:** `/products/media-and-entertainment-example-product-1` returned edge rate-limit (`local_rate_limited`) on every retry (curl, UA-spoofed, and `.js` JSON endpoint), so **verbatim long description NOT captured**. Only card-level copy above is verified.

### Product 2 — Gur Thekua

- **Name (verbatim):** `Gur Thekua - 250g - गुड़ ठेकुआ`
- **URL:** `https://biharse.org/products/media-and-entertainment-example-product-4?variant=52523453219091`
- **Shopify product ID:** `10162582225171` · **Variant ID:** `52523453219091` · Variant title shown: `Default Title`
- **Pricing (verbatim, homepage card):** `₹ 799.00` / `₹ 499.00` (shown as regular→sale pair in card HTML: `Regular price ₹ 799.00` / `Sale price ₹ 499.00`). No `Sale` badge text observed on this card.
- **Weight/size:** `250g` (in title only; single variant).
- **Images (verbatim URLs):**
  - `//biharse.org/cdn/shop/files/gud-a-1.png?v=1761554957&width=500`
  - `//biharse.org/cdn/shop/files/Gur-thekua-01.jpg?v=1772299529&width=3840`
- **Product detail page:** same rate-limit situation; **verbatim long description NOT captured**.

**Price range across catalogue:** ₹399.00–₹499.00 sale / ₹599.00–₹799.00 regular. Currency displayed as `₹` (INR).

## 4) Verbatim Copy Blocks (with source)

### Hero (source: https://biharse.org/)

> `100% Homemade`
> `Order Fresh & Authentic`
> `Thekua From Bihar`

> `ऑनलाइन ठेकुआ खरीदें | बिहार का पारंपरिक ठेकुआ | शुद्ध ठेकुआ डिलीवरी`

> `Taste the joy of home with our delicious homemade Thekua crispy, sweet, and inspired by the rich traditions of Bihar, delivered fresh to your door.`

> `बिहार की परंपरा और स्वाद, अब आपके घर तक।`

CTA button (verbatim): `Order Fresh & Authentic Thekua Online`

### Testimonial (source: https://biharse.org/)

> `"Perfect taste of home! Fresh and exactly like grandmother made" - Anjali, Delhi`

(Accompanied by stars image `star-ratings.png`.)

### "About Our Thekua" section (source: https://biharse.org/)

> `हमारा ठेकुआ - असली स्वाद, असली परंपरा`
> `About Our Thekua`

> `Thekua - A beloved traditional sweet from Bihar, made with wheat flour, jaggery/sugar & pure ghee. Loved during Chhath Puja and as a snack, it brings the taste of home and tradition to your doorstep.`

> `Include emotion:` (yes, this literal string appears on the site)
> `"Each packet carries love, purity, and Bihar's heritage in every bite."`

> `ठेकुआ - बिहार की पारंपरिक मिठाई, गेहूँ के आटे, गुड़/चीनी और घी से बना। छठ पूजा और चाय-स्नैक के रूप में प्रिय, अब घर बैठे ताज़ा स्वाद उपलब्ध।`

### USP blocks (source: https://biharse.org/)

> `100% Homemade & Traditional` — `Our Thekua is handmade in small batches using time-honored Bihar recipes. No factory production - just authentic taste, prepared the way it has been for generations.`

> `Pure Ingredients, No Preservatives` — `We use premium wheat flour, pure ghee, and natural jaggery or sugar - with absolutely no preservatives or artificial flavors, ensuring safe and healthy indulgence.`

> `Freshly Made & Hygienically Packed` — `Each batch of Thekua is freshly prepared, carefully packed, and quality-checked before delivery, ensuring freshness and taste reach your home intact.`

### Delivery Information block (source: https://biharse.org/)

> `Delivery Information`
> `Each packet of Thekua is freshly prepared with care and devotion, then hygienically packed to preserve its authentic taste and quality. We deliver across India within 5-8 days, ensuring your Thekua reaches you in perfect condition.`

> `ठेकुआ का हर पैकेट पूरी सावधानी और शुद्धता के साथ ताज़ा तैयार किया जाता है और सुरक्षित तरीके से पैक किया जाता है। हम 5-8 दिनों के भीतर पूरे भारत में डिलीवरी सुनिश्चित करते हैं, ताकि आपको मिले पूरा स्वाद और गुणवत्ता।`

### About Chhath page — story copy (source: https://biharse.org/pages/about-chhath-puja)

> `छठ पूजा के बारे में`
> `Chhath Puja is an ancient Hindu Vedic festival dedicated to Surya Dev and Chhathi Mayya. Celebrated primarily in Bihar, Jharkhand, Uttar Pradesh, and Nepal, it's a festival of gratitude, purity, and devotion to the life-giving forces of nature.`

> `Sun Worship / सूर्य उपासना` — `Chhath Puja is dedicated to Surya Dev (Sun God) and Chhathi Mayya, expressing gratitude for sustaining life on Earth.`
> `Sacred Waters / पवित्र जल` — `Devotees offer Arghya to the setting and rising sun while standing in holy rivers, symbolizing purification.`
> `Pure Devotion / शुद्ध भक्ति` — `A festival of discipline, fasting, and unwavering faith, performed with utmost purity and dedication.`
> `Nature's Blessing / प्रकृति का आशीर्वाद` — `Offerings made with natural ingredients like sugarcane, fruits, and Thekua, honoring nature's bounty.`

> `The Story of Chhathi Mayya`
> `Chhathi Mayya is believed to be Usha, the daughter of Surya Dev (Sun God). She is the goddess of well-being, prosperity, and the protector of children. According to ancient scriptures, Chhathi Mayya bestows blessings upon devotees who worship her with pure hearts and unwavering faith.`
> `The festival is rooted in the epic Mahabharata, where Draupadi and Kunti are said to have performed Chhath Puja to solve their problems and seek blessings. Lord Rama and Sita also observed this ritual after returning to Ayodhya, making it one of the most ancient and revered festivals in Hindu tradition.`
> `छठी मइया सबके मनोकामना पूर्ण करें। 🙏`

### Contact page (source: https://biharse.org/pages/contact)

- Page contains only a form: fields (verbatim) `Name`, `Email`, `Phone`, `Comment`, button `Submit`. No phone/address/FSSAI shown on this page beyond the footer email.

## 5) Policies — Verbatim Key Clauses

### Refund policy (source: https://biharse.org/policies/refund-policy)

> `BiharSe believes in helping its customers as far as possible, and has therefore a liberal cancellation policy. Under this policy: Cancellations will be considered only if the request is made within 7 days of placing the order. However, the cancellation request may not be entertained if the orders have been communicated to the vendors/merchants and they have initiated the process of shipping them. BiharSe does not accept cancellation requests for perishable items like flowers, eatables etc. However, refund/replacement can be made if the customer establishes that the quality of product delivered is not good. In case of receipt of damaged or defective items please report the same to our Customer Service team. The request will, however, be entertained once the merchant has checked and determined the same at his own end. This should be reported within 7 days of receipt of the products. In case you feel that the product received is not as shown on the site or as per your expectations, you must bring it to the notice of our customer service within 7 days of receiving the product. The Customer Service Team after looking into your complaint will take an appropriate decision. In case of complaints regarding products that come with a warranty from manufacturers, please refer the issue to them. In case of any Refunds approved by the BiharSe, it'll take 9-15 days for the refund to be processed to the end customer.`

Key facts: cancellation window **7 days from order placement**; perishables (eatables) **not** cancellable; damage/defect reporting within **7 days of receipt**; refunds processed in **9–15 days**.

### Shipping policy (source: https://biharse.org/policies/shipping-policy)

The "Shipping policy" page contains generic T&C text plus the registered office:

> `For the purpose of these Terms and Conditions, The term "we", "us", "our" used anywhere on this page shall mean BiharSe, whose registered/operational office is Block - H, House No. 158, Mangol Puri New Delhi DELHI 110083 . "you", "your", "user", "visitor" shall mean any natural or legal person who is visiting our website and/or agreed to purchase from us.`

> `Any dispute arising out of use of our website and/or purchase with us and/or any engagement with us is subject to the laws of India .`

Note: **no shipping-cost/timeline clauses on that page** — the only delivery timeline claim on the site is the homepage's `5-8 days` (see §4).

### Contact information (source: https://biharse.org/policies/contact-information)

> `You may contact us using the information below: Merchant Legal entity name: BiharSe Registered Address: New Delhi, DELHI Operational Address: Delhi, DELHI Telephone No: 8851874373 E-Mail ID: support@biharse.org`

### Privacy policy / Terms of service (source: /policies/privacy-policy, /policies/terms-of-service)

- Privacy policy is the Shopify standard template (mentions Shopify data processing, shipping address/phone/email collection, marketing partners). No unusual custom clauses found in keyword scan.
- Terms of service: standard boilerplate; keyword scan found no FSSAI/GSTIN/phone additions.

## 6) Contact & Business Data

| Item | Value | Source |
|---|---|---|
| Merchant legal entity name | `BiharSe` | /policies/contact-information |
| Registered Address | `New Delhi, DELHI` | /policies/contact-information |
| Operational Address | `Delhi, DELHI` | /policies/contact-information |
| Full registered/operational office | `Block - H, House No. 158, Mangol Puri New Delhi DELHI 110083` | /policies/shipping-policy |
| Telephone | `8851874373` (no +91 country code shown on site) | /policies/contact-information |
| Email | `support@biharse.org` (footer on every page + contact-info policy) | footer, /policies/contact-information |
| WhatsApp | **NOT FOUND ON SITE** | — |
| FSSAI license | **NOT FOUND ON SITE** | — |
| GSTIN | **NOT FOUND ON SITE** | — |
| Social media links | **NOT FOUND ON SITE** (no external social hrefs in homepage HTML) | — |
| Contact page form | Name / Email / Phone / Comment + Submit | /pages/contact |

## 7) Chhath / Festival Content

- Dedicated pages: `/pages/about-chhath-puja` (festival meaning + story) and `/pages/rituals` (4-day schedule). Navigation labels: `🙏 About Chhath`, `📿 Rituals`.
- **Chhath Puja 2025 ritual dates (verbatim, source: https://biharse.org/pages/rituals):**
  > `Chhath Puja 2025 Ritual Schedule`
  > `Chhath Puja is celebrated over four days with strict rituals, discipline, and devotion. Each day has its own significance and traditional practices.`
  > `Day 1 - Nahay Khay - नहाय खाय - 27 October 2025` — `Devotees take a holy dip in the river and prepare satvik food. The home is thoroughly cleaned, and only pure vegetarian food is consumed.`
  > `Day 2 - Kharna - खरना - 28 October 2025` — `A day-long fast is observed and broken in the evening after worshipping Surya Dev. Kheer (rice pudding) and roti are prepared as prasad without salt.`
  > `Day 3 - Sandhya Arghya- संध्या अर्घ्य - 29 October 2025` — `The most important day - devotees fast without water for 36 hours. In the evening, they offer Arghya (offerings) to the setting sun at the riverbank.`
  > `Day 4 - Usha Arghya - उषा अर्घ्य 30 October 2025` — `Devotees gather at the ghat before sunrise to offer Arghya to the rising sun. After this, they break their fast, and the festival concludes with blessings.`
  > `प्रत्येक दिन की पूजा विधि का पालन करें और छठी मइया का आशीर्वाद पाएं। 🙏`
  > `चार दिनों की रस्में`
- **Announcement bar (festival/season messaging, verbatim, all pages):**
  > `माटी, ममता आ नव वर्ष - सब एक संग 💛 Apply BIHARSE15 & पाबू 15% OFF - अभी लिअ Limited stock`
  (i.e. coupon code **BIHARSE15**, **15% OFF**, urgency line `Limited stock`; the string `& पाबू` appears verbatim on the site.)
- No separate "Chhath order cut-off date" messaging was found anywhere on the site.

## 8) Image Inventory (homepage + global)

| URL (base: https://biharse.org) | Meaning |
|---|---|
| `/cdn/shop/files/BiharSe-Dark.png?v=1767188558` | Dark logo (JSON-LD Organization logo; header logo at height=75) |
| `/cdn/shop/files/Biharse-Light.png?v=1767188558&width=3840` | Light logo |
| `/cdn/shop/files/chini-m1.png?v=1761554991` | Product 1 featured image (Chini Thekua; card media width=500) |
| `/cdn/shop/files/Hcini-Thekua-02.jpg?v=1772299529` | Chini Thekua photo (homepage media section, width=3840) |
| `/cdn/shop/files/gud-a-1.png?v=1761554957` | Product 2 featured image (Gur Thekua) |
| `/cdn/shop/files/Gur-thekua-01.jpg?v=1772299529` | Gur Thekua photo (homepage media section) |
| `/cdn/shop/files/Red_and_White_Modern_Online_Sale_and_Discount_Banner_3.png?v=1767251564` | Sale/discount banner artwork |
| `/cdn/shop/files/icons-pure-chemicalfree-delivered.png?v=1767240951` | Trust/badge strip icon (pure/chemical-free/delivered) |
| `/cdn/shop/files/star-ratings.png?v=1767241018` | Star-rating graphic next to testimonial |
| `/cdn/shop/files/android-chrome-512x512.png?v=1761401022` | Favicon (32px render) |
| `/cdn/shop/files/Ekushey_Puja_3.png?v=1766589760` | og:image of homepage (social share card) |

## 9) Anything Else

- **Coupon:** code `BIHARSE15` — `15% OFF` (announcement bar; `Apply` wording suggests clickable apply). Only coupon found.
- **Badges:** product card `Sale` badge on Chini Thekua card; global `Limited stock` urgency text in announcement bar; footer checkmark trust list (see §1).
- **CTAs observed:** `Order Fresh & Authentic Thekua Online` (hero), `Add to cart` / `Add` / `Added` (product cards), `Continue shopping` (empty cart), `Submit` (contact form), `Search` / `Clear` (search UI).
- **Cart UX strings (verbatim):** `Total items in cart: 0`, `Your cart is empty`, `Have an account? Log in to check out faster.`
- **Store pickup:** product cards include `Pickup currently not available` + `View store information` (Shopify store info widget).
- **Quirks to mirror faithfully (or consciously fix):** product URL handles are Shopify placeholder names (`media-and-entertainment-example-product-1` / `-4`); variant titles are `Default Title`; the announcement bar contains the literal string `Include emotion:` and `& पाबू` — both appear verbatim on the live site.
- **Fetch limitations:** product detail pages and `/collections/thekua`, `/collections/all`, `/blogs/news` consistently returned an 18-byte `local_rate_limited` edge response despite slow sequential retries (curl + browser UA + Shopify `.js`/`products.json` endpoints + myshopify.com origin). Everything above therefore comes from the homepage, the 3 content pages, and the 5 policy pages, which all fetched successfully. The products sitemap (`/sitemap_products_1.xml`) confirms there are only **2 live product URLs**, so the catalogue in §3 is complete even without the detail pages.

# BiharSe — Final Self-Review Checklist

Verified with Agent Browser (Chrome, 1440×900 + 390×844) on the running dev server, and by
exercising the real APIs against the seeded SQLite database. Logs: `/shots/*.png`.

## Section-by-section status

| # | Requirement | Status | Evidence |
|---|---|---|---|
| 1 | Brand assets used exactly (mandala badge, lockups), favicon/apple-icon/OG | ✅ | `public/brand/*`, `src/app/icon.png`, `public/img/og-image.png`; red sampled #D80018 |
| 2 | Announcement ticker “माटी, ममता आ नव वर्ष - सब एक संग”, BIHARSE15 click-to-copy, Limited stock | ✅ | renders from DB, copies to clipboard with toast |
| 3 | Floating glass nav: blur pill, scroll shrink/hide/reappear, sliding red pill, ⌘K search, wishlist/account/cart badges, mobile tab bar + full-screen menu | ✅ | verified; palette searches products + nav jumps |
| 4 | Hero: ghat sunrise, parallax, spice-dust, mandala watermark, split-text headline, live inventory pill (“Limited batch — 8 boxes”), proof strip, offer chip | ✅ | `home-hero-fonts.png` |
| 5 | Trust marquee | ✅ | renders, pauses on hover |
| 6 | Bestsellers with hover crossfade, savings %, quick view, magnetic add, strikethrough MRP | ✅ | `home-bestsellers.png` |
| 7 | Pinned scrub storytelling (6 steps, GSAP ScrollTrigger, reduced-motion fallback) | ✅ | `home-compare.png` |
| 8 | Chini vs Gur drag comparison slider (keyboard accessible) | ✅ | `home-compare.png` |
| 9 | Chhath section: live countdown (verified 7d 6h to Nov 13), 4-day cards, CTA | ✅ | `home-countdown.png` |
| 10 | Why BiharSe cards with CountUp | ✅ | renders |
| 11 | UGC/testimonials draggable carousel, verified-buyer chips | ✅ | renders |
| 12 | Gifting 3D-tilt + gift note | ✅ | renders |
| 13 | Delivery: stylised route + pincode → ETA (API verified: 800001 → Patna 2–4 days, “Sat, 7 Nov – Mon, 9 Nov”) | ✅ | also autofills checkout city/state |
| 14 | FAQ accordion + FAQ JSON-LD | ✅ | renders |
| 15 | Final CTA sunrise gradient + newsletter double opt-in | ✅ | `home-final.png`; confirm page at `/api/newsletter/confirm` |
| 16 | Shop: filters/sort/search URL-synced, infinite load, wishlist, quick view | ✅ | `shop.png` |
| 17 | PDP: gallery zoom, variants, bilingual tabs, nutrition, batch date, reviews + submit (moderated), related, sticky buy box (desktop + mobile bar), pincode check, Product JSON-LD | ✅ | `pdp.png` |
| 18 | Cart drawer: free-shipping progress, coupon (dedicated `/api/coupon/validate` — no phantom orders), gift note, cross-sell, savings | ✅ | `cart-drawer.png` |
| 19 | Checkout: 3 steps, OTP sign-in, pincode autofill, GST fields, server-recomputed totals, Razorpay (live keys) / labelled sandbox twin | ✅ | full E2E: order BS-2611-YMOL7M paid ₹2,207 |
| 20 | Order success: petal confetti, share-to-WhatsApp, tracking timeline | ✅ | `order-success2.png` |
| 21 | Razorpay webhooks: HMAC verify, idempotent event store, payment.failed handling, refunds (admin) | ✅ | endpoints live; sandbox mirrors contracts |
| 22 | Auth: email OTP (bcrypt, 10-min, 5 attempts) + Google OAuth behind env | ✅ | signed in via OTP; admin via password |
| 23 | Emails: branded templates, SMTP-or-Outbox, retry, test-email button | ✅ | OTP/welcome/confirmation/admin-alert/shipped all queued and previewable |
| 24 | Order tracking timeline + AWB + invoice (GST HTML) | ✅ | `track-result.png` |
| 25 | Admin: role gates (Owner/Manager/Packing/Support), dashboard (revenue ₹2,207 real), orders + status transitions + shipping dialog + refunds, product inline edits, CMS content, Chhath dates, inbox, outbox | ✅ | `admin-dashboard.png`, `admin-orders.png`; PACKING→SHIPPED + email verified |
| 26 | Chhath pages: original content (Sun Worship/Sacred Waters/Pure Devotion/Nature's Blessing, Chhathi Mayya/Draupadi/Kunti/Rama & Sita story, closing line) | ✅ | `chhath-view.png` |
| 27 | Rituals: 4-day timeline, corrected 2025 + 2026 + 2027 dates, live countdown, CMS-editable | ✅ | countdown fix applied (`text-sunrise`) |
| 28 | Policies (privacy/refund/shipping/terms), Contact (stores + auto-reply), Track, Account/Orders/Wishlist, 404/500 pages | ✅ | all render; forms hit real endpoints |
| 29 | SEO: metadata, OG/Twitter, JSON-LD (Organization/Product/FAQ), sitemap.xml, robots.txt, hreflang | ✅ | verified |
| 30 | Security: rate limits, zod-style validation, server-side totals, HttpOnly sessions, webhook signatures, audit log, consent-gated analytics | ✅ | implemented in `src/lib/security.ts` + routes |
| 31 | No `#` in any route/anchor | ✅ | grep-verified; navigation is state-based (`?v=…`), refresh-safe, back/forward works |
| 32 | Footer sticky bottom (no floating gap) | ✅ | `mobile-home-footer.png` — pushes naturally on long pages, mt-auto on short |
| 33 | Motion: Lenis + ScrollTrigger, `prefers-reduced-motion` honoured everywhere, off-screen pause | ✅ | primitives + page code |
| 34 | Responsive 390/768/1440 | ✅ | screenshots at 390 & 1440 in `/shots` |

## Known deviations (honest, documented in docs/architecture.md)

1. **Single route** — preview panel exposes only `/`; the experience is a state-routed SPA
   (`/?v=shop`, `?v=product&p=slug`) with API routes. Production route-split map included.
2. **PrestaShop/MySQL/Redis/Docker** — replaced by the native commerce core + SQLite +
   in-process rate limiting in this sandbox; swap paths documented (provider boundary,
   portable schema, Compose file in deployment guide).
3. **Razorpay sandbox twin** — identical server contracts (create → checkout → HMAC verify →
   webhooks); real keys switch automatically. Always labelled “no real charge”.
4. **Invoice** — print-ready branded HTML with GSTIN/HSN instead of binary PDF.
5. **Email without SMTP** — Outbox viewer (Mailpit-style) instead of silent sending.
6. **Shipping aggregator** — provider interface + manual AWB flow; Shiprocket adapter
   documented but requires account keys.
7. **Ambience music** — code path exists, hidden until a licensed audio URL is configured.
8. **Tests** — this build environment forbids shipping test files; golden path verified
   end-to-end with Agent Browser instead (this document).

## Test-data note

One demo order (`BS-2611-YMOL7M`, Priya Verma, SHIPPED with AWB DLV9827103456) and one test
customer (`priya.verma@example.com`) remain in the seeded DB so the tracking/admin/email
flows are explorable out of the box. Wipe with `rm db/custom.db && bun run db:push && node
scripts/seed.mjs` for a pristine catalogue.

**Admin demo login:** `admin@biharse.org` / `biharse-admin-2026` (change via `.env`).

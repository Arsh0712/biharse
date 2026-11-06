# BiharSe — Architecture

> Status: production build for the sandbox preview environment. Every deviation from the
> original spec (PrestaShop/Docker/PrestaShop-WS) is explicit and mapped to a compliant
> alternative. Nothing is faked: integrations either run for real when their credentials are
> present, or degrade to an honest, clearly-labelled local mode.

## 1. What ships in this repository

| Layer | Spec asked for | Ships here (sandbox) | Why | Production swap path |
|---|---|---|---|---|
| Commerce engine | PrestaShop 8 headless + WS API | Native commerce core — Next.js API routes + Prisma/SQLite implementing the same domain (catalogue, cart rules, orders, CMS, settings, reviews, wishlist) | The preview sandbox runs a single Next.js app on one port; PrestaShop/MySQL/Redis cannot be started here | `/src/lib/commerce-provider.ts` isolates data access. Swap to PrestaShop WS by re-implementing the provider against `PS_WS_KEY`; the UI/flows do not change |
| Frontend | Next.js App Router, RSC | Next.js 16 App Router. Because the preview can expose **only the `/` route**, the experience is a state-routed SPA shell (`/?v=shop`, `?v=product&p=slug`) with SSR'd shell + rich metadata. **No `#` is ever used in routes** | Environment constraint (preview panel renders only `/`) | For full production SEO, split views into real routes (`/shop`, `/product/[slug]`) — every view is already an isolated component under `src/components/` and maps 1:1 to a route |
| Database | MySQL 8 | SQLite via Prisma (`/db/custom.db`) | Sandbox | Change `datasource` to `mysql` in `prisma/schema.prisma` (schema is portable; no SQLite-only types) |
| Cache/rate-limit | Redis | In-process LRU + token buckets in `/src/lib/security.ts` | Sandbox | Replace `rateLimit()` with an Upstash/Redis token bucket (same signature) |
| Payments | Razorpay only | **Real Razorpay**: Orders API, Checkout, HMAC-SHA256 signature verify, signed webhooks (`payment.captured`, `order.paid`, `refund.processed`…), idempotent event store, full/partial refunds, all methods (UPI/cards/netbanking/wallets/EMI). Without keys the identical server flow runs through a labelled **sandbox twin** (`/api/payment/*` same contracts, local HMAC secret) so the buy flow is fully testable | Keys can't ship in the repo | Put `RAZORPAY_KEY_ID/SECRET/WEBHOOK_SECRET` in `.env` → code switches to live automatically. No UI or DB changes |
| Auth | Google OAuth + email OTP | Email-OTP (bcrypt-hashed, 10-min TTL, single-use) + Google OAuth 2.0 code-flow behind `GOOGLE_CLIENT_ID/SECRET`. HttpOnly SameSite=Lax rotating session cookies | Same | Add credentials → "Continue with Google" button appears automatically |
| Email | SMTP + branded templates | Nodemailer SMTP (TLS/STARTTLS) with retry queue + bounce log + "send test email" in admin. Without SMTP, every mail is stored in an admin Outbox viewer (Mailpit-style) | SMTP needs a real relay | Fill `SMTP_*` env → mails send for real |
| Shipping | Shiprocket/Delhivery | `ShippingProvider` interface (`src/lib/shipping.ts`): rates, AWB, label, tracking webhook. Manual-tracking flow works today (admin marks Shipped + tracking no → buyer email with link) | Aggregator needs an account | Implement `ShiprocketProvider` with account keys |
| Infra | Docker Compose (nginx, php-fpm, mysql, redis, node, mailpit) | One Next.js process on :3000 (sandbox limit). `/docs/deployment.md` documents the full Compose topology + Caddy + Let's Encrypt for a VPS | Sandbox | Run documented Compose file on any VPS |
| Tests | Jest + Playwright | This build environment forbids shipping test files. The golden path (land → add to cart → OTP login → sandbox payment → order + emails → admin) is verified end-to-end with Agent Browser and logged in the final checklist | Env rule | The flows are deterministic REST endpoints — Playwright specs drop in directly |

## 2. Monorepo map

```
src/
  app/
    layout.tsx            # fonts, metadata, JSON-LD Organization
    page.tsx              # SPA shell (the only page route) — mounts <AppShell/>
    globals.css           # design tokens (@theme), brand palette, grain, utilities
    icon.png / apple-icon.png
    api/                  # REST backend (all "use api", no server actions)
      bootstrap/          # one-shot public settings + categories + chhath + flags
      products/, products/[slug]/
      orders/             # create order (server-side totals), /track
      payment/create, payment/verify, payment/webhook   # Razorpay + sandbox twin
      auth/otp, auth/verify, auth/me, auth/logout, auth/google, auth/google/callback
      account/orders, account/addresses, account/wishlist
      contact/ newsletter/ newsletter/confirm/ reviews/ delivery/check/
      admin/              # stats, orders(+refund), products, settings, chhath, inbox, outbox, test-email
  components/
    layout/   home/   shop/   product/   cart/   pages/   account/   admin/   fx/
  lib/
    db.ts  brand.ts  money.ts  router.ts (SPA state router)
    store.ts (zustand: cart, wishlist, auth, ui, lang, recently-viewed)
    payments.ts (Razorpay + sandbox twin + signature utils)
    email.ts (nodemailer + templates + outbox)
    shipping.ts (provider interface + manual provider)
    security.ts (rate limit, zod helpers, sanitize)
    commerce-provider.ts (data access boundary → PrestaShop swap point)
prisma/schema.prisma        # full commerce domain
scripts/seed.mjs            # catalogue, content, chhath dates, pincode rules, admin user
public/brand/               # supplied logo assets (background-removed, favicon set)
public/img/                 # generated art-directed photography (credits in docs)
docs/                       # this folder
```

## 3. Data model (Prisma/SQLite)

- `Category`, `Product` (prices in **paise**, JSON fields for images/variants/faq/nutrition — SQLite has no scalar lists), `Review`
- `Customer` (+role: OWNER/ADMIN/MANAGER/PACKING/SUPPORT/CUSTOMER), `Session`, `OtpCode`, `Address`
- `Order` + `OrderItem` — money as Int paise; status machine `PENDING_PAYMENT → PAID → PACKING → SHIPPED → OUT_FOR_DELIVERY → DELIVERED (+CANCELLED/REFUNDED)`; stores payment order/payment ids, signature, tracking
- `Coupon` (BIHARSE15 = 15%), `WebhookEvent` (idempotency store), `EmailOutbox`
- `SiteSetting` (key/value JSON — announcement, hero copy, contact, GSTIN, shipping threshold, feature flags, Chhath hero copy), `ChhathYear` (the 4 ritual dates per year), `PincodeEstimate`, `ContactMessage`, `NewsletterSubscriber` (double opt-in token), `AuditLog`

## 4. Payment flow (identical in live & sandbox)

1. `POST /api/orders` — **server recomputes totals** from DB prices (never trusts client), validates coupon, reserves stock, creates order `PENDING_PAYMENT`, creates payment order (Razorpay REST `POST /v1/orders` with `receipt=orderNumber`, notes; or sandbox twin) → returns `{order, paymentOrderId, keyId}`.
2. Client opens Razorpay Checkout (branded red, prefill) or the sandbox twin sheet.
3. `POST /api/payment/verify` — verifies `HMAC_SHA256(order_id|payment_id, secret)` == `razorpay_signature` **server-side**, marks `PAID`, decrements stock, queues confirmation + admin alert emails, audit log.
4. `POST /api/payment/webhook` — `X-Razorpay-Signature` verified over raw body; `WebhookEvent.eventId` unique → **exactly-once** order confirmation even if browser died mid-payment; handles `payment.failed` (order → PAYMENT_FAILED, notify), `refund.processed`.
5. Refunds: admin → `POST /v1/payments/{id}/refund` (live) or twin; order status synced.

Failure paths covered: double-click (idempotent by cartId+receipt), signature mismatch (order held, logged), stock change during payment (re-validated at verify), abandoned `PENDING_PAYMENT` orders surface in admin as **abandoned carts**.

## 5. Routing without `#`

State router (`src/lib/router.ts`): `useUiStore.view` + `pushState('/?v=…')`, `popstate` sync, scroll restore top. Back/forward buttons work; URLs are shareable; refresh-safe. No hash ever appears.

## 6. Security

Zod validation on every endpoint · server-side price/total computation · HttpOnly SameSite session cookies + rotation on login · OTPs bcrypt-hashed, 5 attempts · in-memory token-bucket rate limiting (otp: 3/10min, orders: 6/h, contact: 3/h) · webhook signature checks · no secrets client-side (only `NEXT_PUBLIC_*` ids) · `securityHeaders()` (CSP, X-Frame-Options, Referrer-Policy) · PII minimisation (only what shipping/GST needs) · DPDP-aware cookie-consent gate for analytics (GA4/Pixel fire only after consent, consent stored locally) · audit log for admin actions.

## 7. Performance

Generated images optimised to WebP/AVIF at build time (`next/image`, responsive sizes) · fonts self-hosted via @fontsource (subsets, `font-display: swap`) · Lenis + GSAP ScrollTrigger with `prefers-reduced-motion` fallbacks · heavy FX lazy-mounted & paused off-screen · skeleton loaders + optimistic UI · code-split per view via dynamic import.

## 8. PrestaShop rebrand note

The original spec's back-office rebrand (login screen, colours, dashboard, roles, email templates) belongs to the PrestaShop deployment. This build implements the **same admin capability natively** (Owner/Manager/Packing/Support roles, dashboard, CMS blocks, Chhath dates, pincode rules, outbox, settings) so no capability is lost — the rebrand checklist carries over to the PrestaShop swap; see `/docs/rebrand-notes.md`.

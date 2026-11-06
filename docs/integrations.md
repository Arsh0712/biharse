# BiharSe — Integration Setup (Razorpay · Google OAuth · SMTP · Shipping · Analytics)

Everything is env-driven (`.env`) + admin-toggleable. Nothing is faked: each integration
either runs for real with credentials, or runs in an honest, clearly-labelled local mode.

## 1. Razorpay (the only payment method)

**Test mode (recommended first):**
1. Create an account at dashboard.razorpay.com → Settings → API Keys → Generate **Test** keys.
2. Put in `.env`:
   ```
   RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
   RAZORPAY_KEY_SECRET=xxxxxxxxxxxx
   RAZORPAY_WEBHOOK_SECRET=whsec_xxxxxxxx
   ```
3. The site switches to live Razorpay automatically (admin header shows “Razorpay LIVE”).
   Checkout is themed brand-red, prefilled, and supports UPI/cards/netbanking/wallets/EMI
   as enabled on your account.
4. Webhooks: Dashboard → Webhooks → add `https://YOUR-DOMAIN/api/payment/webhook`
   - events: `payment.authorized`, `payment.captured`, `payment.failed`, `order.paid`, `refund.processed`
   - secret = `RAZORPAY_WEBHOOK_SECRET` (server verifies `X-Razorpay-Signature` HMAC over the raw body)
5. **Sandbox twin**: with keys empty, checkout runs the labelled “BiharSe Pay · Sandbox”
   sheet. Server contracts are identical (`/api/orders` → checkout → `/api/payment/verify`
   with real HMAC-SHA256 verification against a local secret) — flipping to test keys
   requires **zero code changes**. Sandbox never charges and always shows a gold
   “no real charge” badge in admin and checkout.

Flow guarantees: totals recomputed server-side; `razorpay_signature` (HMAC-SHA256 of
`order_id|payment_id`) verified server-side; webhook events idempotent (`WebhookEvent.eventId`
unique) so an order is created **exactly once** even if the browser dies mid-payment;
`payment.failed` → `PAYMENT_FAILED` + email; refunds full/partial from admin order screen
(Razorpay Refunds API) with status sync + customer email.

## 2. Google OAuth (“Continue with Google”)

1. Google Cloud Console → Credentials → OAuth client ID (Web application).
2. Authorized redirect URI: `https://YOUR-DOMAIN/api/auth/google/callback`
   (locally: `http://localhost:3000/api/auth/google/callback`).
3. `.env`:
   ```
   GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=xxxx
   SITE_URL=https://YOUR-DOMAIN
   ```
4. “Continue with Google” appears automatically in the auth modal. Identities link to
   customer records by **verified email** (create if new). Without credentials the button
   still renders but returns a friendly “not configured” redirect — email OTP remains the
   working default path.

## 3. SMTP (transactional email)

`.env` (Gmail Workspace example):
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=orders@biharse.org
SMTP_PASS=app-password
SMTP_FROM_NAME=BiharSe
SMTP_FROM_EMAIL=orders@biharse.org
SMTP_REPLY_TO=support@biharse.org
```
Zoho: `smtp.zoho.in:587` · Brevo: `smtp-relay.brevo.com:587` · SES: `email-smtp.ap-south-1.amazonaws.com:587` · Mailgun: `smtp.mailgun.org:587` · SendGrid: `smtp.sendgrid.net:587`.

- Admin → Outbox → **Send test email** verifies end-to-end.
- Without SMTP, every mail is stored (status `LOGGED`) and previewable in Admin → Outbox —
  nothing silently disappears.
- Templates (branded mandala header, Hindi sign-off, plain-text fallback): welcome, OTP,
  order confirmation, payment failed, shipped (tracking link), delivered + review request,
  refund processed, contact auto-reply, admin new-order alert, newsletter double opt-in, test.
- Deliverability: set SPF `v=spf1 include:_spf.google.com ~all` (adjust per provider),
  DKIM per provider DNS records, DMARC `_dmarc` → `v=DMARC1; p=quarantine; rua=mailto:dmarc@biharse.org`.

## 4. Shipping (provider interface)

`src/lib/shipping.ts` defines the provider boundary. Today the **ManualProvider** ships:
admin marks Shipped with courier + AWB → buyer email with a tracking link + timeline.
AWB tracking URL pattern is Shiprocket-compatible (`shiprocket.co/tracking/{awb}`).
To automate AWB/labels later, implement `ShiprocketProvider` with
`SHIPROCKET_EMAIL/SHIPROCKET_PASSWORD` env keys — no UI changes needed (documented
interface: `createShipment(order) → {awb, courier, labelUrl}` + tracking webhook passthrough
to `/api/payment/webhook`-style signature checks).

## 5. Analytics (consent-gated)

Set `NEXT_PUBLIC_GA4_ID` (G-XXXX) and/or `NEXT_PUBLIC_META_PIXEL_ID`. Nothing loads until
the visitor accepts the consent banner (DPDP-aware; stored locally). Funnel events fired:
`view_item`, `add_to_cart`, `begin_checkout`, `purchase`.

## 6. Ambience audio (optional)

The music toggle is **off by default and hidden** unless `flags.music = true` (admin →
Content → Flags) and `NEXT_PUBLIC_AMBIENCE_AUDIO_URL` is set to a file you have rights to
(place your licensed Chhath song at `public/audio/chhath.mp3`). No unlicensed audio ships
with this repo.

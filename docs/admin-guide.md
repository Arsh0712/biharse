# BiharSe — Admin Guide (non-technical, step by step)

## Getting in

1. Open the site → scroll to the footer → click **Staff** (or go directly to the admin view
   after signing in as a staff account).
2. Two ways to sign in:
   - **Email OTP (everyone)**: “Sign in” → enter your staff email → 6-digit code arrives by
     email (or lands in Admin → Outbox when SMTP isn’t configured yet) → done.
   - **Password (owner convenience)**: on the admin screen, use email + password.
     Seeded owner: `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`
     (default demo `admin@biharse.org` / `biharse-admin-2026` — change it).
3. Roles: **Owner/Admin** = everything · **Manager** = everything ·
   **Packing staff** = Orders only · **Support** = Orders + Inbox.

## The header tells you the truth

- **Payments badge**: `Razorpay LIVE` (real keys in `.env`) or gold
  `Payments: SANDBOX (no real charges)`.
- **SMTP badge**: `SMTP ✓` (mails really send) or `SMTP: Outbox mode`
  (mails are stored and previewable — see Integrations doc to enable sending).

## Dashboard

- Revenue today / orders today / all-time revenue / subscribers / new messages / failed emails.
- 14-day revenue bar chart, top products.
- **Low stock** (red) → jump to Products to raise stock.
- **Abandoned carts** = unpaid checkouts older than 15 minutes (customer clicked Pay but
  didn’t finish). Nudge them by phone; nothing is charged on our side.

## Orders

1. Filter by status or search number/email/phone.
2. Status flow: PAID → PACKING → **SHIPPED** (enter courier + tracking number → customer
   gets the shipping email automatically) → OUT_FOR_DELIVERY → DELIVERED (delivered email
   + review request, automatically).
3. **Refund**: open a paid order → Refund → keep the prefilled amount for full refund or
   type a partial amount + reason → Confirm. Money returns via Razorpay; customer is
   emailed; order becomes REFUNDED.
4. Invoice: the 🧾 button opens the GST invoice (print-ready HTML with GSTIN/HSN).

## Products

- Edit **price** and **MRP** in ₹ (blur to save), bump **stock** with the stepper.
- Toggle **Active** (visible in shop) and **Featured** (Bestsellers first).
- **Batch date** shows on the product page (“Made in small batches · Batch …”).
- SKUs marked **Demo** are clearly flagged on the storefront — replace them with your real
  namkeen line whenever ready.

## Content (everything on the storefront you asked to edit)

- **Announcement bar**: the “माटी, ममता आ नव वर्ष - सब एक संग” ticker, coupon code, discount
  label, “Limited stock” note, on/off switch.
- **Hero copy**: headline, Hindi line, subline, CTAs, trust strip.
- **Business**: support email, phone, address, GSTIN (used on invoices).
- **Shipping**: free-shipping threshold, flat rate, default delivery days.
- **Flags**: music toggle (needs a licensed audio URL), exit-intent offer, WhatsApp hook,
  reviews.
- **Footer**: sign-off line and “शुद्ध • पारंपरिक • विश्वसनीय”.

## Chhath dates

One card per year with the four ritual datetimes (Nahay Khay, Kharna, Sandhya Arghya,
Usha Arghya). The **live countdown**, Rituals page and Chhath page read these instantly.
2025 (corrected: Oct 25–28), 2026 (Nov 13–16) and a 2027 estimate are pre-seeded; correct
each new year here. Sunrise/sunset note field is for reference.

## Inbox & Outbox

- **Inbox**: contact-form messages — mark Replied/Closed.
- **Outbox**: every email the system generated: SENT (via SMTP), QUEUED, FAILED (with the
  error — Retry button), or LOGGED (SMTP not configured). **Preview** renders the branded
  HTML. **Send test email** verifies your SMTP settings in one click.

## Everyday rhythm (Chhath season)

Morning: Dashboard → check overnight orders & low stock → set status PACKING → pack →
SHIPPED with AWB. Evening: Inbox zero, Outbox no FAILED, abandoned-cart follow-ups.

# BiharSe — Rebrand & Compliance Notes

## What was rebranded (and how, safely)

The original spec targeted PrestaShop’s back office. In this build the commerce engine is
native (see docs/architecture.md), so the same rebrand checklist is implemented **in code,
not by editing any third-party core** — meaning upgrades can never break it:

| Surface | Spec item | Where implemented |
|---|---|---|
| Browser chrome | favicon/app icon = red mandala badge | `src/app/icon.png`, `apple-icon.png` generated from the supplied badge |
| Login screen | mandala background + Hindi tagline | Admin gate card: mandala, “बिहारसे”, brand palette |
| Colours/fonts | brand red/cream/brown, wordmark fonts | Design tokens in `globals.css` (red #D80018 sampled from the supplied logo) |
| Dashboard | custom welcome, business metrics | Admin Dashboard (orders, revenue, top products, low stock, abandoned carts, settlement status via payment badges) |
| Footer / “Powered by” | removed | Footer carries only BiharSe + required legal lines |
| Page titles | “BiharSe — …” everywhere | `layout.tsx` metadata template |
| Emails | fully branded templates | `src/lib/email.ts` (mandala header, Hindi sign-off, plain-text fallbacks) |
| Error pages | 404/500 designed | `src/app/not-found.tsx`, `src/app/error.tsx` |

## Licence notices that legally remain

- **Razorpay**: “Powered by Razorpay” appears on the payment sheet per Razorpay’s brand
  terms — shown in checkout trust row and sandbox sheet footer. Keep it.
- **Next.js/React**: no attribution required by their licences (MIT), but keep upstream
  licence files in `node_modules` (they ship with the repo lockfile).
- **Fonts** (all OFL, self-hosted via Fontsource): Fraunces, Manrope, Yatra One,
  Tiro Devanagari Hindi — OFL requires not selling fonts standalone; embedding in the site
  is fine. Licence headers remain inside the woff2 packages.
- **shadcn/ui** components (MIT) — unmodified licence file retained in the package.
- **lucide-react** icons (ISC).

## Asset provenance (no scraping)

- **Logo lockups + mandala**: supplied by the brand owner (`upload/*.png`) — used as-is,
  with only background transparency processing. Stored in `public/brand/`.
- **Photography**: all 17 images in `public/img/` are AI-generated for this project with
  consistent art direction (see docs/image-credits.md). No images were copied from
  biharse.org or search engines. When the owner uploads real photos, drop them into
  `public/img/` with the same filenames — the site picks them up with zero code changes.
- **Audio**: intentionally NOT shipped (no licensed file available); the toggle is
  config-gated. See docs/integrations.md §6.

## What must remain (compliance)

- GST invoice fields (GSTIN, HSN 1905, tax-inclusive pricing) on every invoice.
- Privacy policy mentions DPDP Act consent handling — keep the consent banner active
  (analytics never fire before opt-in).
- Refund/shipping/term policies are editable in Admin → keep them current.
- FSSAI note in Terms: registration for the production kitchen is marked “in process” —
  update when licensed. (Honest placeholder, not a fake licence number.)

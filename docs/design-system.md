# BiharSe — Design System “ATELIER OF BIHAR”

A luxury-editorial food brand rooted in Mithila art and Chhath devotion. Aesop's restraint ×
Ferrero-level product lust × Indian festival warmth. Never a template.

## 1. Colour tokens (defined in `globals.css` `@theme`)

| Token | Value | Use |
|---|---|---|
| `--brand-red` | `#D80018` (sampled from supplied logo) | Primary CTA, accents, "se", pills |
| `--brand-red-deep` | `#A30014` | Gradients, hover, pressed |
| `--brand-red-dark` | `#7A000F` | Deep gradient stops |
| `--cream` | `#FFF6E9` | Page canvas |
| `--cream-2` | `#FBEFD9` | Alt sections, cards |
| `--jaggery` | `#3D1F12` | Dark sections canvas, headings |
| `--jaggery-2` | `#6B3A22` | Brown mid tones |
| `--turmeric` | `#F0A81C` | Gold accents, badges, marquee |
| `--saffron` | `#F4652A` | Sunrise gradient mid |
| `--ink` | `#1C130B` | Near-black warm text |
| Sunrise gradient | `linear-gradient(160deg, #A30014, #F4652A 45%, #F0A81C)` | Hero sky, final CTA |

Tailwind classes: `bg-brand-red`, `text-jaggery`, `bg-cream`, `text-turmeric`, `from-brand-red …` etc.
Dark sections: wrap in `.theme-dark` (flips the local token set) — no site-wide dark toggle by design.

## 2. Typography (self-hosted via @fontsource, fluid `clamp()`)

- **Display**: Fraunces Variable (72pt optical, tight leading, optional soft-italic accents) → `font-display`
- **UI**: Manrope Variable (the wordmark's geometric feel) → `font-sans`
- **Devanagari display**: Yatra One (brush calligraphy — "बिहारसे", hero Hindi line) → `font-dev-display`
- **Devanagari body**: Tiro Devanagari Hindi → `font-dev-body`
- Scale: `text-hero clamp(2.6rem,7vw,6rem)`; section titles `clamp(2rem,4.5vw,3.6rem)`; body 15–17px, generous measure 65ch.

## 3. Ornament language

- The supplied **mandala badge** (`public/brand/mandala.png`) — favicon, loader, section ornament, rotating watermark (6% opacity, 90s spin, parallax)
- **Madhubani line-art dividers** (`src/components/fx/madhubani.tsx` — inline SVG peacock/lotus/vine borders that draw-in on scroll via stroke-dashoffset)
- **Paper/film grain**: fixed SVG-noise overlay at 4–5% opacity (`.grain` utility)
- **Custom cursor** (desktop, pointer:fine): 18px mandala disc; morphs to red pill "Add" over product cards, "View" over imagery
- Diya/soop/sugarcane SVG motifs for empty states & checkout trust seals

## 4. Imagery

All photography is generated with consistent art direction: *rustic walnut wood, brass/terracotta props, cream linen, golden sunrise light from the left, deep soft shadows, macro texture*. Files in `public/img/` (hero-ghat, thekua-chini-1/2, thekua-gur-1/2, namkeen-*, gift-box, chhath-hamper, story-kneading/jaggery/mould/frying/packing, kitchen-wide). Alt text everywhere; credits in `/docs/image-credits.md`. No scraping, no hotlinking.

## 5. Navigation spec

- **Announcement ticker** (topmost, jaggery dark): "माटी, ममता आ नव वर्ष - सब एक संग · BIHARSE15 · 15% OFF · Limited stock" — click-to-copy code, pause on hover.
- **Floating glass nav**: fixed, centered pill, `backdrop-blur(18px) saturate(160%)`, cream 55% α, 1px inner highlight, layered shadow; compresses + 88% α on scroll; hides on scroll-down, returns on scroll-up; auto light/dark lockup swap.
  - Left: mandala + typeset `bihar**se**` lockup (Manrope 800) + बिहारसे (Yatra One, red, raised right)
  - Centre: Home · Shop · Chhath · Rituals · Our Story · Contact — sliding red pill indicator (layoutId)
  - Right: search (⌘K command palette), wishlist (badge), account, cart (animated count badge, fly-to-cart target)
- **Mobile**: glass bottom tab bar (Home, Shop, Search, Wishlist, Cart) + full-screen menu with staggered reveal & Mithila backdrop.

## 6. Motion rules (60fps, GPU-only, reduced-motion respected)

Lenis inertial scroll synced to GSAP ScrollTrigger. Split-text line reveals; pinned scrub storytelling; SVG line-draw dividers; magnetic buttons; tilt cards; image-reveal curtains; View-Transition-style shared element from product card → PDP; fly-to-cart arc; marigold-petal confetti on order success. All effects skip → static fallback under `prefers-reduced-motion: reduce`; off-screen effects pause.

## 7. Components

Buttons: `btn-primary` (red pill, inner bevel, magnetic), `btn-ghost` (1px ink border, hover fill), `btn-gold`. Cards: 24px radius, layered shadow, 1px `--border-warm`. Inputs: cream, 1.5px warm border, red focus ring. Badges: `-xx%` savings (red), "Low stock" (gold), "Verified buyer" (jaggery outline). Sticky mobile add-to-cart bar on PDP. Free-shipping progress bar (threshold configurable) in cart drawer.

## 8. Voice

Warm, proud, bilingual. English lead + Hindi/Bhojpuri heart lines. Signature copy is seeded in CMS and admin-editable (announcement, hero, testimonial line, trust strip, sign-off "Designed & Crafted with ❤️ in Bharat").

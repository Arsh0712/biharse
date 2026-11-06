'use client';

import { useEffect, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type RefObject } from 'react';
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'framer-motion';
import { Check, ChevronDown, Copy } from 'lucide-react';
import { SplitText } from '@/components/fx/reveal';
import { SpiceDust } from '@/components/fx/spice-dust';
import { FlowerFall } from '@/components/fx/flower-fall';
import { MandalaWatermark } from '@/components/fx/madhubani';
import { Magnetic } from '@/components/fx/magnetic';
import { api, pick } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { useSettings, useUi } from '@/lib/store';
import type { Product } from '@/lib/types';

const COUPON = 'BIHARSE15';
const TITLE_EN = 'Order Fresh & Authentic Thekua From Bihar';
const TITLE_HI = 'बिहार की परंपरा और स्वाद, अब आपके घर तक।';
const SUB_EN = "Each packet carries love, purity, and Bihar's heritage in every bite.";
const SUB_HI = 'हर पैकेट में प्रेम और शुद्धता, हर कौर में बिहार की विरासत।';
const FALLBACK_PROOF = ['100% Homemade', 'Delivered in 5–8 days', 'Secured payments'];

/** Copy helper with legacy fallback for insecure contexts. */
async function copyCoupon(): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(COUPON);
      return true;
    }
    const ta = document.createElement('textarea');
    ta.value = COUPON;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

export default function Hero() {
  const lang = useUi((s) => s.lang);
  const navigate = useUi((s) => s.navigate);
  const settings = useSettings((s) => s.data);
  const reduced = useReducedMotion();

  const hero = settings?.hero ?? null;
  const titleEn = hero?.titleEn ?? TITLE_EN;
  const titleHi = hero?.titleHi ?? TITLE_HI;
  const headline = pick(lang, titleEn, titleHi);
  const accentLine = lang === 'en' ? titleHi : SUB_HI;
  const subline = pick(lang, hero?.subEn ?? SUB_EN, hero?.subHi ?? SUB_HI);
  const ctaPrimary = pick(lang, hero?.ctaPrimary ?? 'Order Fresh Thekua', hero?.ctaPrimary ?? 'ताज़ा ठेकुआ ऑर्डर करें');
  const ctaSecondary = pick(lang, hero?.ctaSecondary ?? 'Our Story', hero?.ctaSecondary ?? 'हमारी कहानी');
  const proof: string[] = hero?.proof?.length ? hero.proof : FALLBACK_PROOF;

  const [copied, setCopied] = useState(false);
  const [stock, setStock] = useState<number | null>(null);

  /* Live inventory — gur-thekua batch counter (fetch once) */
  useEffect(() => {
    let alive = true;
    api<{ products: Product[] }>('/api/products?perPage=8')
      .then((d) => {
        if (!alive) return;
        const g = d.products.find((p) => p.slug === 'gur-thekua');
        if (g) setStock(g.stock);
      })
      .catch(() => { /* badge simply stays hidden */ });
    return () => { alive = false; };
  }, []);

  /* Scroll parallax */
  const sectionRef: RefObject<HTMLElement | null> = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end start'] });
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '14%']);
  const mandalaY = useTransform(scrollYProgress, [0, 1], [0, 110]);

  /* Mouse-parallax for floating thekua discs (max ~20px) */
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const d1x = useTransform(mx, (v) => v * 18);
  const d1y = useTransform(my, (v) => v * 12);
  const d2x = useTransform(mx, (v) => v * -14);
  const d2y = useTransform(my, (v) => v * 10);
  const d3x = useTransform(mx, (v) => v * 8);
  const d3y = useTransform(my, (v) => v * -16);

  const onMouseMove = (e: ReactMouseEvent) => {
    if (reduced) return;
    mx.set((e.clientX / window.innerWidth - 0.5) * 2);
    my.set((e.clientY / window.innerHeight - 0.5) * 2);
  };

  const onCopy = async () => {
    const ok = await copyCoupon();
    setCopied(ok);
    toast({
      title: ok ? pick(lang, `Code ${COUPON} copied!`, `कोड ${COUPON} कॉपी हो गया!`) : pick(lang, 'Copy failed', 'कॉपी नहीं हो सका'),
      description: pick(lang, `${COUPON} · 15% off at checkout`, `${COUPON} · चेकआउट पर 15% छूट`),
    });
    if (ok) window.setTimeout(() => setCopied(false), 2400);
  };

  const scrollToNext = () => {
    window.scrollBy({ top: window.innerHeight * 0.85, behavior: reduced ? 'auto' : 'smooth' });
  };

  return (
    <section
      ref={sectionRef}
      onMouseMove={onMouseMove}
      aria-label={pick(lang, 'BiharSe — homemade thekua from Bihar', 'बिहारसे — बिहार का घर का ठेकुआ')}
      className="relative isolate flex min-h-[100svh] items-center overflow-hidden bg-jaggery"
    >
      {/* Layer 1 — cinematic ghat background, slow y-parallax */}
      <motion.div aria-hidden className="absolute inset-0 -z-20 overflow-hidden" style={{ y: reduced ? 0 : bgY }}>
        <img
          src="/img/hero-thekua-diya.webp"
          alt=""
          fetchPriority="high"
          className={`w-full scale-110 object-cover ${reduced ? 'h-full' : 'h-[112%]'}`}
        />
      </motion.div>

      {/* Layer 2 — sunrise-gradient sky + legibility scrims */}
      <div aria-hidden className="sunrise-gradient absolute inset-0 -z-10 opacity-60 mix-blend-multiply" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-jaggery/85 via-transparent to-brand-dark/45" />
      <div aria-hidden className="absolute inset-0 -z-10 hidden bg-gradient-to-r from-jaggery/65 via-jaggery/20 to-transparent sm:block" />

      {/* Layer 3 — spice dust + rotating mandala watermark */}
      <SpiceDust className="absolute inset-0 -z-10 h-full w-full" density={80} />
      <motion.div
        aria-hidden
        className="absolute -right-44 top-[calc(50%-450px)] hidden h-[900px] w-[900px] lg:block"
        style={{ y: reduced ? 0 : mandalaY }}
      >
        <MandalaWatermark className="h-full w-full" opacity={0.1} />
      </motion.div>

      {/* Layer 4 — festive flower rain, fades away as the hero scrolls out */}
      {!reduced && <FlowerFall sectionRef={sectionRef} />}

      {/* Floating thekua discs — idle float + mouse depth */}
      <motion.div aria-hidden className="absolute right-[9%] top-[18%] hidden lg:block" style={{ x: d1x, y: d1y }}>
        <div
          className="h-28 w-28 animate-[float-y_6s_ease-in-out_infinite] overflow-hidden rounded-full border-4 border-cream/30 shadow-[0_24px_50px_-16px_rgba(0,0,0,0.55)]"
          style={{ '--float-rot': '-7deg' } as CSSProperties}
        >
          <img src="/img/thekua-chini-1.webp" alt="" className="h-full w-full object-cover" loading="lazy" />
        </div>
      </motion.div>
      <motion.div aria-hidden className="absolute bottom-[16%] right-[18%] hidden lg:block" style={{ x: d2x, y: d2y }}>
        <div
          className="h-24 w-24 animate-[float-y_8.5s_ease-in-out_infinite] overflow-hidden rounded-full border-4 border-cream/30 shadow-[0_24px_50px_-16px_rgba(0,0,0,0.55)]"
          style={{ '--float-rot': '5deg' } as CSSProperties}
        >
          <img src="/img/thekua-gur-2.jpg" alt="" className="h-full w-full object-cover" loading="lazy" />
        </div>
      </motion.div>
      <motion.div aria-hidden className="absolute bottom-[13%] right-[7%] hidden lg:block" style={{ x: d3x, y: d3y }}>
        <div
          className="h-[72px] w-[72px] animate-[float-y_7.2s_ease-in-out_infinite] overflow-hidden rounded-full border-4 border-cream/30 shadow-[0_24px_50px_-16px_rgba(0,0,0,0.55)]"
          style={{ '--float-rot': '0deg' } as CSSProperties}
        >
          <img src="/img/thekua-chini-2.jpg" alt="" className="h-full w-full object-cover" loading="lazy" />
        </div>
      </motion.div>

      {/* Content */}
      <div className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-28 pt-24 text-center sm:px-8 sm:text-left lg:px-12">
        <div className="mx-auto max-w-3xl sm:mx-0">
          {/* live batch badge */}
          {stock !== null && stock > 0 && stock <= 12 && (
            <span className="mb-6 inline-flex animate-pulse items-center gap-2 rounded-full border border-turmeric/60 bg-turmeric px-4 py-1.5 text-[13px] font-bold text-ink shadow-[0_10px_30px_-12px_rgba(240,168,28,0.8)]">
              <span className="h-2 w-2 rounded-full bg-brand" aria-hidden />
              {pick(lang, `Limited batch — ${stock} boxes left today`, `सीमित बैच — आज ${stock} डिब्बे बचे`)}
            </span>
          )}

          <SplitText
            as="h1"
            text={headline}
            className="font-display text-hero text-cream drop-shadow-[0_4px_24px_rgba(0,0,0,0.35)]"
            highlight={lang === 'en' ? 'Authentic' : undefined}
            delay={0.1}
          />

          <p className="font-dev-display mt-5 text-xl text-turmeric-soft sm:text-2xl">{accentLine}</p>
          <p className="mx-auto mt-4 max-w-xl text-[15px] text-cream/80 sm:mx-0 sm:text-base">{subline}</p>

          {/* CTAs */}
          <div className="mt-9 flex flex-col items-center gap-4 sm:flex-row">
            <Magnetic className="w-full sm:w-auto">
              <button onClick={() => navigate('shop')} className="btn-primary w-full text-[15px] sm:w-auto">
                {ctaPrimary}
                <span aria-hidden>→</span>
              </button>
            </Magnetic>
            <Magnetic className="w-full sm:w-auto">
              <button
                onClick={() => navigate('story')}
                className="btn-ghost w-full border-cream/40! text-[15px] text-cream! hover:bg-cream/10! sm:w-auto"
              >
                {ctaSecondary}
              </button>
            </Magnetic>
          </div>

          {/* Offer chip — copies coupon */}
          <button
            onClick={onCopy}
            aria-label={pick(lang, `Copy coupon code ${COUPON}, 15 percent off`, `कूपन कोड ${COUPON} कॉपी करें, 15 प्रतिशत छूट`)}
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-full border border-turmeric-soft/50 bg-turmeric-soft/15 px-4 text-[13px] font-bold tracking-wide text-turmeric-soft backdrop-blur-sm transition-colors hover:bg-turmeric-soft/25"
          >
            {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
            {copied
              ? pick(lang, 'Code copied!', 'कोड कॉपी हुआ!')
              : pick(lang, `${COUPON} · 15% OFF · Limited stock`, `${COUPON} · 15% छूट · सीमित स्टॉक`)}
          </button>

          {/* Proof strip */}
          <ul
            className="mt-8 flex flex-wrap justify-center gap-2.5 sm:justify-start"
            aria-label={pick(lang, 'Why customers trust us', 'ग्राहक हम पर क्यों भरोसा करते हैं')}
          >
            {proof.map((p) => (
              <li key={p} className="glass inline-flex items-center rounded-full px-3.5 py-2 text-[12.5px] font-semibold text-ink">
                {p}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Scroll cue */}
      <button
        onClick={scrollToNext}
        aria-label={pick(lang, 'Scroll to taste', 'स्वाद देखने के लिए नीचे स्क्रॉल करें')}
        className="absolute inset-x-0 bottom-6 z-10 mx-auto flex w-max flex-col items-center gap-1 rounded-full px-4 py-2 text-cream/75 transition-colors hover:text-cream"
      >
        <span className="text-[11px] font-semibold uppercase tracking-[0.28em]">
          {pick(lang, 'Scroll to taste', 'स्वाद की ओर')}
        </span>
        <ChevronDown className="h-5 w-5 animate-bounce" aria-hidden />
      </button>
    </section>
  );
}

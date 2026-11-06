'use client';

import { useRef, type PointerEvent } from 'react';
import Image from 'next/image';
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'framer-motion';
import { ArrowRight, Briefcase, Gift, PenLine, Sun } from 'lucide-react';
import { Reveal, SplitText } from '@/components/fx/reveal';
import { Magnetic } from '@/components/fx/magnetic';
import { useUi } from '@/lib/store';

const CHIPS = [
  { icon: PenLine, label: 'Message card' },
  { icon: Sun, label: 'Chhath-ready' },
  { icon: Briefcase, label: 'Corporate friendly' },
];

export default function Gifting() {
  const navigate = useUi((s) => s.navigate);
  const reduce = useReducedMotion();
  const tiltRef = useRef<HTMLDivElement>(null);

  // 3D tilt state (max ±10°)
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 170, damping: 18 });
  const sry = useSpring(ry, { stiffness: 170, damping: 18 });
  const rotateX = useTransform(srx, (v) => `${v}deg`);
  const rotateY = useTransform(sry, (v) => `${v}deg`);
  const shX = useTransform(sry, [-10, 10], [-24, 24]);
  const shY = useTransform(srx, [-10, 10], [24, -24]);
  const shadow = useMotionTemplate`${shX}px ${shY}px 48px -18px rgba(61, 31, 18, 0.45)`;
  const sheenX = useTransform(sry, [-10, 10], [-70, 70]);

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (reduce) return;
    const el = tiltRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    ry.set(Math.max(-10, Math.min(10, px * 20)));
    rx.set(Math.max(-10, Math.min(10, -py * 20)));
  };
  const resetTilt = () => {
    rx.set(0);
    ry.set(0);
  };

  return (
    <section className="bg-cream py-20 sm:py-28" aria-label="Gifting — send a taste of home">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-2 lg:gap-16">
        {/* copy */}
        <Reveal>
          <p className="text-eyebrow text-brand">Gifting</p>
          <SplitText
            text="Send a taste of home, beautifully boxed"
            className="mt-3 max-w-xl font-display font-semibold text-display-1 text-ink"
          />
          <p className="mt-5 max-w-lg text-[15.5px] leading-relaxed text-jaggery-2">
            Every gift leaves our kitchen in a reusable mandala keepsake box — Mithila art printed on the lid — with a
            hand-written card tucked beside the thekua. Chhath hampers, wedding favours, corporate Diwali boxes:
            packed like family wrapped it themselves.
          </p>

          <div className="mt-6 flex flex-wrap gap-2.5">
            {CHIPS.map((c) => (
              <span
                key={c.label}
                className="flex items-center gap-2 rounded-full border border-line-warm bg-cream-2 px-4 py-2 text-[13px] font-semibold text-jaggery-2"
              >
                <c.icon className="h-4 w-4 text-brand" aria-hidden />
                {c.label}
              </span>
            ))}
          </div>

          <Magnetic className="mt-9 inline-block">
            <button
              type="button"
              onClick={() => navigate('shop')}
              className="btn-primary"
            >
              Order fresh Thekua
              <ArrowRight className="h-5 w-5" aria-hidden />
            </button>
          </Magnetic>
        </Reveal>

        {/* 3D-tilt visual */}
        <Reveal delay={0.15}>
          <div
            ref={tiltRef}
            onPointerMove={onPointerMove}
            onPointerLeave={resetTilt}
            className="relative"
            style={{ perspective: 1100 }}
          >
            <motion.div
              style={{ rotateX, rotateY, boxShadow: shadow, transformStyle: 'preserve-3d' }}
              className="card-warm relative overflow-hidden rounded-[2rem]"
            >
              <div className="relative aspect-[4/5] bg-gradient-to-br from-turmeric-soft/70 via-cream-2 to-cream">
                <Image
                  src="/img/gift-box.png"
                  alt="BiharSe mandala keepsake gift box filled with fresh thekua and a hand-written note"
                  fill
                  sizes="(max-width: 1024px) 100vw, 42vw"
                  className="object-cover"
                />
              </div>
              {/* reflection sheen that shifts with the tilt */}
              <motion.div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-[-35%] w-[70%]"
                style={{
                  x: sheenX,
                  background: 'linear-gradient(100deg, transparent 30%, rgba(255,255,255,0.34) 50%, transparent 70%)',
                }}
              />
            </motion.div>

            {/* floating note chip */}
            <motion.div
              className="absolute -bottom-5 left-6 flex items-center gap-2 rounded-full border border-line-warm bg-card px-4 py-2.5 shadow-[0_14px_30px_-12px_rgba(61,31,18,0.45)]"
              animate={reduce ? { y: 0 } : { y: [0, -7, 0] }}
              transition={reduce ? { duration: 0 } : { duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Gift className="h-4 w-4 text-brand" aria-hidden />
              <span className="text-[13px] font-bold text-jaggery">Add gift note at checkout ✍️</span>
            </motion.div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

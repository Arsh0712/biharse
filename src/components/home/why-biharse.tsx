'use client';

import { motion } from 'framer-motion';
import { Home, Leaf, ShieldCheck, type LucideIcon } from 'lucide-react';
import { CountUp, Reveal, SplitText } from '@/components/fx/reveal';
import { SectionOrnament } from '@/components/fx/madhubani';
import { WHY_CARDS } from '@/lib/section-data';

const ICONS: Record<string, LucideIcon> = { home: Home, leaf: Leaf, shield: ShieldCheck };

export default function WhyBiharse() {
  return (
    <section className="bg-cream-2 py-20 sm:py-28" aria-label="Why BiharSe — three promises">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="text-center">
          <SectionOrnament />
          <p className="text-eyebrow mt-6 text-brand">Why BiharSe</p>
          <SplitText
            text="Three promises, sealed in every packet"
            className="mx-auto mt-3 max-w-3xl font-display font-semibold text-display-1 text-ink"
          />
          <p className="mx-auto mt-4 max-w-xl text-[15.5px] leading-relaxed text-jaggery-2">
            Not a factory, not a slogan — three things this kitchen has kept since nani pressed the first thekua.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {WHY_CARDS.map((c, i) => {
            const Icon = ICONS[c.icon] ?? Home;
            return (
              <Reveal key={c.titleEn} delay={i * 0.12}>
                <div className="card-warm group h-full p-8 transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_28px_54px_-24px_rgba(61,31,18,0.4)]">
                  <motion.span
                    whileHover={{ rotate: -8, scale: 1.12 }}
                    whileTap={{ scale: 0.94 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 18 }}
                    className="grid h-14 w-14 cursor-default place-items-center rounded-full bg-brand/10 text-brand ring-1 ring-brand/25"
                    aria-hidden
                  >
                    <Icon className="h-7 w-7" strokeWidth={1.8} />
                  </motion.span>

                  <h3 className="mt-5 font-display text-[21px] font-semibold leading-snug text-ink">{c.titleEn}</h3>
                  <p lang="hi" className="mt-1 font-dev-display text-[17px] text-jaggery-2">{c.titleHi}</p>
                  <p className="mt-3 text-[14.5px] leading-relaxed text-jaggery-2/90">{c.desc}</p>

                  <div className="mt-6 flex flex-wrap items-baseline gap-x-2.5 gap-y-1 border-t border-line-warm pt-5">
                    <span className="font-display text-[34px] font-bold leading-none text-brand">
                      <CountUp to={c.stat} suffix={c.statSuffix} />
                    </span>
                    <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-jaggery-3">{c.statLabel}</span>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

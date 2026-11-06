'use client';

import { Home, Leaf, ShieldCheck, Truck, Sparkles } from 'lucide-react';
import { Marquee } from '@/components/fx/marquee';
import { pick } from '@/lib/api';
import { useUi } from '@/lib/store';

const ITEMS = [
  { Icon: Home, en: '100% Homemade', hi: '100% घर का बना' },
  { Icon: Leaf, en: 'No Preservatives', hi: 'कोई प्रिज़र्वेटिव नहीं' },
  { Icon: ShieldCheck, en: 'Hygienically Packed', hi: 'स्वच्छ और सुरक्षित पैकिंग' },
  { Icon: Truck, en: 'Pan-India Delivery', hi: 'पूरे भारत में डिलीवरी' },
  { Icon: Sparkles, en: 'शुद्ध • पारंपरिक • विश्वसनीय', hi: 'शुद्ध • पारंपरिक • विश्वसनीय' },
];

export default function TrustMarquee() {
  const lang = useUi((s) => s.lang);

  return (
    <section
      aria-label={pick(lang, 'Our promises', 'हमारे वादे')}
      className="bg-jaggery py-4"
    >
      <p className="sr-only">
        {pick(
          lang,
          ITEMS.map((i) => i.en).join(', '),
          ITEMS.map((i) => i.hi).join(', '),
        )}
      </p>
      <Marquee speed={36}>
        {ITEMS.map(({ Icon, en, hi }) => (
          <span key={en} className="flex items-center gap-8">
            <span className="flex items-center gap-2 whitespace-nowrap">
              <Icon className="h-4 w-4 shrink-0 text-turmeric" aria-hidden />
              <span className="text-sm font-semibold tracking-wide text-cream">{pick(lang, en, hi)}</span>
            </span>
            <span aria-hidden className="text-xs text-turmeric/70">
              ✦
            </span>
          </span>
        ))}
      </Marquee>
    </section>
  );
}

'use client';

import { Reveal, SplitText } from '@/components/fx/reveal';
import { SectionOrnament } from '@/components/fx/madhubani';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { HOME_FAQS } from '@/lib/section-data';

/** FAQPage structured data for rich results */
const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: HOME_FAQS.map((f) => ({
    '@type': 'Question',
    name: f.qEn,
    acceptedAnswer: { '@type': 'Answer', text: f.aEn },
  })),
};

export default function FaqSection() {
  return (
    <section className="bg-cream py-20 sm:py-28" aria-label="Frequently asked questions">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        <div className="text-center">
          <SectionOrnament />
          <p className="text-eyebrow mt-6 text-brand">Questions, answered</p>
          <SplitText
            text="Everything about freshness, delivery & prasad"
            className="mx-auto mt-3 font-display font-semibold text-display-1 text-ink"
          />
        </div>

        <Reveal className="mt-12">
          <Accordion type="single" collapsible className="card-warm overflow-hidden px-5 py-1 sm:px-7">
            {HOME_FAQS.map((f, i) => (
              <AccordionItem key={f.qEn} value={`faq-${i}`} className="border-line-warm last:border-b-0">
                <AccordionTrigger className="min-h-[56px] py-5 text-left hover:no-underline">
                  <span className="flex-1">
                    <span className="block font-display text-[16px] font-semibold text-ink sm:text-[18px]">{f.qEn}</span>
                    <span lang="hi" className="mt-1 block font-dev-body text-[13px] text-jaggery-2">{f.qHi}</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-6">
                  <p className="text-[14.5px] leading-relaxed text-jaggery-2">{f.aEn}</p>
                  <p lang="hi" className="mt-2 font-dev-body text-[13px] leading-relaxed text-jaggery-3">{f.aHi}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>

        <p className="mt-9 text-center text-[14px] text-jaggery-2">
          Still curious?{' '}
          <a href="mailto:support@biharse.org" className="font-bold text-brand underline-offset-4 hover:underline">
            support@biharse.org
          </a>
        </p>
      </div>
    </section>
  );
}

'use client';

import { useState, type FormEvent } from 'react';
import { ArrowRight, BadgeCheck, Leaf, MailCheck, ShieldCheck, Truck } from 'lucide-react';
import { SplitText } from '@/components/fx/reveal';
import { MandalaWatermark } from '@/components/fx/madhubani';
import { Magnetic } from '@/components/fx/magnetic';
import { useSettings, useUi } from '@/lib/store';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

const HERO_HI_FALLBACK = 'बिहार की परंपरा और स्वाद, अब आपके घर तक।';

const TRUST = [
  { icon: ShieldCheck, label: 'Secured payments' },
  { icon: Truck, label: '5–8 day delivery' },
  { icon: Leaf, label: 'No preservatives' },
  { icon: BadgeCheck, label: '100% homemade' },
];

export default function FinalCta() {
  const navigate = useUi((s) => s.navigate);
  const heroHi = useSettings((s) => s.data?.hero?.titleHi) || HERO_HI_FALLBACK;

  const [email, setEmail] = useState('');
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  const subscribe = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const clean = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      toast({ title: 'Please enter a valid email', variant: 'destructive' });
      return;
    }
    setJoining(true);
    try {
      await api('/api/newsletter', { method: 'POST', body: JSON.stringify({ email: clean }) });
      setJoined(true);
    } catch (err) {
      toast({
        title: 'Could not join right now',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setJoining(false);
    }
  };

  return (
    <section
      className="sunrise-gradient relative overflow-hidden py-24 text-cream sm:py-32"
      aria-label="Order fresh — join the kitchen table"
    >
      <MandalaWatermark
        className="-right-32 top-1/2 hidden h-[560px] w-[560px] -translate-y-1/2 sm:block lg:-right-20 lg:h-[680px] lg:w-[680px]"
        opacity={0.12}
      />

      <div className="relative mx-auto max-w-3xl px-5 text-center sm:px-8">
        <p lang="hi" className="font-dev-display text-[26px] leading-snug text-cream sm:text-[38px]">
          {heroHi}
        </p>
        <SplitText
          text="Order before the next batch sells out"
          className="mt-4 font-display font-semibold text-display-2 text-cream"
        />

        <Magnetic className="mt-9 inline-block">
          <button type="button" onClick={() => navigate('shop')} className="btn-gold min-h-[52px] px-9 text-[17px]">
            Order Fresh Thekua
            <ArrowRight className="h-5 w-5" aria-hidden />
          </button>
        </Magnetic>

        {/* newsletter — double opt-in */}
        <div className="mt-12">
          {joined ? (
            <p
              role="status"
              className="mx-auto flex max-w-md items-center justify-center gap-2 rounded-[1.6rem] border border-cream/30 bg-brand-dark/60 px-6 py-4 text-[14.5px] font-semibold text-cream backdrop-blur-sm"
            >
              <MailCheck className="h-5 w-5 shrink-0 text-turmeric-soft" aria-hidden />
              Check your inbox to confirm (double opt-in)
            </p>
          ) : (
            <form
              onSubmit={subscribe}
              className="mx-auto w-full max-w-md rounded-[1.6rem] border border-cream/25 bg-brand-dark/60 p-3 backdrop-blur-sm"
            >
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  aria-label="Email for the newsletter"
                  className="h-12 min-w-0 flex-1 rounded-full border-0 bg-cream px-5 text-[15px] text-ink outline-none placeholder:text-jaggery-3 focus:ring-2 focus:ring-turmeric"
                />
                <button type="submit" disabled={joining} className="btn-primary h-12 min-w-0 shrink-0 whitespace-nowrap px-6 text-[14.5px] sm:px-5">
                  {joining ? 'Joining…' : 'Join the kitchen table'}
                </button>
              </div>
              <p className="mt-2.5 text-[12px] text-cream/85">No spam — only batch stories &amp; Chhath reminders.</p>
            </form>
          )}
        </div>

        {/* trust row */}
        <ul className="mt-12 flex flex-wrap items-center justify-center gap-3">
          {TRUST.map((t) => (
            <li
              key={t.label}
              className="flex items-center gap-2 rounded-full border border-cream/25 bg-jaggery/40 px-4 py-2.5 text-[12.5px] font-bold text-cream backdrop-blur"
            >
              <t.icon className="h-[18px] w-[18px] shrink-0 text-turmeric-soft" aria-hidden />
              {t.label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

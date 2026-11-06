'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Mail, MapPin, Phone, Heart, Loader2, Check, ShieldCheck, BadgeCheck } from 'lucide-react';
import { useUi, useSettings, useAuth, type View } from '@/lib/store';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { MadhubaniDivider } from '@/components/fx/madhubani';
import type { Bootstrap } from '@/lib/types';

const LINKS: { label: string; view: View }[] = [
  { label: 'Shop', view: 'shop' },
  { label: 'About Chhath Puja', view: 'chhath' },
  { label: 'Rituals & Dates', view: 'rituals' },
  { label: 'Our Story', view: 'story' },
  { label: 'Contact', view: 'contact' },
];
const POLICIES = ['privacy', 'refund', 'shipping', 'terms', 'accessibility'];

function policyLabel(p: string) {
  if (p === 'terms') return 'Terms of Service';
  if (p === 'accessibility') return 'Accessibility Statement';
  return `${p} Policy`;
}

/** Footer-visible business credentials (JSON-blob — legal keys optional until saved in admin). */
type BusinessCredentials = Bootstrap['business'] & Partial<{
  fssaiNumber: string;
  supportHours: string;
}>;

/** Footer — sticky bottom via AppShell flex layout, newsletter, policies */
export function Footer() {
  const navigate = useUi((s) => s.navigate);
  const settings = useSettings((s) => s.data);
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle');

  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setState('loading');
    try {
      await api('/api/newsletter', { method: 'POST', body: JSON.stringify({ email }) });
      setState('done');
      toast({ title: 'Almost there!', description: 'Check your inbox to confirm your subscription (double opt-in).' });
      setEmail('');
      setTimeout(() => setState('idle'), 4000);
    } catch (err) {
      setState('idle');
      toast({ title: 'Could not subscribe', description: err instanceof Error ? err.message : 'Try again', variant: 'destructive' });
    }
  };

  const biz = settings?.business as BusinessCredentials | undefined;
  const footer = settings?.footer;
  const fssai = biz?.fssaiNumber?.trim() || '';
  const gstin = biz?.gstin?.trim() || '';
  const supportHours = biz?.supportHours?.trim() || '';

  return (
    <footer className="theme-dark mt-auto w-full bg-jaggery text-cream" style={{ position: 'relative' }} data-theme="dark">
      <div className="mx-auto max-w-7xl px-5 pb-10 pt-14 sm:px-8">
        <MadhubaniDivider color="rgba(240,168,28,0.5)" className="mb-12 opacity-70" />

        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3">
              <Image src="/brand/lockup-dark.png" alt="BiharSe — बिहारसे" width={148} height={47} className="h-auto w-36" />
            </div>
            <p className="font-dev-display mt-4 text-lg text-turmeric">{footer?.tagHi ?? 'शुद्ध • पारंपरिक • विश्वसनीय'}</p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-cream/70">
              Each packet carries love, purity, and Bihar&apos;s heritage in every bite.
            </p>
            <p className="mt-4 text-xs text-cream/50">Freshly prepared · delivered across India in 5–8 days</p>
          </div>

          {/* Explore */}
          <nav aria-label="Footer">
            <h3 className="text-eyebrow mb-4 text-turmeric">Explore</h3>
            <ul className="space-y-2.5 text-sm">
              {LINKS.map((l) => (
                <li key={l.label}>
                  <button onClick={() => navigate(l.view)} className="text-cream/75 transition-colors hover:text-turmeric">{l.label}</button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Policies + business */}
          <div>
            <h3 className="text-eyebrow mb-4 text-turmeric">Policies & Help</h3>
            <ul className="space-y-2.5 text-sm">
              {POLICIES.map((p) => (
                <li key={p}>
                  <button onClick={() => navigate('policy', { policySlug: p })} className="capitalize text-cream/75 transition-colors hover:text-turmeric">
                    {policyLabel(p)}
                  </button>
                </li>
              ))}
              <li>
                <button onClick={() => navigate('track')} className="text-cream/75 transition-colors hover:text-turmeric">Track Your Order</button>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="text-eyebrow mb-4 text-turmeric">From our kitchen</h3>
            <p className="mb-3 text-sm text-cream/70">Batch stories, Chhath reminders & early hamper access.</p>
            <form onSubmit={subscribe} className="flex overflow-hidden rounded-full border border-cream/25 bg-cream/10 focus-within:border-turmeric/60">
              <label htmlFor="nl-email" className="sr-only">Email address</label>
              <input
                id="nl-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-transparent px-4 py-3 text-sm text-cream placeholder:text-cream/40 focus:outline-none"
              />
              <button
                type="submit"
                disabled={state === 'loading'}
                className="grid w-14 shrink-0 place-items-center bg-brand text-cream transition-transform hover:scale-105 disabled:opacity-60"
                aria-label="Subscribe"
              >
                {state === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : state === 'done' ? <Check className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
              </button>
            </form>
            {biz && (
              <ul className="mt-5 space-y-2 text-[13px] text-cream/60">
                <li className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-turmeric" /> <a href={`mailto:${biz.email}`} className="hover:text-turmeric">{biz.email}</a></li>
                <li className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-turmeric" /> {biz.phone}</li>
                <li className="flex items-start gap-2"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-turmeric" /> {biz.address}</li>
              </ul>
            )}
          </div>
        </div>

        {/* Credentials — legal & trust details. Values come from admin settings only;
            absent values render a neutral "Details to be updated" line, never an invented number. */}
        <div className="mt-10 rounded-2xl border border-cream/15 bg-cream/5 p-5">
          <h3 className="text-eyebrow text-turmeric">Credentials</h3>
          <ul className="mt-3 space-y-2 text-[13px] text-cream/70">
            {fssai && (
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-turmeric" aria-hidden />
                <span>
                  FSSAI Lic. No. <span className="font-semibold text-cream/85">{fssai}</span>
                </span>
              </li>
            )}
            <li className="flex items-center gap-2">
              <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-turmeric" aria-hidden />
              <span>
                GSTIN: {gstin ? <span className="font-semibold text-cream/85">{gstin}</span> : <span className="italic text-cream/50">Details to be updated</span>}
              </span>
            </li>
            {biz?.phone && (
              <li className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 shrink-0 text-turmeric" aria-hidden />
                <span>
                  Support: <a href={`tel:${biz.phone.replace(/[^\d+]/g, '')}`} className="hover:text-turmeric">{biz.phone}</a>
                  {supportHours && <span className="text-cream/50"> · {supportHours}</span>}
                </span>
              </li>
            )}
            <li className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 shrink-0 text-turmeric" aria-hidden />
              <span>
                Grievance Officer:{' '}
                <button onClick={() => navigate('contact')} className="font-semibold text-cream/85 underline underline-offset-2 transition-colors hover:text-turmeric">
                  Contact details
                </button>
              </span>
            </li>
          </ul>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-cream/12 pt-6 text-xs text-cream/50 sm:flex-row">
          <p>© {new Date().getFullYear()} BiharSe. All rights reserved.</p>
          <button
            onClick={() => {
              if (!useAuth.getState().user) { useUi.getState().setOverlay('auth'); return; }
              navigate('admin');
            }}
            className="rounded-full border border-cream/20 px-3 py-1 transition-colors hover:border-turmeric hover:text-turmeric"
            aria-label="Staff sign in"
          >
            Staff
          </button>
          <p className="flex items-center gap-1.5">{footer?.signoff ?? 'Designed & Crafted with ❤️ in Bharat'}</p>
        </div>
      </div>
    </footer>
  );
}

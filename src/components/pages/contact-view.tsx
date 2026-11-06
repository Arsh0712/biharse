'use client';

import { useState, type FormEvent } from 'react';
import {
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { SectionOrnament } from '@/components/fx/madhubani';
import { SelectMenu } from '@/components/ui/select-menu';
import { Reveal } from '@/components/fx/reveal';
import { GRIEVANCE_CARD } from '@/lib/section-data';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { useSettings, useUi } from '@/lib/store';
import type { Bootstrap } from '@/lib/types';

const SUBJECTS = ['Order help', 'Bulk & corporate', 'Chhath orders', 'Feedback', 'Other'] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FAQ_CHIPS: { label: string; slug: string }[] = [
  { label: 'Shipping & delivery', slug: 'shipping' },
  { label: 'Refunds & cancellation', slug: 'refund' },
  { label: 'Privacy', slug: 'privacy' },
  { label: 'Terms of service', slug: 'terms' },
];

const inputCls =
  'w-full rounded-xl border border-line-warm bg-card px-4 py-3 text-sm text-ink placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand';

/** Legal/optional business keys arrive as a JSON blob from admin settings (same pattern as footer). */
type BusinessContact = Bootstrap['business'] & Partial<{
  supportHours: string;
  grievanceName: string;
  grievanceDesignation: string;
  grievanceEmail: string;
  grievancePhone: string;
}>;

/** Contact — business details + validated message form. */
export default function ContactView() {
  const navigate = useUi((s) => s.navigate);
  const business = useSettings((s) => s.data?.business);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState<string>(SUBJECTS[0]);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<{ name?: string; email?: string; message?: string }>({});
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!name.trim()) next.name = 'Please tell us your name.';
    if (!EMAIL_RE.test(email.trim())) next.email = 'Please enter a valid email address.';
    if (!message.trim()) next.message = 'A short message helps us help you faster.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSending(true);
    try {
      await api<{ ok: boolean }>('/api/contact', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          subject,
          message: message.trim(),
        }),
      });
      setSentTo(name.trim());
    } catch (err) {
      toast({
        title: 'Message could not be sent',
        description: err instanceof Error ? err.message : 'Please try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  }

  function reset() {
    setName('');
    setEmail('');
    setPhone('');
    setSubject(SUBJECTS[0]);
    setMessage('');
    setErrors({});
    setSentTo(null);
  }

  const biz = (business as BusinessContact | undefined) ?? undefined;
  const mail = biz?.email?.trim() || 'support@biharse.org';
  // Settings-driven only — no invented phone number; neutral text when unset.
  const tel = biz?.phone?.trim() || '';
  const telHref = `tel:${tel.replace(/[^\d+]/g, '')}`;
  const address = biz?.address || 'Block H, House 158, Mangol Puri, New Delhi 110083';
  const supportHours = biz?.supportHours?.trim() || 'Mon–Sat · 9:00 am – 7:00 pm IST';

  return (
    <div className="bg-cream">
      <section className="mx-auto max-w-6xl px-6 pt-28 pb-20">
        <Reveal className="text-center">
          <p className="text-eyebrow text-brand-deep">Contact · संपर्क</p>
          <h1 className="mt-4 font-display text-display-1 text-jaggery">Namaste! How can we help?</h1>
          <p className="mx-auto mt-4 max-w-xl leading-relaxed text-muted-foreground">
            Bulk Chhath orders, a delayed parcel, or just to say the thekua tasted like home — every
            message reaches a human in our kitchen.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-8 lg:grid-cols-5">
          {/* ── Info card ─────────────────────────────────── */}
          <Reveal className="lg:col-span-2">
            <aside className="card-warm flex h-full flex-col p-8">
              <SectionOrnament />
              <h2 className="mt-6 font-display text-2xl text-jaggery">Reach us directly</h2>
              <ul className="mt-6 space-y-5 text-sm">
                <li className="flex items-start gap-3.5">
                  <Mail className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden />
                  <span>
                    <span className="block font-semibold text-jaggery">Email</span>
                    <a href={`mailto:${mail}`} className="break-all text-muted-foreground underline-offset-2 hover:text-brand hover:underline">
                      {mail}
                    </a>
                  </span>
                </li>
                <li className="flex items-start gap-3.5">
                  <Phone className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden />
                  <span>
                    <span className="block font-semibold text-jaggery">Phone / WhatsApp</span>
                    {tel ? (
                      <a href={telHref} className="text-muted-foreground underline-offset-2 hover:text-brand hover:underline">
                        {tel}
                      </a>
                    ) : (
                      <span className="italic text-muted-foreground">Phone support — hours being updated</span>
                    )}
                  </span>
                </li>
                <li className="flex items-start gap-3.5">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden />
                  <span>
                    <span className="block font-semibold text-jaggery">Kitchen address</span>
                    <span className="text-muted-foreground">{address}</span>
                  </span>
                </li>
                <li className="flex items-start gap-3.5">
                  <Clock className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden />
                  <span>
                    <span className="block font-semibold text-jaggery">Support hours</span>
                    <span className="text-muted-foreground">{supportHours}</span>
                  </span>
                </li>
              </ul>
              <p className="mt-auto pt-8 text-sm italic leading-relaxed text-jaggery-3">
                We reply within one working day — usually faster, between batches.
              </p>
            </aside>
          </Reveal>

          {/* ── Form card ─────────────────────────────────── */}
          <Reveal className="lg:col-span-3" delay={0.1}>
            <div className="card-warm h-full p-8">
              {sentTo ? (
                <div className="flex h-full flex-col items-center justify-center py-14 text-center" role="status">
                  <CheckCircle2 className="h-14 w-14 text-brand" aria-hidden />
                  <h2 className="mt-5 font-display text-display-2 text-jaggery">
                    Message received, {sentTo}!
                  </h2>
                  <p className="mt-3 max-w-sm text-muted-foreground">
                    Check your inbox — an auto-reply is on its way, and we will write back within
                    one working day.
                  </p>
                  <button type="button" onClick={reset} className="btn-ghost mt-8">
                    <Send className="h-4 w-4" aria-hidden />
                    Send another
                  </button>
                </div>
              ) : (
                <form onSubmit={onSubmit} noValidate>
                  <h2 className="font-display text-2xl text-jaggery">Write to us</h2>
                  <div className="mt-6 grid gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="contact-name" className="mb-1.5 block text-sm font-semibold text-jaggery">
                        Name <span className="text-brand">*</span>
                      </label>
                      <input
                        id="contact-name"
                        type="text"
                        autoComplete="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        aria-invalid={Boolean(errors.name)}
                        className={inputCls}
                        placeholder="Your full name"
                      />
                      {errors.name && <p className="mt-1.5 text-xs text-destructive">{errors.name}</p>}
                    </div>
                    <div>
                      <label htmlFor="contact-email" className="mb-1.5 block text-sm font-semibold text-jaggery">
                        Email <span className="text-brand">*</span>
                      </label>
                      <input
                        id="contact-email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        aria-invalid={Boolean(errors.email)}
                        className={inputCls}
                        placeholder="you@example.com"
                      />
                      {errors.email && <p className="mt-1.5 text-xs text-destructive">{errors.email}</p>}
                    </div>
                    <div>
                      <label htmlFor="contact-phone" className="mb-1.5 block text-sm font-semibold text-jaggery">
                        Phone <span className="font-normal text-muted-foreground">(optional)</span>
                      </label>
                      <input
                        id="contact-phone"
                        type="tel"
                        autoComplete="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className={inputCls}
                        placeholder="+91"
                      />
                    </div>
                    <div>
                      <label id="contact-subject-label" className="mb-1.5 block text-sm font-semibold text-jaggery">
                        Subject
                      </label>
                      <SelectMenu
                        value={subject}
                        onValueChange={setSubject}
                        options={SUBJECTS.map((s) => ({ value: s, label: s }))}
                        label="Subject"
                        className={inputCls}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label htmlFor="contact-message" className="mb-1.5 block text-sm font-semibold text-jaggery">
                        Message <span className="text-brand">*</span>
                      </label>
                      <textarea
                        id="contact-message"
                        rows={6}
                        maxLength={2000}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        aria-invalid={Boolean(errors.message)}
                        className={`${inputCls} resize-y`}
                        placeholder="Tell us everything — order number helps for order questions."
                      />
                      <div className="mt-1.5 flex items-center justify-between">
                        {errors.message ? (
                          <p className="text-xs text-destructive">{errors.message}</p>
                        ) : (
                          <span />
                        )}
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {message.length}/2000
                        </span>
                      </div>
                    </div>
                  </div>
                  <button type="submit" disabled={sending} className="btn-primary mt-7 w-full sm:w-auto">
                    {sending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        Sending…
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" aria-hidden />
                        Send message
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </Reveal>
        </div>

        {/* ── Grievance Officer — Consumer Protection (E-commerce) Rules 2020 ── */}
        <Reveal className="mt-12">
          <section aria-labelledby="grievance-heading" className="card-warm p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 id="grievance-heading" className="font-display text-2xl text-jaggery">
                  {GRIEVANCE_CARD.title} · <span className="font-dev-display text-xl">शिकायत अधिकारी</span>
                </h2>
                <p className="mt-1.5 text-sm text-muted-foreground">{GRIEVANCE_CARD.subtitle}</p>
              </div>
              <ShieldCheck className="h-8 w-8 shrink-0 text-brand" aria-hidden />
            </div>
            <dl className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
              {GRIEVANCE_CARD.fields.map((f) => {
                const raw = (biz?.[f.key] || '').trim();
                return (
                  <div key={f.key}>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-jaggery-3">{f.label}</dt>
                    <dd className="mt-1 text-sm text-ink">
                      {raw ? (
                        f.key === 'grievanceEmail' ? (
                          <a href={`mailto:${raw}`} className="break-all underline-offset-2 hover:text-brand hover:underline">{raw}</a>
                        ) : f.key === 'grievancePhone' ? (
                          <a href={`tel:${raw.replace(/[^\d+]/g, '')}`} className="underline-offset-2 hover:text-brand hover:underline">{raw}</a>
                        ) : (
                          raw
                        )
                      ) : (
                        <span className="italic text-muted-foreground">{GRIEVANCE_CARD.pendingNote}</span>
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
            <p className="mt-6 flex items-center gap-2 border-t border-line-warm pt-4 text-sm font-medium text-jaggery">
              <Clock className="h-4 w-4 shrink-0 text-brand" aria-hidden />
              {GRIEVANCE_CARD.promise}
            </p>
          </section>
        </Reveal>

        {/* ── FAQ shortcuts ─────────────────────────────── */}
        <Reveal className="mt-12">
          <div className="text-center">
            <p className="text-eyebrow text-brand-deep">Quick answers</p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              {FAQ_CHIPS.map((chip) => (
                <button
                  key={chip.slug}
                  type="button"
                  onClick={() => navigate('policy', { policySlug: chip.slug })}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line-warm bg-card px-4 py-2 text-sm font-medium text-jaggery transition-colors hover:border-brand hover:text-brand"
                >
                  {chip.label}
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                </button>
              ))}
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}

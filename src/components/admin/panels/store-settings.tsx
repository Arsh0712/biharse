'use client';

/* ── Store settings — business & legal + shipping + mode badges ──
 * Shared settings-form primitives (CfgCard/useCfgSave) live here so the
 * Content and Flags panels reuse the exact same save pipeline. */

import { useCallback, useEffect, useState } from 'react';
import { CreditCard, Save } from 'lucide-react';
import { api } from '@/lib/api';
import { rupeesToPaise } from '@/lib/money';
import { toast } from '@/hooks/use-toast';
import { useSettings } from '@/lib/store';
import type { Bootstrap } from '@/lib/types';
import { Card, CardHead, ErrorState, Field, SkeletonRows, TextField, Toggle, errText } from '../ui';

export type SiteSettings = Partial<Pick<Bootstrap, 'announcement' | 'hero' | 'business' | 'shipping' | 'flags' | 'footer'>>;

export type BusinessSettings = Bootstrap['business'] & Partial<{
  fssaiNumber: string;
  manufacturerName: string;
  manufacturerAddress: string;
  grievanceName: string;
  grievanceDesignation: string;
  grievanceEmail: string;
  grievancePhone: string;
  supportHours: string;
}>;

export interface SettingsInfo {
  settings: SiteSettings;
  paymentMode: 'razorpay' | 'sandbox';
  smtpConfigured: boolean;
  razorpayConfigured?: boolean;
}

export const DEFAULT_SETTINGS: {
  announcement: Bootstrap['announcement'];
  hero: Bootstrap['hero'];
  business: BusinessSettings;
  shipping: Bootstrap['shipping'];
  flags: Bootstrap['flags'];
  footer: Bootstrap['footer'];
} = {
  announcement: { active: false, textEn: '', textHi: '', code: '', discount: '', note: '' },
  hero: { titleEn: '', titleHi: '', subEn: '', ctaPrimary: 'Shop now', ctaSecondary: 'Our story', proof: [] },
  business: {
    email: '', phone: '', address: '', gstin: '',
    fssaiNumber: '', manufacturerName: '', manufacturerAddress: '',
    grievanceName: '', grievanceDesignation: '', grievanceEmail: '', grievancePhone: '', supportHours: '',
  },
  shipping: { freeAbovePaise: 0, flatPaise: 0, defaultMinDays: 3, defaultMaxDays: 7 },
  flags: { music: false, exitIntent: false, whatsapp: false, reviews: true },
  footer: { signoff: '', tagHi: '' },
};

/** Shared PATCH /api/admin/settings save handler (toast + refresh public site). */
export function useCfgSave(key: keyof SiteSettings, onSaved: () => void) {
  const [busy, setBusy] = useState(false);
  const save = useCallback(
    async (body: unknown) => {
      setBusy(true);
      try {
        await api('/api/admin/settings', { method: 'PATCH', body: JSON.stringify({ [key]: body }) });
        toast({ title: 'Saved — live on site' });
        void useSettings.getState().load();
        onSaved();
      } catch (e) {
        toast({ title: 'Save failed', description: errText(e), variant: 'destructive' });
      } finally {
        setBusy(false);
      }
    },
    [key, onSaved],
  );
  return { busy, save };
}

export function SettingsCard({
  title, desc, busy, onSave, children, note,
}: {
  title: string;
  desc?: string;
  busy: boolean;
  onSave: () => void;
  children: React.ReactNode;
  note?: string;
}) {
  return (
    <Card>
      <CardHead
        title={title}
        desc={desc}
        actions={
          <button type="button" className="btn-primary h-9 px-5 py-0 text-sm" onClick={onSave} disabled={busy}>
            <Save size={14} /> {busy ? 'Saving…' : 'Save'}
          </button>
        }
      />
      <div className="grid gap-3 p-4 sm:grid-cols-2">{children}</div>
      {note && <p className="border-t border-line-warm px-4 py-2.5 text-xs text-jaggery-3">{note}</p>}
    </Card>
  );
}

/* ── Business & legal form (Store settings panel) ────────────────────── */

function BusinessForm({ initial, onSaved }: { initial?: BusinessSettings; onSaved: () => void }) {
  const [form, setForm] = useState<BusinessSettings>({ ...DEFAULT_SETTINGS.business, ...initial });
  const { busy, save } = useCfgSave('business', onSaved);
  const set = <K extends keyof BusinessSettings>(k: K, v: BusinessSettings[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <SettingsCard
      title="Business & legal"
      desc="Contact details, GST, FSSAI, manufacturer and grievance officer — used on invoices, the PDP compliance card, contact and policy pages."
      busy={busy}
      onSave={() => void save(form)}
      note="FSSAI / manufacturer / grievance fields render on-site only once filled; blank fields show a neutral “Details to be updated” line — never an invented number."
    >
      <Field label="Support email"><TextField type="email" value={form.email} onChange={(e) => set('email', e.target.value)} /></Field>
      <Field label="Support phone"><TextField value={form.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
      <div className="sm:col-span-2">
        <Field label="Registered address"><TextField value={form.address} onChange={(e) => set('address', e.target.value)} /></Field>
      </div>
      <Field label="GSTIN"><TextField value={form.gstin} onChange={(e) => set('gstin', e.target.value)} placeholder="10ABCDE1234F1Z5" /></Field>
      <Field label="Support hours"><TextField value={form.supportHours ?? ''} onChange={(e) => set('supportHours', e.target.value)} placeholder="Mon–Sat · 9 am – 7 pm IST" /></Field>
      <Field label="FSSAI license number"><TextField value={form.fssaiNumber ?? ''} onChange={(e) => set('fssaiNumber', e.target.value)} placeholder="Leave blank until issued" /></Field>
      <div className="sm:col-span-2">
        <Field label="Manufacturer / packer / marketer — name"><TextField value={form.manufacturerName ?? ''} onChange={(e) => set('manufacturerName', e.target.value)} /></Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="Manufacturer / packer / marketer — address"><TextField value={form.manufacturerAddress ?? ''} onChange={(e) => set('manufacturerAddress', e.target.value)} /></Field>
      </div>
      <Field label="Grievance officer — name"><TextField value={form.grievanceName ?? ''} onChange={(e) => set('grievanceName', e.target.value)} /></Field>
      <Field label="Grievance officer — designation"><TextField value={form.grievanceDesignation ?? ''} onChange={(e) => set('grievanceDesignation', e.target.value)} /></Field>
      <Field label="Grievance officer — email"><TextField type="email" value={form.grievanceEmail ?? ''} onChange={(e) => set('grievanceEmail', e.target.value)} /></Field>
      <Field label="Grievance officer — phone"><TextField value={form.grievancePhone ?? ''} onChange={(e) => set('grievancePhone', e.target.value)} /></Field>
    </SettingsCard>
  );
}

function ShippingForm({ initial, onSaved }: { initial?: Bootstrap['shipping']; onSaved: () => void }) {
  const [freeAbove, setFreeAbove] = useState(String((initial?.freeAbovePaise ?? DEFAULT_SETTINGS.shipping.freeAbovePaise) / 100));
  const [flat, setFlat] = useState(String((initial?.flatPaise ?? DEFAULT_SETTINGS.shipping.flatPaise) / 100));
  const [minDays, setMinDays] = useState(String(initial?.defaultMinDays ?? DEFAULT_SETTINGS.shipping.defaultMinDays));
  const [maxDays, setMaxDays] = useState(String(initial?.defaultMaxDays ?? DEFAULT_SETTINGS.shipping.defaultMaxDays));
  const { busy, save } = useCfgSave('shipping', onSaved);

  function body(): Bootstrap['shipping'] {
    return {
      ...DEFAULT_SETTINGS.shipping,
      ...initial,
      freeAbovePaise: rupeesToPaise(Number(freeAbove) || 0),
      flatPaise: rupeesToPaise(Number(flat) || 0),
      defaultMinDays: Math.max(0, Math.round(Number(minDays) || 0)),
      defaultMaxDays: Math.max(0, Math.round(Number(maxDays) || 0)),
    };
  }

  return (
    <SettingsCard title="Shipping rules" desc="Free-shipping threshold, flat fee and default delivery estimate." busy={busy} onSave={() => void save(body())}>
      <Field label="Free above (₹)"><TextField type="number" min={0} value={freeAbove} onChange={(e) => setFreeAbove(e.target.value)} /></Field>
      <Field label="Flat fee (₹)"><TextField type="number" min={0} value={flat} onChange={(e) => setFlat(e.target.value)} /></Field>
      <Field label="Default min days"><TextField type="number" min={0} value={minDays} onChange={(e) => setMinDays(e.target.value)} /></Field>
      <Field label="Default max days"><TextField type="number" min={0} value={maxDays} onChange={(e) => setMaxDays(e.target.value)} /></Field>
    </SettingsCard>
  );
}

export function StoreSettingsPanel() {
  const [info, setInfo] = useState<SettingsInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setInfo(await api<SettingsInfo>('/api/admin/settings'));
    } catch (e) {
      setError(errText(e));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!info) return <SkeletonRows rows={2} />;
  return <StoreSettingsBody info={info} onSaved={() => void load()} />;
}

function StoreSettingsBody({ info, onSaved }: { info: SettingsInfo; onSaved: () => void }) {
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line-warm bg-white px-3 py-1.5 text-xs font-bold text-jaggery">
            <CreditCard size={13} aria-hidden />
            Payments: {info.paymentMode === 'sandbox' ? 'SANDBOX — no real charges' : 'Razorpay LIVE'}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line-warm bg-white px-3 py-1.5 text-xs font-bold text-jaggery">
            Email: {info.smtpConfigured ? 'SMTP configured' : 'Outbox mode (no SMTP_HOST)'}
          </span>
        </div>
      </Card>
      <BusinessForm initial={info.settings.business} onSaved={onSaved} />
      <ShippingForm initial={info.settings.shipping} onSaved={onSaved} />
    </div>
  );
}

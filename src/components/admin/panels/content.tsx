'use client';

/* ── Content settings — announcement bar, hero copy, footer sign-off ── */

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Bootstrap } from '@/lib/types';
import { Card, ErrorState, Field, SkeletonRows, TextField, Toggle, errText } from '../ui';
import { SettingsCard, useCfgSave } from './store-settings';

type Announcement = Bootstrap['announcement'];
type Hero = Bootstrap['hero'];
type FooterCfg = Bootstrap['footer'];

export function ContentPanel() {
  const [settings, setSettings] = useState<{ announcement: Announcement; hero: Hero; footer: FooterCfg } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const j = await api<{ settings: Partial<{ announcement: Announcement; hero: Hero; footer: FooterCfg }> }>('/api/admin/settings');
      setSettings({
        announcement: { ...({ active: false, textEn: '', textHi: '', code: '', discount: '', note: '' } as Announcement), ...(j.settings.announcement ?? {}) },
        hero: { ...({ titleEn: '', titleHi: '', subEn: '', ctaPrimary: 'Shop now', ctaSecondary: 'Our story', proof: [] } as Hero), ...(j.settings.hero ?? {}) },
        footer: { ...({ signoff: '', tagHi: '' } as FooterCfg), ...(j.settings.footer ?? {}) },
      });
    } catch (e) {
      setError(errText(e));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!settings) return <SkeletonRows rows={3} />;

  return (
    <div className="space-y-4">
      <AnnouncementForm initial={settings.announcement} onSaved={() => void load()} />
      <HeroForm initial={settings.hero} onSaved={() => void load()} />
      <FooterForm initial={settings.footer} onSaved={() => void load()} />
    </div>
  );
}

function AnnouncementForm({ initial, onSaved }: { initial: Announcement; onSaved: () => void }) {
  const [form, setForm] = useState<Announcement>(initial);
  const { busy, save } = useCfgSave('announcement', onSaved);
  const set = <K extends keyof Announcement>(k: K, v: Announcement[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <SettingsCard
      title="Announcement bar"
      desc="The marquee strip at the very top of the storefront — coupon push, festival note, shipping promise."
      busy={busy}
      onSave={() => void save(form)}
    >
      <div className="sm:col-span-2">
        <Toggle checked={form.active} onChange={(v) => set('active', v)} label="Show the announcement bar on the storefront" />
      </div>
      <Field label="Text (English)"><TextField value={form.textEn} onChange={(e) => set('textEn', e.target.value)} placeholder="माटी, ममता आ नव वर्ष…" /></Field>
      <Field label="Text (Hindi)"><TextField value={form.textHi} onChange={(e) => set('textHi', e.target.value)} /></Field>
      <Field label="Coupon code"><TextField value={form.code} onChange={(e) => set('code', e.target.value)} placeholder="BIHARSE15" /></Field>
      <Field label="Discount label"><TextField value={form.discount} onChange={(e) => set('discount', e.target.value)} placeholder="15% OFF" /></Field>
      <div className="sm:col-span-2">
        <Field label="Note (third chip)"><TextField value={form.note} onChange={(e) => set('note', e.target.value)} placeholder="Limited stock" /></Field>
      </div>
    </SettingsCard>
  );
}

function HeroForm({ initial, onSaved }: { initial: Hero; onSaved: () => void }) {
  const [form, setForm] = useState<Hero>(initial);
  const [proof, setProof] = useState((initial.proof ?? []).join(' · '));
  const { busy, save } = useCfgSave('hero', onSaved);
  const set = <K extends keyof Hero>(k: K, v: Hero[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <SettingsCard
      title="Hero section"
      desc="Headline, subline and CTA labels of the home hero. Proof chips must stay truthful (no invented ratings or counts)."
      busy={busy}
      onSave={() => void save({ ...form, proof: proof.split('·').map((s) => s.trim()).filter(Boolean) })}
    >
      <Field label="Headline (English)"><TextField value={form.titleEn} onChange={(e) => set('titleEn', e.target.value)} /></Field>
      <Field label="Headline (Hindi)"><TextField value={form.titleHi} onChange={(e) => set('titleHi', e.target.value)} /></Field>
      <div className="sm:col-span-2">
        <Field label="Subline (English)"><TextField value={form.subEn} onChange={(e) => set('subEn', e.target.value)} /></Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="Subline (Hindi)"><TextField value={form.subHi ?? ''} onChange={(e) => set('subHi', e.target.value)} /></Field>
      </div>
      <Field label="Primary CTA"><TextField value={form.ctaPrimary} onChange={(e) => set('ctaPrimary', e.target.value)} /></Field>
      <Field label="Secondary CTA"><TextField value={form.ctaSecondary} onChange={(e) => set('ctaSecondary', e.target.value)} /></Field>
      <div className="sm:col-span-2">
        <Field label="Proof chips (separate with ·)" hint="Only real claims — e.g. 100% Homemade · Delivered in 5–8 days · Secured payments">
          <TextField value={proof} onChange={(e) => setProof(e.target.value)} />
        </Field>
      </div>
    </SettingsCard>
  );
}

function FooterForm({ initial, onSaved }: { initial: FooterCfg; onSaved: () => void }) {
  const [form, setForm] = useState<FooterCfg>(initial);
  const { busy, save } = useCfgSave('footer', onSaved);
  const set = <K extends keyof FooterCfg>(k: K, v: FooterCfg[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <SettingsCard title="Footer sign-off" desc="Closing lines of the storefront footer." busy={busy} onSave={() => void save(form)}>
      <Field label="Sign-off (English)"><TextField value={form.signoff} onChange={(e) => set('signoff', e.target.value)} /></Field>
      <Field label="Tagline (Hindi)"><TextField value={form.tagHi} onChange={(e) => set('tagHi', e.target.value)} /></Field>
    </SettingsCard>
  );
}

'use client';

/* ── Feature flags — storefront behaviour switches ── */

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Bootstrap } from '@/lib/types';
import { ErrorState, SkeletonRows, Toggle } from '../ui';
import { SettingsCard, useCfgSave } from './store-settings';

type Flags = Bootstrap['flags'];

const FLAG_HELP: Record<keyof Flags, string> = {
  music: 'Bottom-left festive music button (Bhojpuri Chhath song, gesture-gated, never autoplays with sound).',
  exitIntent: 'The one-per-session exit-intent offer card. Honest copy, dismissible, respects consent.',
  whatsapp: 'WhatsApp support/contact surfaces (kept off until a business WhatsApp number is configured).',
  reviews: 'Customer reviews on product pages and the real-review testimonials section.',
};

export function FlagsPanel() {
  const [flags, setFlags] = useState<Flags | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const j = await api<{ settings: { flags?: Flags } }>('/api/admin/settings');
      setFlags({ music: false, exitIntent: false, whatsapp: false, reviews: true, ...(j.settings.flags ?? {}) });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!flags) return <SkeletonRows rows={2} />;

  return <FlagsForm initial={flags} onSaved={() => void load()} />;
}

function FlagsForm({ initial, onSaved }: { initial: Flags; onSaved: () => void }) {
  const [form, setForm] = useState<Flags>(initial);
  const { busy, save } = useCfgSave('flags', onSaved);
  const keys = Object.keys(FLAG_HELP) as (keyof Flags)[];

  return (
    <SettingsCard
      title="Feature flags"
      desc="Turn storefront features on or off instantly — changes are live after save."
      busy={busy}
      onSave={() => void save(form)}
      note="Flags flow through /api/bootstrap to the public site within seconds. Nothing here is customer data."
    >
      {keys.map((k) => (
        <div key={k} className="sm:col-span-2 rounded-xl border border-line-warm bg-cream-2/50 px-3 py-2.5">
          <Toggle
            checked={Boolean(form[k])}
            onChange={(v) => setForm((f) => ({ ...f, [k]: v }))}
            label={k}
          />
          <p className="mt-1 pl-1 text-xs text-jaggery-2">{FLAG_HELP[k]}</p>
        </div>
      ))}
    </SettingsCard>
  );
}

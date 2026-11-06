'use client';

/* ── Discounts & coupons — table + add/edit dialog + toggle + delete ── */

import { useCallback, useEffect, useState } from 'react';
import { Plus, RefreshCw, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { formatINR } from '@/lib/money';
import { toast } from '@/hooks/use-toast';
import type { AdminCouponDto } from '@/lib/types';
import { Card, DotBadge, EmptyState, ErrorState, Field, Modal, SkeletonRows, TableScroll, Td, TextField, Th, Toggle, errText, fmtDate, miniBtn, miniBtnDanger, selectTriggerCls, useConfirm } from '../ui';
import { SelectMenu } from '@/components/ui/select-menu';

interface FormState {
  id?: string;
  code: string;
  type: 'PERCENT' | 'FLAT';
  value: string;
  minSubtotal: string;
  maxDiscount: string;
  active: boolean;
  expiresAt: string; // date input value
  note: string;
}

const EMPTY: FormState = { code: '', type: 'PERCENT', value: '10', minSubtotal: '0', maxDiscount: '0', active: true, expiresAt: '', note: '' };

export function CouponsPanel() {
  const [rows, setRows] = useState<AdminCouponDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [busy, setBusy] = useState(false);
  const { ask, dialog } = useConfirm();

  const load = useCallback(async () => {
    setError(null);
    try {
      const j = await api<{ coupons: AdminCouponDto[] }>('/api/admin/coupons');
      setRows(j.coupons);
    } catch (e) {
      setError(errText(e));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openEdit(c: AdminCouponDto) {
    setForm({
      id: c.id,
      code: c.code,
      type: c.type,
      value: String(c.type === 'PERCENT' ? c.value : c.value / 100),
      minSubtotal: String(c.minSubtotal / 100),
      maxDiscount: String(c.maxDiscount / 100),
      active: c.active,
      expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : '',
      note: c.note,
    });
  }

  async function save() {
    if (!form) return;
    const code = form.code.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,24}$/.test(code)) {
      toast({ title: 'Code must be 3–24 letters/numbers', variant: 'destructive' });
      return;
    }
    const value = form.type === 'PERCENT' ? Math.round(Number(form.value) || 0) : Math.round((Number(form.value) || 0) * 100);
    if (value < 1) {
      toast({ title: form.type === 'PERCENT' ? 'Percent must be at least 1' : 'Amount must be above ₹0', variant: 'destructive' });
      return;
    }
    if (form.type === 'PERCENT' && value > 99) {
      toast({ title: 'Percent discounts are capped at 99', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const body = {
        id: form.id,
        code,
        type: form.type,
        value,
        minSubtotal: Math.round((Number(form.minSubtotal) || 0) * 100),
        maxDiscount: Math.round((Number(form.maxDiscount) || 0) * 100),
        active: form.active,
        expiresAt: form.expiresAt ? new Date(`${form.expiresAt}T23:59:59`).toISOString() : null,
        note: form.note,
      };
      if (form.id) await api('/api/admin/coupons', { method: 'PATCH', body: JSON.stringify(body) });
      else await api('/api/admin/coupons', { method: 'POST', body: JSON.stringify(body) });
      toast({ title: form.id ? `Coupon ${code} saved` : `Coupon ${code} created` });
      setForm(null);
      await load();
    } catch (e) {
      toast({ title: 'Save failed', description: errText(e), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  async function toggle(c: AdminCouponDto) {
    try {
      await api('/api/admin/coupons', { method: 'PATCH', body: JSON.stringify({ id: c.id, active: !c.active }) });
      toast({ title: `${c.code} ${c.active ? 'deactivated' : 'activated'}` });
      await load();
    } catch (e) {
      toast({ title: 'Toggle failed', description: errText(e), variant: 'destructive' });
    }
  }

  function remove(c: AdminCouponDto) {
    ask(`Delete coupon ${c.code}?`, `It has been used ${c.usageCount} time(s). Deleting cannot be undone.`, async () => {
      try {
        await api(`/api/admin/coupons?id=${encodeURIComponent(c.id)}`, { method: 'DELETE' });
        toast({ title: `${c.code} deleted` });
        await load();
      } catch (e) {
        toast({ title: 'Delete failed', description: errText(e), variant: 'destructive' });
      }
    }, { confirmLabel: 'Delete coupon' });
  }

  return (
    <div className="space-y-4">
      <Card className="p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-jaggery-2">{rows ? `${rows.length} coupon(s)` : 'Loading…'}</p>
          <div className="flex gap-2">
            <button type="button" className={miniBtn} onClick={() => void load()} aria-label="Refresh coupons">
              <RefreshCw size={13} /> Refresh
            </button>
            <button type="button" className="btn-primary h-9 px-4 py-0 text-sm" onClick={() => setForm({ ...EMPTY })}>
              <Plus size={14} /> Add coupon
            </button>
          </div>
        </div>
      </Card>

      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {!rows && !error && <SkeletonRows rows={3} />}
      {rows && rows.length === 0 && !error && <EmptyState title="No coupons yet" hint="Create a discount code for the announcement bar or campaigns." />}

      {rows && rows.length > 0 && (
        <Card className="overflow-hidden">
          <TableScroll maxHeight="66vh" ariaLabel="Coupons list">
            <thead>
              <tr>
                <Th>Code</Th>
                <Th>Discount</Th>
                <Th>Min subtotal</Th>
                <Th>Cap</Th>
                <Th>Usage</Th>
                <Th>Expiry</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const expired = c.expiresAt ? new Date(c.expiresAt).getTime() < Date.now() : false;
                return (
                  <tr key={c.id} className="transition hover:bg-cream-2/60">
                    <Td>
                      <span className="block font-mono font-bold text-ink">{c.code}</span>
                      {c.note && <span className="block max-w-44 truncate text-xs text-jaggery-3">{c.note}</span>}
                    </Td>
                    <Td className="font-semibold">{c.type === 'PERCENT' ? `${c.value}% off` : `${formatINR(c.value)} off`}</Td>
                    <Td className="text-sm text-jaggery-2">{c.minSubtotal > 0 ? formatINR(c.minSubtotal) : '—'}</Td>
                    <Td className="text-sm text-jaggery-2">{c.maxDiscount > 0 ? formatINR(c.maxDiscount) : 'No cap'}</Td>
                    <Td className="font-semibold">{c.usageCount}×</Td>
                    <Td className="text-sm text-jaggery-2">{c.expiresAt ? fmtDate(c.expiresAt) : 'Never'}</Td>
                    <Td>
                      <DotBadge label={expired ? 'Expired' : c.active ? 'Active' : 'Off'} tone={expired ? 'muted' : c.active ? 'green' : 'muted'} />
                    </Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Toggle checked={c.active && !expired} onChange={() => void toggle(c)} label={`Toggle coupon ${c.code}`} disabled={expired} />
                        <button type="button" className={miniBtn} onClick={() => openEdit(c)} aria-label={`Edit coupon ${c.code}`}>Edit</button>
                        <button type="button" className={miniBtnDanger} onClick={() => remove(c)} aria-label={`Delete coupon ${c.code}`}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableScroll>
        </Card>
      )}

      {form && (
        <Modal title={form.id ? `Edit ${form.code}` : 'New coupon'} onClose={() => setForm(null)}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Code"><TextField value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="CHHATH10" /></Field>
              <Field label="Type">
                <SelectMenu
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v as 'PERCENT' | 'FLAT' })}
                  options={[{ value: 'PERCENT', label: 'Percent off' }, { value: 'FLAT', label: 'Flat ₹ off' }]}
                  label="Coupon type"
                  className={`${selectTriggerCls} w-full`}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={form.type === 'PERCENT' ? 'Percent (1–99)' : 'Amount (₹)'}>
                <TextField type="number" min={1} step={form.type === 'PERCENT' ? 1 : '0.01'} value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
              </Field>
              <Field label="Min subtotal (₹)">
                <TextField type="number" min={0} step="0.01" value={form.minSubtotal} onChange={(e) => setForm({ ...form, minSubtotal: e.target.value })} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Max discount cap (₹, 0 = uncapped)">
                <TextField type="number" min={0} step="0.01" value={form.maxDiscount} onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })} />
              </Field>
              <Field label="Expiry (optional)">
                <input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} aria-label="Coupon expiry date" className="h-10 w-full rounded-xl border border-line-warm bg-white px-3 text-sm text-ink shadow-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/25" />
              </Field>
            </div>
            <Field label="Internal note"><TextField value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Chhath campaign" /></Field>
            <div className="flex items-center gap-2">
              <Toggle checked={form.active} onChange={(v) => setForm({ ...form, active: v })} label="Coupon active" />
              <span className="text-sm text-jaggery-2">{form.active ? 'Redeemable at checkout' : 'Inactive'}</span>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" className="btn-ghost h-10 px-5 py-0 text-sm" onClick={() => setForm(null)}>Cancel</button>
              <button type="button" className="btn-primary text-sm" onClick={() => void save()} disabled={busy}>
                {busy ? 'Saving…' : form.id ? 'Save' : 'Create'}
              </button>
            </div>
          </div>
        </Modal>
      )}
      {dialog}
    </div>
  );
}

'use client';

/* ── Categories — table + add/edit dialog + delete guard + reorder ── */

import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import type { Category } from '@/lib/types';
import { Card, EmptyState, ErrorState, Field, Modal, SkeletonRows, TableScroll, Td, TextField, Th, Toggle, errText, miniBtn, miniBtnDanger, useConfirm } from '../ui';

type AdminCategory = Category & { productCount: number; isActive: boolean; sortOrder: number };

interface FormState {
  id?: string;
  nameEn: string; nameHi: string;
  descEn: string; descHi: string;
  sortOrder: string;
  isActive: boolean;
}

const EMPTY: FormState = { nameEn: '', nameHi: '', descEn: '', descHi: '', sortOrder: '0', isActive: true };

export function CategoriesPanel() {
  const [rows, setRows] = useState<AdminCategory[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [busy, setBusy] = useState(false);
  const { ask, dialog } = useConfirm();

  const load = useCallback(async () => {
    setError(null);
    try {
      const j = await api<{ categories: AdminCategory[] }>('/api/admin/categories');
      setRows(j.categories);
    } catch (e) {
      setError(errText(e));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!form) return;
    if (!form.nameEn.trim()) {
      toast({ title: 'English name is required', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const body = {
        id: form.id,
        nameEn: form.nameEn.trim(),
        nameHi: form.nameHi.trim() || form.nameEn.trim(),
        descEn: form.descEn,
        descHi: form.descHi,
        sortOrder: Math.max(0, Math.round(Number(form.sortOrder) || 0)),
        isActive: form.isActive,
      };
      if (form.id) await api('/api/admin/categories', { method: 'PATCH', body: JSON.stringify(body) });
      else await api('/api/admin/categories', { method: 'POST', body: JSON.stringify(body) });
      toast({ title: form.id ? 'Category saved' : 'Category created', description: form.nameEn });
      setForm(null);
      await load();
    } catch (e) {
      toast({ title: 'Save failed', description: errText(e), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  function remove(c: AdminCategory) {
    ask(
      `Delete category ${c.nameEn}?`,
      c.productCount > 0
        ? `This category holds ${c.productCount} product(s) — move them to another category first.`
        : 'Categories with no products are deleted permanently.',
      async () => {
        try {
          await api(`/api/admin/categories?id=${encodeURIComponent(c.id)}`, { method: 'DELETE' });
          toast({ title: `${c.nameEn} deleted` });
          await load();
        } catch (e) {
          toast({ title: 'Delete blocked', description: errText(e), variant: 'destructive' });
        }
      },
      { confirmLabel: 'Delete category' },
    );
  }

  async function reorder(idx: number, delta: -1 | 1) {
    if (!rows) return;
    const target = idx + delta;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[idx], next[target]] = [next[target], next[idx]];
    try {
      await api('/api/admin/categories', { method: 'PATCH', body: JSON.stringify({ order: next.map((r) => r.id) }) });
      await load();
    } catch (e) {
      toast({ title: 'Reorder failed', description: errText(e), variant: 'destructive' });
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-jaggery-2">{rows ? `${rows.length} categor${rows.length === 1 ? 'y' : 'ies'} · order controls the storefront nav` : 'Loading…'}</p>
          <div className="flex gap-2">
            <button type="button" className={miniBtn} onClick={() => void load()} aria-label="Refresh categories">
              <RefreshCw size={13} /> Refresh
            </button>
            <button type="button" className="btn-primary h-9 px-4 py-0 text-sm" onClick={() => setForm({ ...EMPTY })}>
              <Plus size={14} /> Add category
            </button>
          </div>
        </div>
      </Card>

      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {!rows && !error && <SkeletonRows rows={4} />}
      {rows && rows.length === 0 && !error && <EmptyState title="No categories" hint="Create the first category to group your products." />}

      {rows && rows.length > 0 && (
        <Card className="overflow-hidden">
          <TableScroll maxHeight="66vh" ariaLabel="Categories list">
            <thead>
              <tr>
                <Th className="w-24">Order</Th>
                <Th>Category</Th>
                <Th>Name (HI)</Th>
                <Th>Products</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c, i) => (
                <tr key={c.id} className="transition hover:bg-cream-2/60">
                  <Td>
                    <div className="flex gap-1">
                      <button type="button" className={miniBtn} onClick={() => void reorder(i, -1)} disabled={i === 0} aria-label={`Move ${c.nameEn} up`}>
                        <ArrowLeft size={12} className="-rotate-90" />
                      </button>
                      <button type="button" className={miniBtn} onClick={() => void reorder(i, 1)} disabled={i === rows.length - 1} aria-label={`Move ${c.nameEn} down`}>
                        <ArrowLeft size={12} className="rotate-90" />
                      </button>
                    </div>
                  </Td>
                  <Td>
                    <span className="block font-semibold text-ink">{c.nameEn}</span>
                    <span className="block text-xs text-jaggery-3">{c.slug}</span>
                  </Td>
                  <Td className="text-sm text-jaggery-2">{c.nameHi}</Td>
                  <Td className="font-semibold">{c.productCount}</Td>
                  <Td>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${c.isActive ? 'text-emerald-700' : 'text-jaggery-3'}`}>
                      <span className={`h-2 w-2 rounded-full ${c.isActive ? 'bg-emerald-600' : 'bg-jaggery-3'}`} aria-hidden />
                      {c.isActive ? 'Active' : 'Hidden'}
                    </span>
                  </Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <button type="button" className={miniBtn} onClick={() => setForm({ id: c.id, nameEn: c.nameEn, nameHi: c.nameHi, descEn: c.descEn, descHi: c.descHi, sortOrder: String(c.sortOrder), isActive: c.isActive })} aria-label={`Edit ${c.nameEn}`}>
                        Edit
                      </button>
                      <button type="button" className={miniBtnDanger} onClick={() => remove(c)} aria-label={`Delete ${c.nameEn}`}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableScroll>
        </Card>
      )}

      {form && (
        <Modal title={form.id ? 'Edit category' : 'New category'} onClose={() => setForm(null)}>
          <div className="space-y-3">
            <Field label="Name (EN)"><TextField value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} /></Field>
            <Field label="Name (HI)"><TextField value={form.nameHi} onChange={(e) => setForm({ ...form, nameHi: e.target.value })} placeholder="ठेकुआ" /></Field>
            <Field label="Description (EN)"><TextField value={form.descEn} onChange={(e) => setForm({ ...form, descEn: e.target.value })} /></Field>
            <Field label="Description (HI)"><TextField value={form.descHi} onChange={(e) => setForm({ ...form, descHi: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Sort order"><TextField type="number" min={0} value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} /></Field>
              <div>
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-jaggery-2">Active</span>
                <div className="flex items-center gap-2 pt-1.5">
                  <Toggle checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} label="Category active" />
                  <span className="text-sm text-jaggery-2">{form.isActive ? 'Shown on site' : 'Hidden'}</span>
                </div>
              </div>
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

'use client';

/* ── Inventory — stock-focused table with inline edits + low-stock filter ── */

import { useCallback, useEffect, useState } from 'react';
import { Check, RefreshCw, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { Card, Chip, DotBadge, EmptyState, ErrorState, SkeletonRows, TableScroll, Td, TextField, Th, errText, miniBtn } from '../ui';
import { SelectMenu } from '@/components/ui/select-menu';
import { selectTriggerCls } from '../ui';
import type { AdminProduct } from './products';

export function InventoryPanel() {
  const [rows, setRows] = useState<AdminProduct[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qInput, setQInput] = useState('');
  const [filter, setFilter] = useState('all');
  const [drafts, setDrafts] = useState<Record<string, { stock: string; lowAt: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const sp = new URLSearchParams({ perPage: '100' });
      if (qInput.trim()) sp.set('q', qInput.trim());
      if (filter !== 'all') sp.set('status', filter);
      const j = await api<{ products: AdminProduct[] }>(`/api/admin/products?${sp.toString()}`);
      setRows(j.products);
      setDrafts(Object.fromEntries(j.products.map((p) => [p.id, { stock: String(p.stock), lowAt: String(p.lowStockAt) }])));
    } catch (e) {
      setError(errText(e));
    }
  }, [qInput, filter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveStock(p: AdminProduct) {
    const draft = drafts[p.id];
    if (!draft) return;
    const stock = Math.max(0, Math.round(Number(draft.stock) || 0));
    const lowAt = Math.max(0, Math.round(Number(draft.lowAt) || 0));
    if (stock === p.stock && lowAt === p.lowStockAt) return;
    setSaving(p.id);
    try {
      await api('/api/admin/products', { method: 'PATCH', body: JSON.stringify({ id: p.id, stock, lowStockAt: lowAt }) });
      toast({ title: `${p.nameEn} → ${stock} in stock`, description: `alert at ${lowAt}` });
      await load();
    } catch (e) {
      toast({ title: 'Save failed', description: errText(e), variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  }

  const lowCount = (rows ?? []).filter((p) => p.stock <= p.lowStockAt).length;

  return (
    <div className="space-y-4">
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-48 flex-1">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-jaggery-3" aria-hidden />
            <TextField value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Search product…" aria-label="Search inventory" className="pl-9" />
          </div>
          <SelectMenu
            value={filter}
            onValueChange={setFilter}
            options={[{ value: 'all', label: 'All products' }, { value: 'low', label: 'Low stock only' }, { value: 'active', label: 'Active only' }]}
            label="Inventory filter"
            className={`${selectTriggerCls} w-44`}
          />
          <button type="button" className={miniBtn} onClick={() => void load()} aria-label="Refresh inventory">
            <RefreshCw size={13} /> Refresh
          </button>
          {lowCount > 0 && <DotBadge label={`${lowCount} low`} tone="amber" />}
        </div>
      </Card>

      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {!rows && !error && <SkeletonRows rows={5} />}
      {rows && rows.length === 0 && !error && <EmptyState title="Nothing to restock" hint="No products match this filter." />}

      {rows && rows.length > 0 && (
        <Card className="overflow-hidden">
          <TableScroll maxHeight="66vh" ariaLabel="Inventory table">
            <thead>
              <tr>
                <Th>Product</Th>
                <Th>Stock</Th>
                <Th>Alert at</Th>
                <Th>State</Th>
                <Th>Batch</Th>
                <Th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const draft = drafts[p.id] ?? { stock: String(p.stock), lowAt: String(p.lowStockAt) };
                const low = p.stock <= p.lowStockAt;
                const dirty = Number(draft.stock) !== p.stock || Number(draft.lowAt) !== p.lowStockAt;
                return (
                  <tr key={p.id} className="transition hover:bg-cream-2/60">
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <img src={p.images?.[0] || '/brand/mandala.png'} alt="" className="h-10 w-10 rounded-xl border border-line-warm bg-cream-2 object-cover" />
                        <div className="min-w-0">
                          <span className="block max-w-52 truncate font-semibold text-ink">{p.nameEn}</span>
                          <span className="block max-w-52 truncate text-xs text-jaggery-3">{p.slug}</span>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <TextField
                        type="number"
                        min={0}
                        value={draft.stock}
                        onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: { ...draft, stock: e.target.value } }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void saveStock(p);
                        }}
                        aria-label={`Stock for ${p.nameEn}`}
                        className="h-9 w-20 text-center font-bold"
                      />
                    </Td>
                    <Td>
                      <TextField
                        type="number"
                        min={0}
                        value={draft.lowAt}
                        onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: { ...draft, lowAt: e.target.value } }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void saveStock(p);
                        }}
                        aria-label={`Low-stock threshold for ${p.nameEn}`}
                        className="h-9 w-20 text-center"
                      />
                    </Td>
                    <Td>{low ? <DotBadge label={`Low — ${p.stock} left`} tone="amber" /> : <DotBadge label="Healthy" tone="green" />}</Td>
                    <Td className="text-sm text-jaggery-2">{p.batchDate || '—'}</Td>
                    <Td>
                      <button type="button" className={miniBtn} onClick={() => void saveStock(p)} disabled={!dirty || saving === p.id} aria-label={`Save stock for ${p.nameEn}`}>
                        {saving === p.id ? '…' : dirty ? <><Check size={13} /> Save</> : '✓'}
                      </button>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableScroll>
          <p className="border-t border-line-warm px-4 py-2.5 text-xs text-jaggery-3">
            Stock and alert thresholds save per row (Enter or the ✓ button). Sold-per-day trends: open Dashboard → Top products.
          </p>
        </Card>
      )}
      {saving && <Chip tone="brand">Saving…</Chip>}
    </div>
  );
}

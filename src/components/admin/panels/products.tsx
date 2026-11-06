'use client';

/* ── Products — list with filters + full-page add/edit form (with upload) ── */

import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, RefreshCw, Search, Star, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { formatINR } from '@/lib/money';
import { toast } from '@/hooks/use-toast';
import type { Category, Product } from '@/lib/types';
import {
  Card, Chip, EmptyState, ErrorState, Pagination, SkeletonRows, TableScroll, Td, TextField, Th,
  errText, miniBtn, miniBtnDanger, selectTriggerCls, useConfirm, useDebounced,
} from '../ui';
import { SelectMenu } from '@/components/ui/select-menu';
import { ProductForm } from './product-form';

export type AdminProduct = Product & { isActive?: boolean };

const STATUS_FILTERS = ['all', 'active', 'inactive', 'featured', 'demo', 'low'];

export function ProductsPanel() {
  const [mode, setMode] = useState<'list' | 'form'>('list');
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [products, setProducts] = useState<AdminProduct[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [qInput, setQInput] = useState('');
  const q = useDebounced(qInput);
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { ask, dialog } = useConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sp = new URLSearchParams({ page: String(page), perPage: String(perPage) });
      if (q.trim()) sp.set('q', q.trim());
      if (category !== 'all') sp.set('category', category);
      if (status !== 'all') sp.set('status', status);
      const [list, cats] = await Promise.all([
        api<{ products: AdminProduct[]; total: number; pages: number }>(`/api/admin/products?${sp.toString()}`),
        api<{ categories: (Category & { productCount: number; isActive: boolean })[] }>('/api/admin/categories'),
      ]);
      setProducts(list.products);
      setTotal(list.total);
      setPages(list.pages);
      setCategories(cats.categories);
    } catch (e) {
      setError(errText(e));
    } finally {
      setLoading(false);
    }
  }, [page, perPage, q, category, status]);

  useEffect(() => {
    if (mode === 'list') void load();
  }, [load, mode]);

  function openNew() {
    setEditing(null);
    setMode('form');
  }

  function openEdit(p: AdminProduct) {
    setEditing(p);
    setMode('form');
  }

  function remove(p: AdminProduct) {
    ask(
      `Delete ${p.nameEn}?`,
      'If the product was ever ordered it will be hidden from the store instead of removed; unreferenced products are deleted permanently.',
      async () => {
        try {
          const r = await api<{ soft?: boolean; hard?: boolean; orderItems?: number }>(`/api/admin/products?id=${encodeURIComponent(p.id)}`, { method: 'DELETE' });
          if (r.soft) toast({ title: `${p.nameEn} hidden`, description: `Referenced by ${r.orderItems} order line(s) — set inactive instead of deleting.` });
          else toast({ title: `${p.nameEn} deleted` });
          await load();
        } catch (e) {
          toast({ title: 'Delete blocked', description: errText(e), variant: 'destructive' });
        }
      },
      { confirmLabel: 'Delete product' },
    );
  }

  if (mode === 'form') {
    return (
      <ProductForm
        key={editing?.id ?? 'new'}
        product={editing}
        categories={categories}
        onCancel={() => setMode('list')}
        onSaved={() => {
          setMode('list');
          void load();
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-48 flex-1">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-jaggery-3" aria-hidden />
            <TextField value={qInput} onChange={(e) => { setQInput(e.target.value); setPage(1); }} placeholder="Search name or slug…" aria-label="Search products" className="pl-9" />
          </div>
          <SelectMenu
            value={category}
            onValueChange={(v) => { setCategory(v); setPage(1); }}
            options={[{ value: 'all', label: 'All categories' }, ...categories.map((c) => ({ value: c.slug, label: c.nameEn }))]}
            label="Filter by category"
            className={`${selectTriggerCls} w-44`}
          />
          <SelectMenu
            value={status}
            onValueChange={(v) => { setStatus(v); setPage(1); }}
            options={STATUS_FILTERS.map((s) => ({ value: s, label: s === 'all' ? 'All statuses' : s === 'low' ? 'Low stock' : s[0].toUpperCase() + s.slice(1) }))}
            label="Filter by status"
            className={`${selectTriggerCls} w-36`}
          />
          <button type="button" className={miniBtn} onClick={() => void load()} aria-label="Refresh products">
            <RefreshCw size={13} /> Refresh
          </button>
          <button type="button" className="btn-primary h-9 px-4 py-0 text-sm" onClick={openNew}>
            <Plus size={14} /> Add product
          </button>
        </div>
      </Card>

      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {!products && loading && !error && <SkeletonRows rows={6} />}
      {products && products.length === 0 && !error && <EmptyState title="No products found" hint="Adjust the filters or add your first product." />}

      {products && products.length > 0 && (
        <Card className="overflow-hidden">
          <TableScroll maxHeight="66vh" ariaLabel="Products list">
            <thead>
              <tr>
                <Th>Product</Th>
                <Th>Category</Th>
                <Th>Price</Th>
                <Th>Stock</Th>
                <Th>Rating</Th>
                <Th>Flags</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const low = p.stock <= p.lowStockAt;
                return (
                  <tr key={p.id} className="transition hover:bg-cream-2/60">
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <img src={p.images?.[0] || '/brand/mandala.png'} alt="" className="h-11 w-11 rounded-xl border border-line-warm bg-cream-2 object-cover" />
                        <div className="min-w-0">
                          <span className="block max-w-52 truncate font-semibold text-ink">{p.nameEn}</span>
                          <span className="block max-w-52 truncate text-xs text-jaggery-3">{p.slug}</span>
                        </div>
                      </div>
                    </Td>
                    <Td className="text-sm text-jaggery-2">{p.categoryNameEn}</Td>
                    <Td>
                      <span className="block font-bold">{formatINR(p.price)}</span>
                      <span className="block text-xs text-jaggery-3 line-through">{formatINR(p.mrp)}</span>
                    </Td>
                    <Td>
                      <span className={`font-bold ${low ? 'text-brand-deep' : 'text-ink'}`}>{p.stock}</span>
                      {low && <span className="block text-xs text-brand-deep">low (≤{p.lowStockAt})</span>}
                    </Td>
                    <Td>
                      <span className="inline-flex items-center gap-1 text-sm text-jaggery-2">
                        <Star size={12} className="fill-turmeric text-turmeric" aria-hidden /> {p.rating > 0 ? p.rating.toFixed(1) : '—'} <span className="text-xs text-jaggery-3">({p.reviewCount})</span>
                      </span>
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        {p.isActive === false && <Chip tone="muted">Hidden</Chip>}
                        {p.isFeatured && <Chip tone="gold">Featured</Chip>}
                        {p.isDemo && <Chip tone="amber">Demo</Chip>}
                        {p.isActive !== false && !p.isFeatured && !p.isDemo && <Chip tone="jaggery">Live</Chip>}
                      </div>
                    </Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <button type="button" className={miniBtn} onClick={() => openEdit(p)} aria-label={`Edit ${p.nameEn}`}>
                          <Pencil size={13} /> Edit
                        </button>
                        <button type="button" className={miniBtnDanger} onClick={() => remove(p)} aria-label={`Delete ${p.nameEn}`}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableScroll>
          <Pagination page={page} pages={pages} total={total} perPage={perPage} onPage={setPage} onPerPage={(n) => { setPerPage(n); setPage(1); }} />
        </Card>
      )}
      {dialog}
    </div>
  );
}

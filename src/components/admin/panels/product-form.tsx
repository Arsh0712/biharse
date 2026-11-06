'use client';

/* ── Product form — full-page two-column editor with sticky save bar ──
 * Every model field covered: bilingual copy, compliance, pricing/tax,
 * inventory, variants / FAQ / nutrition repeaters, SEO, image uploads. */

import { useCallback, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { ArrowLeft, ArrowRight, GripVertical, ImagePlus, Loader2, Save, Trash2, UploadCloud, X } from 'lucide-react';
import { api } from '@/lib/api';
import { formatINR, rupeesToPaise } from '@/lib/money';
import { toast } from '@/hooks/use-toast';
import type { Category, ProductFaq, ProductVariant, NutritionRow } from '@/lib/types';
import { Card, CardHead, DotBadge, Field, TextField, Toggle, errText } from '../ui';
import { SelectMenu } from '@/components/ui/select-menu';
import type { AdminProduct } from './products';

interface FormState {
  nameEn: string; nameHi: string;
  taglineEn: string; taglineHi: string;
  storyEn: string; storyHi: string;
  ingredientsEn: string; ingredientsHi: string;
  allergensEn: string; allergensHi: string;
  storageEn: string; storageHi: string;
  shelfLifeDays: string; batchDate: string;
  categorySlug: string;
  mrp: string; price: string;
  gstRate: string; hsn: string;
  stock: string; lowStockAt: string;
  isActive: boolean; isFeatured: boolean; isDemo: boolean;
  variants: ProductVariant[];
  faq: ProductFaq[];
  nutrition: NutritionRow[];
  images: string[];
  seoTitle: string; seoDesc: string;
}

function initialState(p: AdminProduct | null, categorySlugDefault: string): FormState {
  return {
    nameEn: p?.nameEn ?? '',
    nameHi: p?.nameHi ?? '',
    taglineEn: p?.taglineEn ?? '',
    taglineHi: p?.taglineHi ?? '',
    storyEn: p?.storyEn ?? '',
    storyHi: p?.storyHi ?? '',
    ingredientsEn: p?.ingredientsEn ?? '',
    ingredientsHi: p?.ingredientsHi ?? '',
    allergensEn: p?.allergensEn ?? '',
    allergensHi: p?.allergensHi ?? '',
    storageEn: p?.storageEn ?? '',
    storageHi: p?.storageHi ?? '',
    shelfLifeDays: String(p?.shelfLifeDays ?? 30),
    batchDate: p?.batchDate ?? '',
    categorySlug: p?.categorySlug ?? categorySlugDefault,
    mrp: String((p?.mrp ?? 0) / 100),
    price: String((p?.price ?? 0) / 100),
    gstRate: String(p?.gstRate ?? 5),
    hsn: p?.hsn ?? '1905',
    stock: String(p?.stock ?? 100),
    lowStockAt: String(p?.lowStockAt ?? 12),
    isActive: p ? p.isActive !== false : true,
    isFeatured: Boolean(p?.isFeatured),
    isDemo: Boolean(p?.isDemo),
    variants: p?.variants ? p.variants.map((v) => ({ ...v })) : [],
    faq: p?.faq ? p.faq.map((f) => ({ ...f })) : [],
    nutrition: p?.nutrition ? p.nutrition.map((n) => ({ ...n })) : [],
    images: p?.images ? [...p.images] : [],
    seoTitle: p?.seoTitle ?? '',
    seoDesc: p?.seoDesc ?? '',
  };
}

const TA_CLS =
  'min-h-24 w-full rounded-xl border border-line-warm bg-white px-3 py-2 text-sm text-ink shadow-sm outline-none transition placeholder:text-jaggery-3/70 focus:border-brand focus:ring-2 focus:ring-brand/25';

function Textarea({ value, onChange, placeholder, ariaLabel, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; ariaLabel: string; rows?: number }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
      rows={rows}
      className={TA_CLS}
    />
  );
}

/* ── images uploader ─────────────────────────────────────────────────── */

function ImagesEditor({ images, onChange }: { images: string[]; onChange: (imgs: string[]) => void }) {
  const [busy, setBusy] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files).slice(0, 8 - images.length);
      for (const file of list) {
        if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) {
          toast({ title: `${file.name}: PNG, JPEG or WebP only`, variant: 'destructive' });
          continue;
        }
        if (file.size > 5 * 1024 * 1024) {
          toast({ title: `${file.name} is over 5MB`, variant: 'destructive' });
          continue;
        }
        setBusy((b) => b + 1);
        try {
          const fd = new FormData();
          fd.append('file', file);
          const r = await fetch('/api/admin/upload', { method: 'POST', body: fd });
          const j = (await r.json().catch(() => ({}))) as { url?: string; error?: string };
          if (!r.ok || !j.url) throw new Error(j.error || `Upload failed (${r.status})`);
          onChange([...images, j.url]);
          images = [...images, j.url];
        } catch (e) {
          toast({ title: 'Upload failed', description: errText(e), variant: 'destructive' });
        } finally {
          setBusy((b) => Math.max(0, b - 1));
        }
      }
    },
    [images, onChange],
  );

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) void upload(e.dataTransfer.files);
  }

  function removeAt(idx: number) {
    onChange(images.filter((_, i) => i !== idx));
  }

  function moveTo(idx: number, delta: -1 | 1) {
    const next = [...images];
    const target = idx + delta;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        aria-label={`Upload product images — ${images.length}/8 used`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
        }}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition ${
          dragOver ? 'border-brand bg-brand/5' : 'border-line-warm bg-cream-2/50 hover:border-brand/50'
        }`}
      >
        <UploadCloud size={28} className="text-jaggery-3" aria-hidden />
        <p className="mt-2 text-sm font-semibold text-ink">Drag &amp; drop images here, or click to browse</p>
        <p className="mt-0.5 text-xs text-jaggery-3">PNG · JPEG · WebP · up to 5MB each · {images.length}/8 slots used</p>
        {busy > 0 && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-deep">
            <Loader2 size={13} className="animate-spin" aria-hidden /> uploading {busy}…
          </p>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          className="sr-only"
          aria-label="Choose image files"
          onChange={(e) => {
            if (e.target.files?.length) void upload(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
          {images.map((src, i) => (
            <div key={`${src}-${i}`} className="group relative overflow-hidden rounded-xl border border-line-warm bg-white">
              <img src={src} alt={`Product image ${i + 1}`} className="aspect-square w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-jaggery/85 px-1.5 py-1">
                <span className="text-[10px] font-bold uppercase tracking-wide text-turmeric-soft">{i === 0 ? 'Cover' : `#${i + 1}`}</span>
                <span className="flex gap-1">
                  <button type="button" onClick={() => moveTo(i, -1)} disabled={i === 0} aria-label={`Move image ${i + 1} earlier`} className="grid h-6 w-6 place-items-center rounded-md bg-cream/20 text-cream transition hover:bg-cream/35 disabled:opacity-30">
                    <ArrowLeft size={11} />
                  </button>
                  <button type="button" onClick={() => moveTo(i, 1)} disabled={i === images.length - 1} aria-label={`Move image ${i + 1} later`} className="grid h-6 w-6 place-items-center rounded-md bg-cream/20 text-cream transition hover:bg-cream/35 disabled:opacity-30">
                    <ArrowRight size={11} />
                  </button>
                  <button type="button" onClick={() => removeAt(i)} aria-label={`Remove image ${i + 1}`} className="grid h-6 w-6 place-items-center rounded-md bg-brand/80 text-cream transition hover:bg-brand">
                    <X size={11} />
                  </button>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── repeaters ───────────────────────────────────────────────────────── */

function RepeaterRow({ children, onRemove, index, total, onMove, label }: { children: React.ReactNode; onRemove: () => void; index: number; total: number; onMove: (delta: -1 | 1) => void; label: string }) {
  return (
    <div className="rounded-2xl border border-line-warm bg-cream-2/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-jaggery-2">
          <GripVertical size={13} className="text-jaggery-3" aria-hidden /> {label} {index + 1}
        </span>
        <span className="flex items-center gap-1">
          <button type="button" onClick={() => onMove(-1)} disabled={index === 0} aria-label={`Move ${label} ${index + 1} up`} className="grid h-7 w-7 place-items-center rounded-lg border border-line-warm bg-white text-jaggery disabled:opacity-30">
            <ArrowLeft size={12} className="-rotate-90" />
          </button>
          <button type="button" onClick={() => onMove(1)} disabled={index === total - 1} aria-label={`Move ${label} ${index + 1} down`} className="grid h-7 w-7 place-items-center rounded-lg border border-line-warm bg-white text-jaggery disabled:opacity-30">
            <ArrowRight size={12} className="-rotate-90" />
          </button>
          <button type="button" onClick={onRemove} aria-label={`Remove ${label} ${index + 1}`} className="grid h-7 w-7 place-items-center rounded-lg border border-brand/40 bg-brand/5 text-brand-deep transition hover:bg-brand/15">
            <Trash2 size={12} />
          </button>
        </span>
      </div>
      {children}
    </div>
  );
}

/* ── form ────────────────────────────────────────────────────────────── */

export function ProductForm({
  product, categories, onSaved, onCancel,
}: {
  product: AdminProduct | null;
  categories: Category[];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<FormState>(() => initialState(product, categories[0]?.slug ?? ''));
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));
  const isNew = !product;

  async function save() {
    const price = rupeesToPaise(Number(form.price) || 0);
    const mrp = rupeesToPaise(Number(form.mrp) || 0);
    if (!form.nameEn.trim()) return toast({ title: 'English name is required', variant: 'destructive' });
    if (!form.categorySlug) return toast({ title: 'Pick a category', variant: 'destructive' });
    if (price <= 0) return toast({ title: 'Set a sale price above ₹0', variant: 'destructive' });
    if (price > mrp) return toast({ title: 'Sale price cannot exceed MRP', variant: 'destructive' });

    const body = {
      nameEn: form.nameEn.trim(),
      nameHi: form.nameHi.trim(),
      taglineEn: form.taglineEn, taglineHi: form.taglineHi,
      storyEn: form.storyEn, storyHi: form.storyHi,
      ingredientsEn: form.ingredientsEn, ingredientsHi: form.ingredientsHi,
      allergensEn: form.allergensEn, allergensHi: form.allergensHi,
      storageEn: form.storageEn, storageHi: form.storageHi,
      shelfLifeDays: Math.max(1, Math.round(Number(form.shelfLifeDays) || 30)),
      batchDate: form.batchDate.trim(),
      categorySlug: form.categorySlug,
      mrp, price,
      gstRate: Math.max(0, Math.min(28, Math.round(Number(form.gstRate) || 5))),
      hsn: form.hsn.trim() || '1905',
      stock: Math.max(0, Math.round(Number(form.stock) || 0)),
      lowStockAt: Math.max(0, Math.round(Number(form.lowStockAt) || 12)),
      isActive: form.isActive, isFeatured: form.isFeatured, isDemo: form.isDemo,
      variants: form.variants.filter((v) => v.label.trim()),
      faq: form.faq.filter((f) => f.qEn.trim() && f.aEn.trim()),
      nutrition: form.nutrition.filter((n) => n.label.trim() && n.per100g.trim()),
      images: form.images,
      seoTitle: form.seoTitle, seoDesc: form.seoDesc,
    };

    setBusy(true);
    try {
      if (isNew) {
        await api('/api/admin/products', { method: 'POST', body: JSON.stringify(body) });
        toast({ title: 'Product created', description: `${body.nameEn} is ${body.isActive ? 'live' : 'hidden'} on the store.` });
      } else {
        await api('/api/admin/products', { method: 'PATCH', body: JSON.stringify({ id: product!.id, ...body }) });
        toast({ title: 'Product saved', description: `${body.nameEn} updated.` });
      }
      onSaved();
    } catch (e) {
      toast({ title: isNew ? 'Create failed' : 'Save failed', description: errText(e), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 pb-24">
      {/* sticky save bar */}
      <div className="sticky top-16 z-20 -mx-3 flex flex-wrap items-center gap-3 rounded-2xl border border-line-warm bg-card/95 px-4 py-3 shadow-sm backdrop-blur sm:-mx-1">
        <button type="button" className={errTextWrap} onClick={onCancel} aria-label="Back to products">
          <ArrowLeft size={14} /> Back
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-bold text-ink">{isNew ? 'New product' : `Editing — ${product!.nameEn}`}</p>
          <p className="text-xs text-jaggery-3">
            {isNew ? 'Slug is generated from the English name' : `/${product!.slug}`} · {formatINR(rupeesToPaise(Number(form.price) || 0))}
          </p>
        </div>
        <DotBadge label={form.isActive ? 'Visible on site' : 'Hidden'} tone={form.isActive ? 'jaggery' : 'muted'} />
        <button type="button" className="btn-primary h-10 px-5 py-0 text-sm" onClick={() => void save()} disabled={busy}>
          {busy ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <Save size={15} aria-hidden />}
          {busy ? 'Saving…' : isNew ? 'Create product' : 'Save changes'}
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {/* basics */}
        <Card>
          <CardHead title="Basics" desc="Names and shelf copy, bilingual" />
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            <Field label="Name (EN)"><TextField value={form.nameEn} onChange={(e) => set('nameEn', e.target.value)} placeholder="Thekua — Gur" /></Field>
            <Field label="Name (HI)"><TextField value={form.nameHi} onChange={(e) => set('nameHi', e.target.value)} placeholder="ठेकुआ — गुड़" /></Field>
            <Field label="Tagline (EN)"><TextField value={form.taglineEn} onChange={(e) => set('taglineEn', e.target.value)} /></Field>
            <Field label="Tagline (HI)"><TextField value={form.taglineHi} onChange={(e) => set('taglineHi', e.target.value)} /></Field>
            <Field label="Category">
              <SelectMenu
                value={form.categorySlug}
                onValueChange={(v) => set('categorySlug', v)}
                options={categories.map((c) => ({ value: c.slug, label: c.nameEn }))}
                label="Product category"
                className="w-full"
              />
            </Field>
            <Field label="Shelf life (days)"><TextField type="number" min={1} value={form.shelfLifeDays} onChange={(e) => set('shelfLifeDays', e.target.value)} /></Field>
            <div className="sm:col-span-2">
              <Field label="Story (EN)"><Textarea value={form.storyEn} onChange={(v) => set('storyEn', v)} ariaLabel="Story English" /></Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Story (HI)"><Textarea value={form.storyHi} onChange={(v) => set('storyHi', v)} ariaLabel="Story Hindi" /></Field>
            </div>
          </div>
        </Card>

        {/* pricing & tax */}
        <Card>
          <CardHead title="Pricing & tax" desc="₹ inputs are stored as paise integers" />
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            <Field label="MRP (₹)"><TextField type="number" min={0} step="0.01" value={form.mrp} onChange={(e) => set('mrp', e.target.value)} /></Field>
            <Field label="Sale price (₹)" hint={form.mrp && Number(form.price) < Number(form.mrp) ? `${Math.round(((Number(form.mrp) - Number(form.price)) / Number(form.mrp)) * 100)}% off MRP` : undefined}>
              <TextField type="number" min={0} step="0.01" value={form.price} onChange={(e) => set('price', e.target.value)} />
            </Field>
            <Field label="GST rate (%)">
              <SelectMenu
                value={form.gstRate}
                onValueChange={(v) => set('gstRate', v)}
                options={['0', '5', '12', '18', '28'].map((r) => ({ value: r, label: `${r}%` }))}
                label="GST rate"
                className="w-full"
              />
            </Field>
            <Field label="HSN code"><TextField value={form.hsn} onChange={(e) => set('hsn', e.target.value)} placeholder="1905" /></Field>
          </div>
        </Card>

        {/* inventory */}
        <Card>
          <CardHead title="Inventory & batch" />
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            <Field label="Stock (units)"><TextField type="number" min={0} value={form.stock} onChange={(e) => set('stock', e.target.value)} /></Field>
            <Field label="Low-stock alert at"><TextField type="number" min={0} value={form.lowStockAt} onChange={(e) => set('lowStockAt', e.target.value)} /></Field>
            <Field label="Batch date"><TextField value={form.batchDate} onChange={(e) => set('batchDate', e.target.value)} placeholder="2026-02-10" /></Field>
            <div className="flex items-end gap-5 pb-1.5">
              <span className="inline-flex items-center gap-2"><Toggle checked={form.isActive} onChange={(v) => set('isActive', v)} label="Active on storefront" /><span className="text-sm text-jaggery-2">Active</span></span>
              <span className="inline-flex items-center gap-2"><Toggle checked={form.isFeatured} onChange={(v) => set('isFeatured', v)} label="Featured on homepage" /><span className="text-sm text-jaggery-2">Featured</span></span>
              <span className="inline-flex items-center gap-2"><Toggle checked={form.isDemo} onChange={(v) => set('isDemo', v)} label="Demo product" /><span className="text-sm text-jaggery-2">Demo</span></span>
            </div>
          </div>
        </Card>

        {/* images */}
        <Card>
          <CardHead title="Images" desc="First image is the cover; drag to upload" />
          <div className="p-4">
            <ImagesEditor images={form.images} onChange={(imgs) => set('images', imgs)} />
          </div>
        </Card>

        {/* compliance */}
        <Card className="xl:col-span-2">
          <CardHead title="Recipe & compliance" desc="Ingredients, allergens and storage — shown on the product page (Legal Metrology / FSSAI)" />
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            <Field label="Ingredients (EN)"><Textarea value={form.ingredientsEn} onChange={(v) => set('ingredientsEn', v)} ariaLabel="Ingredients English" /></Field>
            <Field label="Ingredients (HI)"><Textarea value={form.ingredientsHi} onChange={(v) => set('ingredientsHi', v)} ariaLabel="Ingredients Hindi" /></Field>
            <Field label="Allergens (EN)"><Textarea value={form.allergensEn} onChange={(v) => set('allergensEn', v)} ariaLabel="Allergens English" /></Field>
            <Field label="Allergens (HI)"><Textarea value={form.allergensHi} onChange={(v) => set('allergensHi', v)} ariaLabel="Allergens Hindi" /></Field>
            <Field label="Storage (EN)"><Textarea value={form.storageEn} onChange={(v) => set('storageEn', v)} ariaLabel="Storage English" /></Field>
            <Field label="Storage (HI)"><Textarea value={form.storageHi} onChange={(v) => set('storageHi', v)} ariaLabel="Storage Hindi" /></Field>
          </div>
        </Card>

        {/* variants */}
        <Card>
          <CardHead
            title="Variants"
            desc="Weight options and their price delta (₹)"
            actions={
              <button type="button" className={miniBtnAdd} onClick={() => set('variants', [...form.variants, { label: '', weightG: 0, priceDelta: 0 }])}>
                <ImagePlus size={13} /> Add variant
              </button>
            }
          />
          <div className="space-y-3 p-4">
            {form.variants.length === 0 && <p className="text-sm text-jaggery-3">No variants — the base price applies.</p>}
            {form.variants.map((v, i) => (
              <RepeaterRow key={i} index={i} total={form.variants.length} label="Variant" onRemove={() => set('variants', form.variants.filter((_, j) => j !== i))} onMove={(d) => {
                const next = [...form.variants];
                const t = i + d;
                if (t < 0 || t >= next.length) return;
                [next[i], next[t]] = [next[t], next[i]];
                set('variants', next);
              }}>
                <div className="grid gap-2 sm:grid-cols-3">
                  <TextField value={v.label} onChange={(e) => set('variants', form.variants.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} placeholder="Label — 250g pack" aria-label={`Variant ${i + 1} label`} />
                  <TextField type="number" min={0} value={String(v.weightG)} onChange={(e) => set('variants', form.variants.map((x, j) => (j === i ? { ...x, weightG: Math.max(0, Math.round(Number(e.target.value) || 0)) } : x)))} placeholder="Weight (g)" aria-label={`Variant ${i + 1} weight in grams`} />
                  <TextField type="number" min={0} step="0.01" value={String(v.priceDelta / 100)} onChange={(e) => set('variants', form.variants.map((x, j) => (j === i ? { ...x, priceDelta: rupeesToPaise(Math.max(0, Number(e.target.value) || 0)) } : x)))} placeholder="Price delta (₹)" aria-label={`Variant ${i + 1} price delta in rupees`} />
                </div>
              </RepeaterRow>
            ))}
          </div>
        </Card>

        {/* nutrition */}
        <Card>
          <CardHead
            title="Nutrition"
            desc="Per-100g values"
            actions={
              <button type="button" className={miniBtnAdd} onClick={() => set('nutrition', [...form.nutrition, { label: '', per100g: '' }])}>
                <ImagePlus size={13} /> Add row
              </button>
            }
          />
          <div className="space-y-3 p-4">
            {form.nutrition.length === 0 && <p className="text-sm text-jaggery-3">No nutrition rows yet.</p>}
            {form.nutrition.map((n, i) => (
              <RepeaterRow key={i} index={i} total={form.nutrition.length} label="Row" onRemove={() => set('nutrition', form.nutrition.filter((_, j) => j !== i))} onMove={(d) => {
                const next = [...form.nutrition];
                const t = i + d;
                if (t < 0 || t >= next.length) return;
                [next[i], next[t]] = [next[t], next[i]];
                set('nutrition', next);
              }}>
                <div className="grid gap-2 sm:grid-cols-2">
                  <TextField value={n.label} onChange={(e) => set('nutrition', form.nutrition.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} placeholder="Energy" aria-label={`Nutrition row ${i + 1} label`} />
                  <TextField value={n.per100g} onChange={(e) => set('nutrition', form.nutrition.map((x, j) => (j === i ? { ...x, per100g: e.target.value } : x)))} placeholder="432 kcal" aria-label={`Nutrition row ${i + 1} per 100g value`} />
                </div>
              </RepeaterRow>
            ))}
          </div>
        </Card>

        {/* FAQ */}
        <Card className="xl:col-span-2">
          <CardHead
            title="FAQ"
            desc="Bilingual questions shown under the buy box"
            actions={
              <button type="button" className={miniBtnAdd} onClick={() => set('faq', [...form.faq, { qEn: '', qHi: '', aEn: '', aHi: '' }])}>
                <ImagePlus size={13} /> Add question
              </button>
            }
          />
          <div className="grid gap-3 p-4 lg:grid-cols-2">
            {form.faq.length === 0 && <p className="text-sm text-jaggery-3 lg:col-span-2">No FAQ entries yet.</p>}
            {form.faq.map((f, i) => (
              <div key={i} className="rounded-2xl border border-line-warm bg-cream-2/40 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide text-jaggery-2">Q{i + 1}</span>
                  <span className="flex gap-1">
                    <button type="button" onClick={() => {
                      const next = [...form.faq];
                      const t = i - 1;
                      if (t < 0) return;
                      [next[i], next[t]] = [next[t], next[i]];
                      set('faq', next);
                    }} disabled={i === 0} aria-label={`Move question ${i + 1} up`} className="grid h-7 w-7 place-items-center rounded-lg border border-line-warm bg-white text-jaggery disabled:opacity-30"><ArrowLeft size={12} className="-rotate-90" /></button>
                    <button type="button" onClick={() => {
                      const next = [...form.faq];
                      const t = i + 1;
                      if (t >= next.length) return;
                      [next[i], next[t]] = [next[t], next[i]];
                      set('faq', next);
                    }} disabled={i === form.faq.length - 1} aria-label={`Move question ${i + 1} down`} className="grid h-7 w-7 place-items-center rounded-lg border border-line-warm bg-white text-jaggery disabled:opacity-30"><ArrowRight size={12} className="-rotate-90" /></button>
                    <button type="button" onClick={() => set('faq', form.faq.filter((_, j) => j !== i))} aria-label={`Remove question ${i + 1}`} className="grid h-7 w-7 place-items-center rounded-lg border border-brand/40 bg-brand/5 text-brand-deep transition hover:bg-brand/15"><Trash2 size={12} /></button>
                  </span>
                </div>
                <div className="grid gap-2">
                  <TextField value={f.qEn} onChange={(e) => set('faq', form.faq.map((x, j) => (j === i ? { ...x, qEn: e.target.value } : x)))} placeholder="Question (EN)" aria-label={`Question ${i + 1} English`} />
                  <TextField value={f.qHi} onChange={(e) => set('faq', form.faq.map((x, j) => (j === i ? { ...x, qHi: e.target.value } : x)))} placeholder="प्रश्न (HI)" aria-label={`Question ${i + 1} Hindi`} />
                  <Textarea value={f.aEn} onChange={(v) => set('faq', form.faq.map((x, j) => (j === i ? { ...x, aEn: v } : x)))} ariaLabel={`Answer ${i + 1} English`} placeholder="Answer (EN)" />
                  <Textarea value={f.aHi} onChange={(v) => set('faq', form.faq.map((x, j) => (j === i ? { ...x, aHi: v } : x)))} ariaLabel={`Answer ${i + 1} Hindi`} placeholder="उत्तर (HI)" />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* SEO */}
        <Card className="xl:col-span-2">
          <CardHead title="SEO" desc="Meta title and description" />
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            <Field label="SEO title"><TextField value={form.seoTitle} onChange={(e) => set('seoTitle', e.target.value)} /></Field>
            <Field label="SEO description"><TextField value={form.seoDesc} onChange={(e) => set('seoDesc', e.target.value)} /></Field>
          </div>
        </Card>
      </div>
    </div>
  );
}

const errTextWrap =
  'inline-flex h-10 items-center gap-1.5 rounded-full border border-line-warm bg-white px-4 text-sm font-semibold text-jaggery transition hover:bg-cream-2';
const miniBtnAdd =
  'inline-flex h-8 items-center gap-1 rounded-full border border-line-warm bg-white px-3 text-xs font-semibold text-jaggery transition hover:bg-cream-2';

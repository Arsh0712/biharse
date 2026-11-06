'use client';

/* ── BiharSe back office — shared UI atoms (PrestaShop-style language, BiharSe skin) ── */

import { useCallback, useEffect, useState } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, RefreshCw, X } from 'lucide-react';
import { SelectMenu } from '@/components/ui/select-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';

/* ── classes ─────────────────────────────────────────────────────────── */

export const inputCls =
  'h-10 w-full rounded-xl border border-line-warm bg-white px-3 text-sm text-ink shadow-sm outline-none transition placeholder:text-jaggery-3/70 focus:border-brand focus:ring-2 focus:ring-brand/25 disabled:opacity-50';

export const selectTriggerCls =
  'h-10 rounded-xl border border-line-warm bg-white px-3 text-sm font-semibold text-ink shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-60';

export const thCls =
  'whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-jaggery-2 first:pl-4 last:pr-4';
export const tdCls = 'px-3 py-2.5 text-sm text-ink first:pl-4 last:pr-4 align-middle';

export const miniBtn =
  'inline-flex h-8 items-center gap-1 rounded-full border border-line-warm bg-white px-3 text-xs font-semibold text-jaggery transition hover:bg-cream-2 disabled:opacity-50';
export const miniBtnDanger =
  'inline-flex h-8 items-center gap-1 rounded-full border border-brand/40 bg-brand/5 px-3 text-xs font-semibold text-brand-deep transition hover:bg-brand/10 disabled:opacity-50';

/* ── helpers ─────────────────────────────────────────────────────────── */

export function errText(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string' && e) return e;
  return 'Something went wrong';
}

export const statusLabel = (s: string) => s.replace(/_/g, ' ');

export function fmtDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function ageLabel(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.floor(ms / 3600000);
  if (h < 1) return `${Math.max(1, Math.floor(ms / 60000))}m`;
  if (h < 48) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function shortDay(day: string): string {
  const d = new Date(`${day}T00:00:00`);
  if (Number.isNaN(d.getTime())) return day;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function isoToLocalInput(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function localInputToIso(v: string): string {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

/* ── panel ids (shared by shell + panels) ────────────────────────────── */

export type PanelId =
  | 'dashboard' | 'orders' | 'products' | 'categories' | 'discounts' | 'inventory'
  | 'customers' | 'inbox' | 'claims' | 'content' | 'chhath'
  | 'store-settings' | 'payments' | 'outbox' | 'flags' | 'audit' | 'staff';

/* ── atoms ───────────────────────────────────────────────────────────── */

export function TextField({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={`${inputCls} ${className}`} />;
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-jaggery-2">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-jaggery-3">{hint}</span>}
    </label>
  );
}

export function Toggle({ checked, onChange, label, disabled = false }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${checked ? 'bg-brand' : 'bg-jaggery-3/40'} disabled:opacity-50`}
    >
      <span className={`inline-block h-5 w-5 rounded-full bg-cream shadow transition-transform ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
    </button>
  );
}

export type Tone = 'muted' | 'gold' | 'amber' | 'teal' | 'green' | 'brand' | 'bad' | 'jaggery';

const BADGE_TONES: Record<Tone, { dot: string; wrap: string }> = {
  muted: { dot: 'bg-jaggery-3', wrap: 'bg-cream-2 text-jaggery-2 border-line-warm' },
  gold: { dot: 'bg-turmeric', wrap: 'bg-turmeric-soft/60 text-jaggery border-turmeric/60' },
  amber: { dot: 'bg-amber-500', wrap: 'bg-amber-50 text-amber-800 border-amber-500/50' },
  teal: { dot: 'bg-teal-600', wrap: 'bg-teal-50 text-teal-800 border-teal-600/40' },
  green: { dot: 'bg-emerald-600', wrap: 'bg-emerald-50 text-emerald-800 border-emerald-600/40' },
  brand: { dot: 'bg-brand', wrap: 'bg-brand/10 text-brand-deep border-brand/40' },
  bad: { dot: 'bg-brand/60', wrap: 'bg-brand/10 text-brand-deep border-brand/30' },
  jaggery: { dot: 'bg-jaggery', wrap: 'bg-jaggery/10 text-jaggery border-jaggery/30' },
};

export function DotBadge({ label, tone = 'muted', className = '' }: { label: string; tone?: Tone; className?: string }) {
  const t = BADGE_TONES[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${t.wrap} ${className}`}>
      <span className={`h-2 w-2 rounded-full ${t.dot}`} aria-hidden />
      {label}
    </span>
  );
}

export function Chip({ children, tone = 'muted' }: { children: ReactNode; tone?: Tone }) {
  const t = BADGE_TONES[tone];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${t.wrap}`}>{children}</span>
  );
}

const ORDER_TONES: Record<string, Tone> = {
  PENDING_PAYMENT: 'muted',
  PAID: 'gold',
  PACKING: 'amber',
  SHIPPED: 'teal',
  OUT_FOR_DELIVERY: 'teal',
  DELIVERED: 'green',
  CANCELLED: 'muted',
  REFUNDED: 'bad',
  PAYMENT_FAILED: 'brand',
  PAYMENT_REVIEW: 'amber',
};

export function OrderBadge({ status }: { status: string }) {
  return <DotBadge label={statusLabel(status)} tone={ORDER_TONES[status] ?? 'muted'} />;
}

const CLAIM_TONES: Record<string, Tone> = {
  OPEN: 'amber',
  REVIEWING: 'teal',
  APPROVED: 'green',
  REJECTED: 'brand',
  RESOLVED: 'muted',
};

export function ClaimBadge({ status }: { status: string }) {
  return <DotBadge label={statusLabel(status)} tone={CLAIM_TONES[status] ?? 'muted'} />;
}

const OUTBOX_TONES: Record<string, Tone> = { SENT: 'green', QUEUED: 'gold', FAILED: 'brand', LOGGED: 'muted' };
export function OutboxBadge({ status }: { status: string }) {
  return <DotBadge label={status} tone={OUTBOX_TONES[status] ?? 'muted'} />;
}

/* ── layout atoms ────────────────────────────────────────────────────── */

export function PanelHeader({ title, desc, actions, breadcrumb }: { title: string; desc?: string; actions?: ReactNode; breadcrumb?: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {breadcrumb && <p className="text-xs font-semibold uppercase tracking-wider text-jaggery-3">{breadcrumb}</p>}
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink">{title}</h1>
        {desc && <p className="mt-0.5 max-w-2xl text-sm text-jaggery-2">{desc}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-line-warm bg-card shadow-sm ${className}`}>{children}</section>
  );
}

/** PrestaShop-style card header: title left, actions right. */
export function CardHead({ title, desc, actions }: { title: string; desc?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-warm px-4 py-3">
      <div>
        <h2 className="font-display text-base font-bold text-ink">{title}</h2>
        {desc && <p className="text-xs text-jaggery-3">{desc}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SkeletonRows({ rows = 5, className = '' }: { rows?: number; className?: string }) {
  return (
    <div className={`space-y-3 ${className}`} aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-14 rounded-2xl" />
      ))}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <Card className="grid place-items-center p-10 text-center">
      <p className="font-display text-lg font-bold text-ink">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-jaggery-2">{hint}</p>}
    </Card>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card className="grid place-items-center p-8 text-center">
      <AlertTriangle className="h-8 w-8 text-brand" aria-hidden />
      <p className="font-display mt-2 text-lg font-bold text-brand-deep">Couldn’t load this section</p>
      <p className="mt-1 max-w-md text-sm text-jaggery-2">{message}</p>
      {onRetry && (
        <button type="button" className="btn-ghost mt-4 h-10 px-5 py-0 text-sm" onClick={onRetry}>
          <RefreshCw size={14} /> Try again
        </button>
      )}
    </Card>
  );
}

/** Sticky-header dense table inside a scroll container. */
export function TableScroll({ children, maxHeight = '70vh', ariaLabel }: { children: ReactNode; maxHeight?: string; ariaLabel?: string }) {
  return (
    <div className="overflow-x-auto" style={{ maxHeight }} aria-label={ariaLabel}>
      <table className="w-full border-separate border-spacing-0 text-left text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className = '', hidden }: { children?: ReactNode; className?: string; hidden?: boolean }) {
  if (hidden) return null;
  return <th className={`${thCls} sticky top-0 z-10 border-b border-line-warm bg-cream-2 ${className}`}>{children}</th>;
}

export function Td({ children, className = '', hidden, title }: { children?: ReactNode; className?: string; hidden?: boolean; title?: string }) {
  if (hidden) return null;
  return <td title={title} className={`${tdCls} border-b border-line-warm/70 ${className}`}>{children}</td>;
}

export function Pagination({
  page,
  pages,
  total,
  perPage,
  onPage,
  onPerPage,
}: {
  page: number;
  pages: number;
  total: number;
  perPage: number;
  onPage: (p: number) => void;
  onPerPage: (n: number) => void;
}) {
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);
  const perPageOptions = [10, 20, 50, 100].map((n) => ({ value: String(n), label: `${n} / page` }));
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-warm px-4 py-3">
      <p className="text-xs text-jaggery-2">
        Showing <strong className="text-ink">{from}–{to}</strong> of <strong className="text-ink">{total}</strong>
      </p>
      <div className="flex items-center gap-2">
        <SelectMenu
          value={String(perPage)}
          onValueChange={(v) => onPerPage(Number(v))}
          options={perPageOptions}
          label="Rows per page"
          className={`${selectTriggerCls} h-8 w-28 text-xs`}
          align="end"
        />
        <span className="text-xs font-semibold text-jaggery-2">
          Page {page} / {pages}
        </span>
        <button type="button" className={miniBtn} onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Previous page">
          <ChevronLeft size={14} />
        </button>
        <button type="button" className={miniBtn} onClick={() => onPage(page + 1)} disabled={page >= pages} aria-label="Next page">
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

export function useDebounced(value: string, delay = 350): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/* ── slide-over drawer (order detail, customer detail…) ──────────────── */

export function SlideOver({ title, onClose, wide = false, children, footer }: { title: string; onClose: () => void; wide?: boolean; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-jaggery/55 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div
        className={`flex h-full w-full flex-col bg-card shadow-2xl ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line-warm bg-cream px-4 py-3">
          <h2 className="font-display truncate text-lg font-bold text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line-warm bg-white text-jaggery transition hover:bg-cream-2"
          >
            <X size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-24">{children}</div>
        {footer && <div className="sticky bottom-0 border-t border-line-warm bg-cream px-4 py-3">{footer}</div>}
      </div>
    </div>
  );
}

/* ── modal (forms, refunds…) ─────────────────────────────────────────── */

export function Modal({ title, onClose, wide = false, children }: { title: string; onClose: () => void; wide?: boolean; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-jaggery/55 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className={`card-warm max-h-[90vh] w-full overflow-y-auto p-5 ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'}`} onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-display text-lg font-bold text-ink">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="grid h-8 w-8 place-items-center rounded-full border border-line-warm text-jaggery transition hover:bg-cream-2"
          >
            <X size={15} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ── bulk action bar ─────────────────────────────────────────────────── */

export function BulkBar({ count, onClear, children }: { count: number; onClear: () => void; children?: ReactNode }) {
  if (count === 0) return null;
  return (
    <div className="fixed bottom-5 left-1/2 z-[70] flex -translate-x-1/2 flex-wrap items-center gap-2 rounded-2xl border border-jaggery/40 bg-jaggery px-4 py-2.5 text-cream shadow-2xl">
      <span className="text-sm font-semibold">{count} selected</span>
      <span className="mx-1 h-5 w-px bg-cream/30" aria-hidden />
      {children}
      <button type="button" onClick={onClear} className="inline-flex h-8 items-center gap-1 rounded-full bg-cream/15 px-3 text-xs font-semibold transition hover:bg-cream/25" aria-label="Clear selection">
        <X size={13} /> Clear
      </button>
    </div>
  );
}

export function useRowSelection<T extends { id: string }>(rows: T[] | null) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allChecked = Boolean(rows && rows.length > 0 && rows.every((r) => selected.has(r.id)));
  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      if (!rows) return prev;
      const every = rows.every((r) => prev.has(r.id));
      return every ? new Set() : new Set(rows.map((r) => r.id));
    });
  }, [rows]);
  const toggleOne = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const clear = useCallback(() => setSelected(new Set()), []);
  const selectedIds = Array.from(selected);
  return { selected, selectedIds, allChecked, toggleAll, toggleOne, clear };
}

export function RowCheck({ checked, onChecked, label }: { checked: boolean; onChecked: (v: boolean) => void; label: string }) {
  return (
    <Checkbox
      checked={checked}
      onCheckedChange={(v) => onChecked(v === true)}
      aria-label={label}
      className="border-jaggery-3 data-[state=checked]:border-brand data-[state=checked]:bg-brand data-[state=checked]:text-cream"
    />
  );
}

/* ── confirm dialog helper ───────────────────────────────────────────── */

export function useConfirm() {
  const [pending, setPending] = useState<null | { title: string; body: string; confirmLabel?: string; danger?: boolean; onConfirm: () => void | Promise<void> }>(null);
  const [busy, setBusy] = useState(false);

  const ask = (title: string, body: string, onConfirm: () => void | Promise<void>, opts?: { confirmLabel?: string; danger?: boolean }) =>
    setPending({ title, body, onConfirm, confirmLabel: opts?.confirmLabel, danger: opts?.danger ?? true });

  async function run() {
    if (!pending) return;
    setBusy(true);
    try {
      await pending.onConfirm();
      setPending(null);
    } catch (e) {
      toast({ title: 'Action failed', description: errText(e), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  const dialog = pending ? (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-jaggery/60 p-4 backdrop-blur-sm" role="alertdialog" aria-modal="true" aria-label={pending.title} onClick={() => !busy && setPending(null)}>
      <div className="card-warm w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand/10 text-brand-deep">
            <AlertTriangle size={18} aria-hidden />
          </span>
          <div>
            <h3 className="font-display text-lg font-bold text-ink">{pending.title}</h3>
            <p className="mt-1 text-sm text-jaggery-2">{pending.body}</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn-ghost h-10 px-5 py-0 text-sm" disabled={busy} onClick={() => setPending(null)}>
            Cancel
          </button>
          <button type="button" className={`text-sm ${pending.danger ? 'btn-primary' : 'btn-primary'}`} disabled={busy} onClick={() => void run()}>
            {busy ? 'Working…' : pending.confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { ask, dialog };
}

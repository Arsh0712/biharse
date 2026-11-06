'use client';

/* ── Orders — PrestaShop-style list toolbars, bulk bar, detail slide-over ── */

import { useCallback, useEffect, useState } from 'react';
import { Download, Eye, FileText, PackageCheck, RefreshCw, Search, Truck } from 'lucide-react';
import { api } from '@/lib/api';
import { formatINR } from '@/lib/money';
import { toast } from '@/hooks/use-toast';
import type { OrderDto, User } from '@/lib/types';
import {
  BulkBar, Card, DotBadge, EmptyState, ErrorState, Field, Modal, OrderBadge, Pagination,
  RowCheck, SkeletonRows, SlideOver, TableScroll, Td, TextField, Th,
  errText, fmtDateTime, miniBtn, miniBtnDanger, selectTriggerCls, statusLabel,
  useConfirm, useDebounced, useRowSelection,
} from '../ui';
import { SelectMenu } from '@/components/ui/select-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';

/** Forward-only workflow (mirrors the server rules). */
const TRANSITIONS: Record<string, readonly string[]> = {
  PENDING_PAYMENT: ['PAID', 'CANCELLED'],
  PAID: ['PACKING', 'SHIPPED', 'CANCELLED'],
  PACKING: ['SHIPPED', 'OUT_FOR_DELIVERY', 'CANCELLED'],
  SHIPPED: ['OUT_FOR_DELIVERY', 'DELIVERED'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
  REFUNDED: [],
  PAYMENT_FAILED: ['PAID', 'CANCELLED'],
  PAYMENT_REVIEW: ['PACKING', 'SHIPPED', 'PAYMENT_FAILED', 'CANCELLED', 'REFUNDED'],
};

const REFUNDABLE: readonly string[] = ['PAID', 'PACKING', 'SHIPPED', 'DELIVERED', 'PAYMENT_REVIEW'];

const STATUS_FILTERS = ['all', 'PENDING_PAYMENT', 'PAID', 'PACKING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'REFUNDED', 'PAYMENT_FAILED', 'PAYMENT_REVIEW'];

const OPTIONAL_COLS = [
  { id: 'coupon', label: 'Coupon' },
  { id: 'payment', label: 'Payment' },
  { id: 'tracking', label: 'Tracking' },
  { id: 'city', label: 'City' },
] as const;

type ColId = (typeof OPTIONAL_COLS)[number]['id'];

function openInvoice(number: string, email: string) {
  window.open(`/api/invoice/${encodeURIComponent(number)}?email=${encodeURIComponent(email)}`, '_blank', 'noopener');
}

function exportCsv(params: Record<string, string>) {
  const sp = new URLSearchParams(params);
  window.open(`/api/admin/orders/export?${sp.toString()}`, '_blank');
}

/* ── detail slide-over ───────────────────────────────────────────────── */

function PaymentTimeline({ events }: { events: NonNullable<OrderDto['paymentEvents']> }) {
  if (!events.length) return <p className="text-sm text-jaggery-3">No payment events recorded.</p>;
  return (
    <ol className="space-y-2">
      {events.map((e) => (
        <li key={e.id} className="flex items-start gap-2.5 rounded-xl border border-line-warm bg-white p-2.5">
          <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${e.signatureValid ? 'bg-emerald-600' : 'bg-brand'}`} aria-hidden />
          <div className="min-w-0 text-sm">
            <p className="font-semibold text-ink">{e.eventType}</p>
            <p className="text-xs text-jaggery-3">
              {fmtDateTime(e.createdAt)} · {e.provider}
              {e.paymentId && <> · payment {e.paymentId.slice(-8)}</>}
              {' · '}
              <span className={e.signatureValid ? 'font-semibold text-emerald-700' : 'font-semibold text-brand-deep'}>
                {e.signatureValid ? 'signature ✓' : 'signature ✗'}
              </span>
              {e.processed ? ' · processed' : ' · unprocessed'}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function ShipForm({ order, onDone, onDirty }: { order: OrderDto; onDone: () => void; onDirty: () => void }) {
  const [courier, setCourier] = useState(order.courier || '');
  const [tracking, setTracking] = useState(order.trackingNumber || '');
  const [busy, setBusy] = useState(false);
  const advances = ['PAID', 'PACKING'].includes(order.status);

  async function save() {
    setBusy(true);
    try {
      const r = await api<{ ok: boolean; advanced: boolean }>('/api/admin/orders', {
        method: 'PATCH',
        body: JSON.stringify({ id: order.id, action: 'tracking', courier, trackingNumber: tracking }),
      });
      toast({ title: r.advanced ? `${order.number} shipped` : 'Tracking saved', description: r.advanced ? 'Customer emailed the shipped notice' : 'Details stored on the order' });
      onDirty();
      onDone();
    } catch (e) {
      toast({ title: 'Save failed', description: errText(e), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2.5">
      <Field label="Courier">
        <TextField value={courier} onChange={(e) => setCourier(e.target.value)} placeholder="Delhivery / Blue Dart / India Post" />
      </Field>
      <Field label="Tracking number (AWB)">
        <TextField value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="AWB / consignment no." />
      </Field>
      <p className="text-xs text-jaggery-3">
        {advances ? 'Saving a tracking number will also move this order to SHIPPED and email the customer.' : 'Saves tracking details without changing status.'}
      </p>
      <button type="button" className="btn-primary h-9 px-4 py-0 text-sm" onClick={() => void save()} disabled={busy}>
        <Truck size={14} /> {busy ? 'Saving…' : 'Save tracking'}
      </button>
    </div>
  );
}

function RefundDialog({ order, onClose, onDone }: { order: OrderDto; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState(String(order.total / 100));
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  async function confirm() {
    const rupees = Number(amount);
    if (!Number.isFinite(rupees) || rupees <= 0) {
      toast({ title: 'Enter a refund amount in ₹', variant: 'destructive' });
      return;
    }
    const paise = Math.round(rupees * 100);
    if (paise > order.total) {
      toast({ title: 'Amount exceeds the order total', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const body: Record<string, unknown> = { id: order.id, action: 'refund', reason };
      if (paise < order.total) body.amount = paise;
      const r = await api<{ ok: boolean; refundId?: string; full?: boolean }>('/api/admin/orders', {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      toast({ title: `Refund processed — ${r.refundId || 'ok'}`, description: r.full ? `Full refund of ${formatINR(order.total)}` : `Partial refund of ${formatINR(paise)}` });
      onDone();
    } catch (e) {
      toast({ title: 'Refund failed', description: errText(e), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={`Refund ${order.number}`} onClose={onClose}>
      <div className="space-y-3">
        <p className="text-sm text-jaggery-2">
          Order total <span className="font-semibold text-ink">{formatINR(order.total)}</span> · paid via {order.paymentProvider || 'gateway'}.
        </p>
        <Field label="Refund amount (₹)">
          <TextField type="number" min={1} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Reason (internal)">
          <TextField value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Damaged in transit, customer request…" />
        </Field>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-ghost h-10 px-5 py-0 text-sm" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-primary text-sm" onClick={() => void confirm()} disabled={busy}>
            {busy ? 'Refunding…' : 'Confirm refund'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function OrderDetail({ orderId, onClose, onChanged, user }: { orderId: string; onClose: () => void; onChanged: () => void; user: User }) {
  const [order, setOrder] = useState<OrderDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nextStatus, setNextStatus] = useState('');
  const [busyStatus, setBusyStatus] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const { ask, dialog } = useConfirm();

  const load = useCallback(async () => {
    setError(null);
    try {
      const j = await api<{ order: OrderDto }>(`/api/admin/orders?id=${encodeURIComponent(orderId)}`);
      setOrder(j.order);
    } catch (e) {
      setError(errText(e));
    }
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) return <SlideOver title="Order" onClose={onClose}><ErrorState message={error} onRetry={() => void load()} /></SlideOver>;
  if (!order) return <SlideOver title="Order" onClose={onClose}><SkeletonRows rows={6} /></SlideOver>;

  const transitions = TRANSITIONS[order.status] ?? [];
  const canRefund = REFUNDABLE.includes(order.status) && Boolean(order.paymentId);

  async function applyStatus() {
    if (!nextStatus || nextStatus === order!.status) return;
    const target = nextStatus;
    if (target === 'CANCELLED' && order!.paymentId && REFUNDABLE.includes(order!.status)) {
      ask(
        `Cancel ${order!.number} with refund?`,
        `This cancels the order and refunds the full ${formatINR(order!.total)} back to the customer’s payment method.`,
        async () => {
          await api('/api/admin/orders', { method: 'PATCH', body: JSON.stringify({ id: order!.id, action: 'refund', reason: 'Order cancelled by staff' }) });
          toast({ title: `${order!.number} cancelled + refunded` });
          await load();
          onChanged();
        },
        { confirmLabel: 'Cancel & refund' },
      );
      return;
    }
    setBusyStatus(true);
    try {
      await api('/api/admin/orders', {
        method: 'PATCH',
        body: JSON.stringify({ id: order!.id, action: 'status', status: target, trackingNumber: order!.trackingNumber, courier: order!.courier }),
      });
      toast({ title: `${order!.number} → ${statusLabel(target)}` });
      await load();
      onChanged();
    } catch (e) {
      toast({ title: 'Status update failed', description: errText(e), variant: 'destructive' });
    } finally {
      setBusyStatus(false);
    }
  }

  return (
    <>
      <SlideOver
        title={`${order.number}`}
        onClose={onClose}
        wide
        footer={
          <div className="flex flex-wrap items-center gap-2">
            <SelectMenu
              value={nextStatus || order.status}
              onValueChange={setNextStatus}
              options={[{ value: order.status, label: `Now: ${statusLabel(order.status)}` }, ...transitions.map((s) => ({ value: s, label: `Move to ${statusLabel(s)}` }))]}
              label={`Status transition for ${order.number}`}
              disabled={busyStatus || transitions.length === 0}
              className={`${selectTriggerCls} h-9 min-w-52 flex-1 text-[13px]`}
            />
            <button type="button" className="btn-primary h-9 px-4 py-0 text-sm" onClick={() => void applyStatus()} disabled={busyStatus || !nextStatus || nextStatus === order.status}>
              Apply
            </button>
            <button type="button" className={miniBtn} onClick={() => openInvoice(order.number, order.email)}>
              <FileText size={13} /> Invoice
            </button>
            {canRefund && (
              <button type="button" className={miniBtnDanger} onClick={() => setRefundOpen(true)}>
                Refund
              </button>
            )}
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <OrderBadge status={order.status} />
            <span className="text-sm text-jaggery-2">{fmtDateTime(order.createdAt)}</span>
            {order.couponCode && <DotBadge label={order.couponCode} tone="gold" />}
          </div>

          {/* items */}
          <section className="overflow-hidden rounded-2xl border border-line-warm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line-warm bg-cream-2 text-[11px] uppercase tracking-wider text-jaggery-2">
                  <th className="px-3 py-2 font-bold">Item</th>
                  <th className="px-3 py-2 text-center font-bold">Qty</th>
                  <th className="px-3 py-2 text-right font-bold">Unit</th>
                  <th className="px-3 py-2 text-right font-bold">Line</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((it, i) => (
                  <tr key={i} className="border-b border-line-warm/60 last:border-0">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <img src={it.image || '/brand/mandala.png'} alt="" className="h-9 w-9 rounded-lg border border-line-warm bg-cream-2 object-cover" />
                        <span>
                          <span className="block font-semibold text-ink">{it.nameEn}</span>
                          {it.variantLabel && <span className="block text-xs text-jaggery-3">{it.variantLabel}</span>}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center">{it.qty}</td>
                    <td className="px-3 py-2 text-right">{formatINR(it.unitPrice)}</td>
                    <td className="px-3 py-2 text-right font-semibold">{formatINR(it.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* amounts */}
          <section className="rounded-2xl border border-line-warm bg-cream p-3 text-sm">
            <div className="flex justify-between py-0.5"><span className="text-jaggery-2">Subtotal</span><span>{formatINR(order.subtotal)}</span></div>
            {order.discount > 0 && <div className="flex justify-between py-0.5 text-emerald-700"><span>Discount {order.couponCode ? `(${order.couponCode})` : ''}</span><span>−{formatINR(order.discount)}</span></div>}
            <div className="flex justify-between py-0.5"><span className="text-jaggery-2">Shipping</span><span>{order.shipping === 0 ? 'FREE' : formatINR(order.shipping)}</span></div>
            <div className="mt-1 flex justify-between border-t border-line-warm pt-1.5 font-bold text-ink"><span>Total</span><span>{formatINR(order.total)}</span></div>
          </section>

          {/* customer + addresses */}
          <div className="grid gap-3 sm:grid-cols-2">
            <section className="rounded-2xl border border-line-warm bg-white p-3">
              <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-jaggery-3">Customer</h3>
              <p className="text-sm font-semibold text-ink">{order.address?.name || 'Guest'}</p>
              <p className="text-sm text-jaggery-2">{order.email}</p>
              <p className="text-sm text-jaggery-2">{order.phone}</p>
              {order.gst && (order.gst.gstin || order.gst.legalName) && (
                <div className="mt-2 rounded-xl bg-cream-2 p-2 text-xs text-jaggery-2">
                  <p className="font-bold uppercase tracking-wide">GST invoice</p>
                  <p>Legal name: {order.gst.legalName || '—'}</p>
                  <p>GSTIN: {order.gst.gstin || '—'}</p>
                  {order.gst.invoiceEmail && <p>Invoice to: {order.gst.invoiceEmail}</p>}
                </div>
              )}
            </section>
            <section className="rounded-2xl border border-line-warm bg-white p-3">
              <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-jaggery-3">Shipping address</h3>
              {order.address ? (
                <address className="text-sm not-italic leading-relaxed text-jaggery-2">
                  {order.address.name}<br />
                  {order.address.line1}{order.address.line2 ? `, ${order.address.line2}` : ''}<br />
                  {order.address.city}, {order.address.state} — {order.address.pincode}<br />
                  {order.address.phone}
                </address>
              ) : <p className="text-sm text-jaggery-3">—</p>}
              {order.billing && (
                <>
                  <h3 className="mb-1.5 mt-3 text-xs font-bold uppercase tracking-wider text-jaggery-3">Billing address</h3>
                  <address className="text-sm not-italic leading-relaxed text-jaggery-2">
                    {order.billing.name}<br />
                    {order.billing.line1}{order.billing.line2 ? `, ${order.billing.line2}` : ''}<br />
                    {order.billing.city}, {order.billing.state} — {order.billing.pincode}
                  </address>
                </>
              )}
            </section>
          </div>

          {/* consent + payment */}
          <div className="grid gap-3 sm:grid-cols-2">
            <section className="rounded-2xl border border-line-warm bg-white p-3 text-xs text-jaggery-2">
              <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-jaggery-3">Consent record</h3>
              <p>Consented: {order.consentAt ? fmtDateTime(order.consentAt) : '—'}</p>
              <p>Policy version: {order.consentVersion || '—'}</p>
              <p>IP: {order.consentIp || '—'}</p>
              {order.giftNote && <p className="mt-1.5 italic">Gift note: “{order.giftNote}”</p>}
            </section>
            <section className="rounded-2xl border border-line-warm bg-white p-3 text-xs text-jaggery-2">
              <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-jaggery-3">Payment</h3>
              <p>Provider: {order.paymentProvider} {order.paymentMethod && `· ${order.paymentMethod}`}</p>
              <p className="break-all">Order id: {order.paymentOrderId || '—'}</p>
              <p className="break-all">Payment id: {order.paymentId || '—'}</p>
              {(order.trackingNumber || order.courier) && <p className="mt-1.5">Tracking: {order.courier} {order.trackingNumber}</p>}
            </section>
          </div>

          {/* payment events timeline */}
          <section className="rounded-2xl border border-line-warm bg-white p-3">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-jaggery-3">Payment events</h3>
            <PaymentTimeline events={order.paymentEvents ?? []} />
          </section>

          {/* tracking */}
          <section className="rounded-2xl border border-line-warm bg-white p-3">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-jaggery-3">Tracking</h3>
            <ShipForm key={order.id + order.status} order={order} onDone={() => void load()} onDirty={onChanged} />
          </section>

          {user.role === 'SUPPORT' && (
            <p className="rounded-xl bg-cream-2 p-2.5 text-xs text-jaggery-2">
              Support role: status moves and refunds are recorded under your account for audit.
            </p>
          )}
        </div>
      </SlideOver>

      {refundOpen && (
        <RefundDialog
          order={order}
          onClose={() => setRefundOpen(false)}
          onDone={() => {
            setRefundOpen(false);
            void load();
            onChanged();
          }}
        />
      )}
      {dialog}
    </>
  );
}

/* ── list ────────────────────────────────────────────────────────────── */

interface ListDto {
  orders: OrderDto[];
  total: number;
  page: number;
  pages: number;
  viewerRole: string;
}

export function OrdersPanel({ user, focusOrder, onConsumeFocus, onDirty }: { user: User; focusOrder: OrderDto | null; onConsumeFocus: () => void; onDirty: () => void }) {
  const [status, setStatus] = useState('all');
  const [qInput, setQInput] = useState('');
  const q = useDebounced(qInput);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [data, setData] = useState<ListDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [cols, setCols] = useState<Set<ColId>>(() => new Set<ColId>(['coupon', 'payment', 'tracking', 'city']));
  const { selectedIds, allChecked, toggleAll, toggleOne, clear } = useRowSelection(data?.orders ?? null);
  const { ask, dialog } = useConfirm();

  const query = useCallback((): Record<string, string> => {
    const sp: Record<string, string> = { page: String(page), perPage: String(perPage) };
    if (status !== 'all') sp.status = status;
    if (q.trim()) sp.q = q.trim();
    if (from) sp.from = from;
    if (to) sp.to = to;
    return sp;
  }, [page, perPage, status, q, from, to]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sp = query();
      setData(await api<ListDto>(`/api/admin/orders?${new URLSearchParams(sp).toString()}`));
    } catch (e) {
      setError(errText(e));
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  /* quick-search deep focus */
  useEffect(() => {
    if (focusOrder) {
      setDetailId(focusOrder.id);
      onConsumeFocus();
    }
  }, [focusOrder, onConsumeFocus]);

  function bulkMarkPacking() {
    ask(
      `Move ${selectedIds.length} order(s) to PACKING?`,
      'Only paid orders advance; others are skipped and reported.',
      async () => {
        let ok = 0;
        let skip = 0;
        for (const id of selectedIds) {
          const o = data?.orders.find((x) => x.id === id);
          if (!o || o.status !== 'PAID') { skip++; continue; }
          try {
            await api('/api/admin/orders', { method: 'PATCH', body: JSON.stringify({ id, action: 'status', status: 'PACKING' }) });
            ok++;
          } catch { skip++; }
        }
        toast({ title: `${ok} order(s) moved to packing`, description: skip ? `${skip} skipped (not paid).` : undefined });
        clear();
        await load();
        onDirty();
      },
      { confirmLabel: 'Advance', danger: false },
    );
  }

  function bulkCancel() {
    ask(
      `Cancel ${selectedIds.length} order(s)?`,
      'Paid orders with a captured payment are refunded in full and set to REFUNDED; unpaid orders are cancelled outright.',
      async () => {
        let ok = 0;
        let skip = 0;
        for (const id of selectedIds) {
          const o = data?.orders.find((x) => x.id === id);
          if (!o || ['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(o.status)) { skip++; continue; }
          try {
            if (o.paymentId && REFUNDABLE.includes(o.status)) {
              await api('/api/admin/orders', { method: 'PATCH', body: JSON.stringify({ id, action: 'refund', reason: 'Bulk cancel by staff' }) });
            } else {
              await api('/api/admin/orders', { method: 'PATCH', body: JSON.stringify({ id, action: 'status', status: 'CANCELLED' }) });
            }
            ok++;
          } catch { skip++; }
        }
        toast({ title: `${ok} order(s) cancelled`, description: skip ? `${skip} skipped.` : undefined });
        clear();
        await load();
        onDirty();
      },
      { confirmLabel: 'Cancel orders' },
    );
  }

  const show = (c: ColId) => cols.has(c);

  return (
    <div className="space-y-4">
      {/* toolbar */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-52 flex-1">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-jaggery-3" aria-hidden />
            <TextField value={qInput} onChange={(e) => { setQInput(e.target.value); setPage(1); }} placeholder="Search number, email or phone…" aria-label="Search orders" className="pl-9" />
          </div>
          <SelectMenu
            value={status}
            onValueChange={(v) => { setStatus(v); setPage(1); }}
            options={STATUS_FILTERS.map((s) => ({ value: s, label: s === 'all' ? 'All statuses' : statusLabel(s) }))}
            label="Filter by status"
            className={`${selectTriggerCls} w-48`}
          />
          <div className="flex items-center gap-1.5 text-xs text-jaggery-2">
            <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} aria-label="From date" className={`${selectTriggerCls} h-10 w-36 px-2`} />
            <span aria-hidden>→</span>
            <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} aria-label="To date" className={`${selectTriggerCls} h-10 w-36 px-2`} />
          </div>
          <button type="button" className={miniBtn} onClick={() => void load()} aria-label="Refresh orders">
            <RefreshCw size={13} /> Refresh
          </button>
          <button type="button" className={miniBtn} onClick={() => exportCsv(query())}>
            <Download size={13} /> Export CSV
          </button>
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" className={miniBtn} aria-label="Choose columns">Columns ▾</button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-44 rounded-2xl border-line-warm p-2">
              <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-jaggery-3">Show columns</p>
              {OPTIONAL_COLS.map((c) => (
                <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-ink hover:bg-cream-2">
                  <Checkbox checked={cols.has(c.id)} onCheckedChange={(v) => setCols((prev) => { const next = new Set(prev); if (v === true) next.add(c.id); else next.delete(c.id); return next; })} className="border-jaggery-3 data-[state=checked]:border-brand data-[state=checked]:bg-brand data-[state=checked]:text-cream" />
                  {c.label}
                </label>
              ))}
            </PopoverContent>
          </Popover>
        </div>
      </Card>

      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {!data && loading && !error && <SkeletonRows rows={6} />}
      {data && data.orders.length === 0 && !error && <EmptyState title="No orders found" hint="Try a different status filter, date range, or clear the search." />}

      {data && data.orders.length > 0 && (
        <Card className="overflow-hidden">
          <TableScroll maxHeight="68vh" ariaLabel="Orders list">
            <thead>
              <tr>
                <Th className="w-10">
                  <RowCheck checked={allChecked} onChecked={toggleAll} label="Select all orders on this page" />
                </Th>
                <Th>Order</Th>
                <Th>Customer</Th>
                <Th>Items</Th>
                <Th>Total</Th>
                <Th hidden={!show('payment')}>Payment</Th>
                <Th hidden={!show('tracking')}>Tracking</Th>
                <Th hidden={!show('city')}>City</Th>
                <Th hidden={!show('coupon')}>Coupon</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {data.orders.map((o) => (
                <tr key={o.id} className="transition hover:bg-cream-2/60">
                  <Td>
                    <RowCheck checked={selectedIds.includes(o.id)} onChecked={() => toggleOne(o.id)} label={`Select order ${o.number}`} />
                  </Td>
                  <Td>
                    <span className="block font-mono font-bold text-ink">{o.number}</span>
                    <span className="block text-xs text-jaggery-3">{fmtDateTime(o.createdAt)}</span>
                  </Td>
                  <Td className="max-w-40">
                    <span className="block truncate font-semibold">{o.address?.name || o.email.split('@')[0]}</span>
                    <span className="block truncate text-xs text-jaggery-3" title={o.email}>{o.email}</span>
                  </Td>
                  <Td className="text-sm">{o.items.reduce((a, it) => a + it.qty, 0)}</Td>
                  <Td className="font-bold">{formatINR(o.total)}</Td>
                  <Td hidden={!show('payment')}>
                    {o.paymentId ? <span className="font-mono text-xs text-jaggery-2">{o.paymentProvider} ·{o.paymentId.slice(-8)}</span> : <span className="text-xs text-jaggery-3">{o.paymentMethod || '—'}</span>}
                  </Td>
                  <Td hidden={!show('tracking')}>
                    {o.trackingNumber ? <span className="font-mono text-xs text-jaggery-2">{o.courier ? `${o.courier} ` : ''}{o.trackingNumber}</span> : <span className="text-xs text-jaggery-3">—</span>}
                  </Td>
                  <Td hidden={!show('city')} className="text-sm text-jaggery-2">{o.address?.city || '—'}</Td>
                  <Td hidden={!show('coupon')}>{o.couponCode ? <DotBadge label={o.couponCode} tone="gold" /> : <span className="text-xs text-jaggery-3">—</span>}</Td>
                  <Td><OrderBadge status={o.status} /></Td>
                  <Td className="text-right">
                    <button type="button" className={miniBtn} onClick={() => setDetailId(o.id)} aria-label={`View order ${o.number}`}>
                      <Eye size={13} /> View
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableScroll>
          <Pagination page={data.page} pages={data.pages} total={data.total} perPage={perPage} onPage={setPage} onPerPage={(n) => { setPerPage(n); setPage(1); }} />
        </Card>
      )}

      <BulkBar count={selectedIds.length} onClear={clear}>
        <button type="button" className="inline-flex h-8 items-center gap-1 rounded-full bg-cream/15 px-3 text-xs font-semibold transition hover:bg-cream/25" onClick={() => exportCsv({ ids: selectedIds.join(',') })}>
          <Download size={13} /> Export CSV
        </button>
        <button type="button" className="inline-flex h-8 items-center gap-1 rounded-full bg-cream/15 px-3 text-xs font-semibold transition hover:bg-cream/25" onClick={bulkMarkPacking}>
          <PackageCheck size={13} /> Mark packing
        </button>
        <button type="button" className="inline-flex h-8 items-center gap-1 rounded-full bg-brand px-3 text-xs font-bold text-cream transition hover:brightness-110" onClick={bulkCancel}>
          Cancel orders
        </button>
      </BulkBar>

      {detailId && (
        <OrderDetail
          orderId={detailId}
          user={user}
          onClose={() => setDetailId(null)}
          onChanged={() => {
            void load();
            onDirty();
          }}
        />
      )}
      {dialog}
    </div>
  );
}

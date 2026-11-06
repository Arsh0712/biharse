'use client';

/* ── Dashboard — KPI cards, needs-attention, recent orders, quick actions ── */

import { useCallback, useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, Download, Package, Plus, RefreshCw, Send, ShoppingCart } from 'lucide-react';
import { api } from '@/lib/api';
import { formatINR } from '@/lib/money';
import type { OrderDto } from '@/lib/types';
import type { PanelId } from '../ui';
import { Card, CardHead, DotBadge, EmptyState, ErrorState, OrderBadge, PanelHeader, SkeletonRows, TableScroll, Td, Th, errText, fmtDateTime, miniBtn, shortDay } from '../ui';

interface StatsDto {
  revenue: number;
  revenueToday: number;
  ordersToday: number;
  ordersAll: number;
  couponUses: number;
  pendingPaymentCount: number;
  lowStock: { slug: string; nameEn: string; stock: number; lowStockAt: number }[];
  topProducts: { slug: string; nameEn: string; qty: number; revenue: number }[];
  revenueByDay: { day: string; total: number; count: number }[];
  newMessages: number;
  reviewsPending: number;
  subscribers: number;
  outboxFailed: number;
}

interface ClaimsLite {
  openClaims: { id: string; claimNumber: string; orderNumber: string; type: string; status: string; createdAt: string }[];
  staleClaimsCount: number;
  pendingConfirmations: number;
  paymentReview: number;
  paymentFailed: number;
  lowStockCount: number;
}

interface NotifDto extends ClaimsLite {
  lowStock: { slug: string; nameEn: string; stock: number; lowStockAt: number }[];
}

function Kpi({ label, value, tone = 'ink', hint }: { label: string; value: string; tone?: 'ink' | 'bad' | 'gold'; hint?: string }) {
  return (
    <Card className="p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-jaggery-3">{label}</p>
      <p className={`font-display mt-1 text-2xl font-bold ${tone === 'bad' ? 'text-brand-deep' : tone === 'gold' ? 'text-jaggery' : 'text-ink'}`}>{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-jaggery-3">{hint}</p>}
    </Card>
  );
}

export function DashboardPanel({ onGoPanel }: { onGoPanel: (p: PanelId) => void }) {
  const [stats, setStats] = useState<StatsDto | null>(null);
  const [notif, setNotif] = useState<NotifDto | null>(null);
  const [attentionOrders, setAttentionOrders] = useState<OrderDto[]>([]);
  const [recent, setRecent] = useState<OrderDto[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, n, review, failed, recentOrders] = await Promise.all([
        api<StatsDto>('/api/admin/stats'),
        api<NotifDto>('/api/admin/notifications'),
        api<{ orders: OrderDto[] }>('/api/admin/orders?status=PAYMENT_REVIEW&perPage=10'),
        api<{ orders: OrderDto[] }>('/api/admin/orders?status=PAYMENT_FAILED&perPage=10'),
        api<{ orders: OrderDto[] }>('/api/admin/orders?perPage=10'),
      ]);
      setStats(s);
      setNotif(n);
      setAttentionOrders([...review.orders, ...failed.orders]);
      setRecent(recentOrders.orders ?? []);
    } catch (e) {
      setError(errText(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!stats) return <SkeletonRows rows={6} />;

  // AOV 7d from the 14-day series (last 7 entries)
  const last7 = stats.revenueByDay.slice(-7);
  const rev7 = last7.reduce((a, d) => a + d.total, 0);
  const cnt7 = last7.reduce((a, d) => a + d.count, 0);
  const aov7 = cnt7 > 0 ? Math.round(rev7 / cnt7) : 0;

  const openClaimsOld = (notif?.openClaims ?? []).filter((c) => Date.now() - new Date(c.createdAt).getTime() > 48 * 3600 * 1000);
  const attentionRows: { label: string; detail: string; go: PanelId; tone: 'amber' | 'brand' | 'gold' }[] = [
    ...attentionOrders.map((o) => ({
      label: `${o.number} — ${o.status.replace(/_/g, ' ').toLowerCase()}`,
      detail: `${o.email} · ${formatINR(o.total)} · ${fmtDateTime(o.createdAt)}`,
      go: 'orders' as PanelId,
      tone: (o.status === 'PAYMENT_REVIEW' ? 'amber' : 'brand') as 'amber' | 'brand',
    })),
    ...(notif?.lowStock ?? []).map((p) => ({
      label: `${p.nameEn} — ${p.stock} left`,
      detail: `low-stock threshold ${p.lowStockAt}`,
      go: 'inventory' as PanelId,
      tone: 'gold' as const,
    })),
    ...openClaimsOld.map((c) => ({
      label: `${c.claimNumber} — ${c.type.toLowerCase()} claim open >48h`,
      detail: `order ${c.orderNumber}`,
      go: 'claims' as PanelId,
      tone: 'amber' as const,
    })),
  ];

  return (
    <div className="space-y-4">
      <PanelHeader
        title="Dashboard"
        breadcrumb="Home"
        desc="Today’s trade, holds that need a human, and what the last 14 days looked like."
        actions={
          <button type="button" className={miniBtn} onClick={() => void load()}>
            <RefreshCw size={13} /> Refresh
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Revenue today" value={formatINR(stats.revenueToday)} />
        <Kpi label="Orders today" value={String(stats.ordersToday)} />
        <Kpi label="AOV · 7 days" value={formatINR(aov7)} hint={`${cnt7} paid orders in 7d`} />
        <Kpi label="Revenue all-time" value={formatINR(stats.revenue)} hint={`${stats.ordersAll} paid orders`} />
        <Kpi label="Pending confirmations" value={String(notif?.pendingConfirmations ?? 0)} tone={(notif?.pendingConfirmations ?? 0) > 0 ? 'gold' : 'ink'} hint="PAID, awaiting packing" />
        <Kpi label="Payment review holds" value={String(notif?.paymentReview ?? 0)} tone={(notif?.paymentReview ?? 0) > 0 ? 'bad' : 'ink'} hint="engine-set holds" />
        <Kpi label="Open claims" value={String(notif?.openClaims.length ?? 0)} tone={(notif?.openClaims.length ?? 0) > 0 ? 'bad' : 'ink'} hint={`${notif?.staleClaimsCount ?? 0} older than 48h`} />
        <Kpi label="Low stock" value={String(notif?.lowStockCount ?? 0)} tone={(notif?.lowStockCount ?? 0) > 0 ? 'bad' : 'ink'} hint="products at threshold" />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="p-4 xl:col-span-2">
          <CardHead title="Revenue — last 14 days" />
          {stats.revenueByDay.length === 0 ? (
            <p className="p-6 text-sm text-jaggery-2">No paid orders in the last 14 days yet.</p>
          ) : (
            <div className="h-60 w-full p-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.revenueByDay} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(109,58,34,0.14)" vertical={false} />
                  <XAxis dataKey="day" tickFormatter={shortDay} tick={{ fontSize: 11, fill: '#6b3a22' }} minTickGap={14} />
                  <YAxis tickFormatter={(v) => `₹${Math.round(Number(v) / 1000)}k`} tick={{ fontSize: 11, fill: '#6b3a22' }} width={52} />
                  <Tooltip
                    formatter={(v) => formatINR(Number(v))}
                    labelFormatter={(label) => shortDay(String(label))}
                    contentStyle={{ borderRadius: 12, border: '1px solid rgba(109,58,34,0.16)', fontSize: 12, background: '#fffdf7' }}
                  />
                  <Bar dataKey="total" fill="#D80018" radius={6} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card>
          <CardHead title="Needs attention" desc={`${attentionRows.length} item(s)`} />
          <div className="max-h-72 overflow-y-auto p-2">
            {attentionRows.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-jaggery-2">All clear — nothing needs attention.</p>
            ) : (
              <ul className="space-y-1">
                {attentionRows.slice(0, 12).map((r, i) => (
                  <li key={i}>
                    <button type="button" onClick={() => onGoPanel(r.go)} className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left transition hover:bg-cream-2">
                      <DotBadge label={r.tone === 'brand' ? 'hold' : r.tone === 'amber' ? 'review' : 'stock'} tone={r.tone} className="shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold text-ink">{r.label}</span>
                        <span className="block truncate text-[11px] text-jaggery-3">{r.detail}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <CardHead
          title="Recent orders"
          desc="Last 10 across all statuses"
          actions={
            <button type="button" className={miniBtn} onClick={() => onGoPanel('orders')}>
              <ShoppingCart size={13} /> Open orders
            </button>
          }
        />
        {recent === null ? (
          <div className="p-4"><SkeletonRows rows={3} /></div>
        ) : recent.length === 0 ? (
          <p className="p-6 text-sm text-jaggery-2">No orders yet.</p>
        ) : (
          <TableScroll maxHeight="26rem" ariaLabel="Recent orders">
            <thead>
              <tr>
                <Th>Order</Th>
                <Th>Customer</Th>
                <Th>Total</Th>
                <Th>Status</Th>
                <Th>Placed</Th>
              </tr>
            </thead>
            <tbody>
              {recent.map((o) => (
                <tr key={o.id} className="transition hover:bg-cream-2/60">
                  <Td className="font-mono font-bold">{o.number}</Td>
                  <Td>
                    <span className="block font-semibold">{o.address?.name || o.email.split('@')[0]}</span>
                    <span className="block text-xs text-jaggery-3">{o.email}</span>
                  </Td>
                  <Td className="font-bold">{formatINR(o.total)}</Td>
                  <Td><OrderBadge status={o.status} /></Td>
                  <Td className="text-xs text-jaggery-2">{fmtDateTime(o.createdAt)}</Td>
                </tr>
              ))}
            </tbody>
          </TableScroll>
        )}
      </Card>

      <Card>
        <CardHead title="Quick actions" />
        <div className="flex flex-wrap gap-2 p-4">
          <button type="button" className="btn-primary h-9 px-4 py-0 text-sm" onClick={() => onGoPanel('products')}>
            <Plus size={14} /> Add product
          </button>
          <button type="button" className="btn-ghost h-9 px-4 py-0 text-sm" onClick={() => onGoPanel('orders')}>
            <Download size={14} /> Orders & export
          </button>
          <button type="button" className="btn-ghost h-9 px-4 py-0 text-sm" onClick={() => onGoPanel('inventory')}>
            <Package size={14} /> Restock
          </button>
          <button type="button" className="btn-ghost h-9 px-4 py-0 text-sm" onClick={() => onGoPanel('outbox')}>
            <Send size={14} /> Test email
          </button>
          <p className="flex w-full items-center gap-1.5 pt-1 text-xs text-jaggery-3">
            <AlertTriangle size={12} aria-hidden /> {stats.outboxFailed} failed email(s) · {stats.newMessages} new message(s) · {stats.reviewsPending} reviews pending · {stats.subscribers} subscribers
          </p>
        </div>
      </Card>

      <Card>
        <CardHead title="Top products" desc="All-time by units sold" />
        {stats.topProducts.length === 0 ? (
          <EmptyState title="No sales recorded yet" />
        ) : (
          <ul className="space-y-3 p-4">
            {(() => {
              const maxTopRevenue = Math.max(1, ...stats.topProducts.map((p) => p.revenue));
              return stats.topProducts.map((p) => (
                <li key={p.slug}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate font-semibold text-ink">{p.nameEn}</span>
                    <span className="shrink-0 text-xs text-jaggery-3">{p.qty} sold · {formatINR(p.revenue)}</span>
                  </div>
                  <div className="mt-1 h-2 w-full rounded-full bg-cream-2">
                    <div className="h-2 rounded-full bg-brand" style={{ width: `${Math.max(4, (p.revenue / maxTopRevenue) * 100)}%` }} />
                  </div>
                </li>
              ));
            })()}
          </ul>
        )}
      </Card>
    </div>
  );
}

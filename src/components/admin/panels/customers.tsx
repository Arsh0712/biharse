'use client';

/* ── Customers — searchable table + profile drawer with orders & consent ── */

import { useCallback, useEffect, useState } from 'react';
import { Eye, RefreshCw, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { formatINR } from '@/lib/money';
import type { AdminCustomerDto, AddressDto, OrderDto } from '@/lib/types';
import { Card, Chip, EmptyState, ErrorState, OrderBadge, Pagination, SkeletonRows, SlideOver, TableScroll, Td, TextField, Th, errText, fmtDate, fmtDateTime, miniBtn, useDebounced } from '../ui';

interface ListDto {
  customers: AdminCustomerDto[];
  total: number;
  page: number;
  pages: number;
}

interface DetailDto {
  customer: Omit<AdminCustomerDto, 'orderCount' | 'totalSpent'> & { emailVerified?: boolean };
  addresses: AddressDto[];
  orders: OrderDto[];
  totalSpent: number;
  consentLogs: { id: string; analyticsOk: boolean; marketingOk: boolean; policyVersion: string; createdAt: string }[];
}

export function CustomersPanel() {
  const [data, setData] = useState<ListDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qInput, setQInput] = useState('');
  const q = useDebounced(qInput);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [detailId, setDetailId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const sp = new URLSearchParams({ page: String(page), perPage: String(perPage) });
      if (q.trim()) sp.set('q', q.trim());
      setData(await api<ListDto>(`/api/admin/customers?${sp.toString()}`));
    } catch (e) {
      setError(errText(e));
    }
  }, [page, perPage, q]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-52 flex-1">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-jaggery-3" aria-hidden />
            <TextField value={qInput} onChange={(e) => { setQInput(e.target.value); setPage(1); }} placeholder="Search email, name or phone…" aria-label="Search customers" className="pl-9" />
          </div>
          <button type="button" className={miniBtn} onClick={() => void load()} aria-label="Refresh customers">
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </Card>

      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {!data && !error && <SkeletonRows rows={5} />}
      {data && data.customers.length === 0 && !error && <EmptyState title="No customers found" hint="Customer accounts appear after their first order or sign-up." />}

      {data && data.customers.length > 0 && (
        <Card className="overflow-hidden">
          <TableScroll maxHeight="66vh" ariaLabel="Customers list">
            <thead>
              <tr>
                <Th>Customer</Th>
                <Th>Contact</Th>
                <Th>Role</Th>
                <Th>Orders</Th>
                <Th>Total spent</Th>
                <Th>Joined</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {data.customers.map((c) => (
                <tr key={c.id} className="transition hover:bg-cream-2/60">
                  <Td>
                    <span className="block font-semibold text-ink">{c.name || '—'}</span>
                    {c.email && <span className="block max-w-56 truncate text-xs text-jaggery-3" title={c.email}>{c.email}</span>}
                  </Td>
                  <Td className="text-sm text-jaggery-2">{c.phone || '—'}</Td>
                  <Td>{c.role === 'CUSTOMER' ? <Chip tone="muted">Customer</Chip> : <Chip tone="gold">{c.role}</Chip>}</Td>
                  <Td className="font-semibold">{c.orderCount}</Td>
                  <Td className="font-bold">{formatINR(c.totalSpent)}</Td>
                  <Td className="text-xs text-jaggery-2">{fmtDate(c.createdAt)}</Td>
                  <Td className="text-right">
                    <button type="button" className={miniBtn} onClick={() => setDetailId(c.id)} aria-label={`View customer ${c.name || c.email}`}>
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

      {detailId && <CustomerDetail id={detailId} onClose={() => setDetailId(null)} />}
    </div>
  );
}

function CustomerDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const [data, setData] = useState<DetailDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await api<DetailDto>(`/api/admin/customers?id=${encodeURIComponent(id)}`));
    } catch (e) {
      setError(errText(e));
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <SlideOver title={data ? data.customer.name || data.customer.email : 'Customer'} onClose={onClose}>
      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {!data && !error && <SkeletonRows rows={5} />}
      {data && (
        <div className="space-y-4">
          <section className="rounded-2xl border border-line-warm bg-white p-3">
            <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-jaggery-3">Profile</h3>
            <p className="text-sm font-semibold text-ink">{data.customer.name || '—'}</p>
            <p className="text-sm text-jaggery-2">{data.customer.email}</p>
            <p className="text-sm text-jaggery-2">{data.customer.phone || '—'}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <Chip tone="gold">{data.customer.role}</Chip>
              <Chip tone="muted">{data.orders.length} order(s)</Chip>
              <Chip tone="jaggery">spent {formatINR(data.totalSpent)}</Chip>
              <Chip tone="muted">joined {fmtDate(data.customer.createdAt)}</Chip>
            </div>
          </section>

          <section className="rounded-2xl border border-line-warm bg-white p-3">
            <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-jaggery-3">Addresses</h3>
            {data.addresses.length === 0 ? <p className="text-sm text-jaggery-3">No saved addresses.</p> : (
              <ul className="space-y-2">
                {data.addresses.map((a) => (
                  <li key={a.id} className="rounded-xl border border-line-warm bg-cream-2/40 p-2.5 text-sm leading-relaxed text-jaggery-2">
                    <span className="font-semibold text-ink">{a.label}{a.isDefault ? ' · default' : ''}</span> — {a.name}, {a.phone}<br />
                    {a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.city}, {a.state} — {a.pincode}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-line-warm bg-white p-3">
            <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-jaggery-3">Orders</h3>
            {data.orders.length === 0 ? <p className="text-sm text-jaggery-3">No orders yet.</p> : (
              <ul className="space-y-1.5">
                {data.orders.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-2 rounded-xl border border-line-warm px-2.5 py-2">
                    <span className="min-w-0">
                      <span className="block font-mono text-[13px] font-bold text-ink">{o.number}</span>
                      <span className="block text-xs text-jaggery-3">{fmtDateTime(o.createdAt)}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <OrderBadge status={o.status} />
                      <span className="text-sm font-bold">{formatINR(o.total)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-line-warm bg-white p-3">
            <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-jaggery-3">Consent logs</h3>
            {data.consentLogs.length === 0 ? <p className="text-sm text-jaggery-3">No consent records for this email.</p> : (
              <ul className="space-y-1 text-xs text-jaggery-2">
                {data.consentLogs.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-cream-2/50 px-2 py-1.5">
                    <span>{fmtDateTime(c.createdAt)}</span>
                    <Chip tone={c.analyticsOk ? 'green' : 'muted'}>analytics {c.analyticsOk ? '✓' : '✗'}</Chip>
                    <Chip tone={c.marketingOk ? 'green' : 'muted'}>marketing {c.marketingOk ? '✓' : '✗'}</Chip>
                    <Chip tone="muted">{c.policyVersion}</Chip>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </SlideOver>
  );
}

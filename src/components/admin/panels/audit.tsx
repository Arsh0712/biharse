'use client';

/* ── Audit log — every sensitive action, actor filter, paginated ── */

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardHead, EmptyState, ErrorState, SkeletonRows, TableScroll, Td, TextField, Th, fmtDateTime } from '../ui';

interface AuditRow {
  id: string;
  actor: string;
  action: string;
  metaJson: string;
  createdAt: string;
}

interface AuditDto {
  rows: AuditRow[];
  total: number;
  page: number;
  pages: number;
}

function prettyMeta(raw: string): string {
  if (!raw) return '—';
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    const parts = Object.entries(o).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`);
    return parts.join(' · ').slice(0, 120) || '—';
  } catch {
    return raw.slice(0, 120);
  }
}

export function AuditPanel() {
  const [data, setData] = useState<AuditDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actor, setActor] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setError(null);
    try {
      const q = new URLSearchParams({ page: String(page) });
      if (actor.trim()) q.set('actor', actor.trim());
      setData(await api<AuditDto>(`/api/admin/audit?${q.toString()}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    }
  }, [page, actor]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Card className="overflow-hidden">
      <CardHead
        title="Audit log"
        desc="Order status changes, refunds, settings saves, consent-sensitive admin actions — who did what, when."
        actions={
          <div className="flex items-center gap-2">
            <div className="w-44">
              <TextField
                value={actor}
                onChange={(e) => { setActor(e.target.value); setPage(1); }}
                placeholder="Filter by actor email"
                aria-label="Filter audit log by actor"
              />
            </div>
            <button type="button" className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line-warm bg-white px-3 text-xs font-bold text-jaggery transition hover:bg-cream-2" onClick={() => void load()}>
              <RefreshCw size={13} /> Refresh
            </button>
          </div>
        }
      />
      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {!data && !error && <SkeletonRows rows={4} />}
      {data && data.rows.length === 0 && !error && <EmptyState title="No audit entries" hint="Actions appear here as the team works with orders and settings." />}
      {data && data.rows.length > 0 && (
        <>
          <TableScroll maxHeight="62vh" ariaLabel="Audit log">
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Actor</Th>
                <Th>Action</Th>
                <Th>Details</Th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.id} className="border-t border-line-warm hover:bg-cream-2/60">
                  <Td className="whitespace-nowrap text-xs text-jaggery-2">{fmtDateTime(r.createdAt)}</Td>
                  <Td className="max-w-52 truncate text-xs font-semibold text-ink" title={r.actor}>{r.actor}</Td>
                  <Td><span className="rounded-full bg-cream-2 px-2 py-0.5 font-mono text-[10.5px] font-bold text-jaggery">{r.action}</span></Td>
                  <Td className="max-w-72 truncate text-xs text-jaggery-2" title={r.metaJson}>{prettyMeta(r.metaJson)}</Td>
                </tr>
              ))}
            </tbody>
          </TableScroll>
          <div className="flex items-center justify-between gap-3 border-t border-line-warm px-4 py-3">
            <p className="text-xs font-semibold text-jaggery-3" aria-live="polite">
              Page {data.page} of {data.pages} · {data.total} entries
            </p>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="btn-ghost h-9 px-4 py-0 text-xs">← Prev</button>
              <button type="button" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)} className="btn-ghost h-9 px-4 py-0 text-xs">Next →</button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

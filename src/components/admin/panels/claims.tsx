'use client';

/* ── Claims — table + detail drawer with evidence image + status workflow ── */

import { useCallback, useEffect, useState } from 'react';
import { Eye, ImageOff, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { formatINR } from '@/lib/money';
import { toast } from '@/hooks/use-toast';
import type { AdminClaimDto } from '@/lib/types';
import { Card, ClaimBadge, Chip, DotBadge, EmptyState, ErrorState, Field, SkeletonRows, SlideOver, TableScroll, Td, TextField, Th, ageLabel, errText, fmtDateTime, miniBtn, selectTriggerCls, statusLabel, useConfirm } from '../ui';
import { SelectMenu } from '@/components/ui/select-menu';

const TRANSITIONS: Record<string, readonly string[]> = {
  OPEN: ['REVIEWING', 'APPROVED', 'REJECTED'],
  REVIEWING: ['APPROVED', 'REJECTED'],
  APPROVED: ['RESOLVED'],
  REJECTED: ['RESOLVED'],
  RESOLVED: [],
};

export function ClaimsPanel({ onDirty }: { onDirty: () => void }) {
  const [rows, setRows] = useState<AdminClaimDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('all');
  const [detailId, setDetailId] = useState<string | null>(null);
  const { ask, dialog } = useConfirm();

  const load = useCallback(async () => {
    setError(null);
    try {
      const j = await api<{ claims: AdminClaimDto[] }>(`/api/admin/claims${status !== 'all' ? `?status=${status}` : ''}`);
      setRows(j.claims);
    } catch (e) {
      setError(errText(e));
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <SelectMenu
            value={status}
            onValueChange={setStatus}
            options={['all', 'OPEN', 'REVIEWING', 'APPROVED', 'REJECTED', 'RESOLVED'].map((s) => ({ value: s, label: s === 'all' ? 'All statuses' : statusLabel(s) }))}
            label="Filter claims by status"
            className={`${selectTriggerCls} w-44`}
          />
          <button type="button" className={miniBtn} onClick={() => void load()} aria-label="Refresh claims">
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </Card>

      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {!rows && !error && <SkeletonRows rows={3} />}
      {rows && rows.length === 0 && !error && <EmptyState title="No claims" hint="Customer claims filed from the order tracking page appear here." />}

      {rows && rows.length > 0 && (
        <Card className="overflow-hidden">
          <TableScroll maxHeight="66vh" ariaLabel="Claims list">
            <thead>
              <tr>
                <Th>Claim</Th>
                <Th>Order</Th>
                <Th>Type</Th>
                <Th>Customer</Th>
                <Th>Age</Th>
                <Th>Status</Th>
                <Th>Refund</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="transition hover:bg-cream-2/60">
                  <Td className="font-mono font-bold">{c.claimNumber}</Td>
                  <Td className="font-mono text-sm">{c.orderNumber}</Td>
                  <Td><Chip tone="muted">{statusLabel(c.type)}</Chip></Td>
                  <Td className="max-w-44 truncate text-sm text-jaggery-2" title={c.email}>{c.email}</Td>
                  <Td className="text-sm text-jaggery-2">{ageLabel(c.createdAt)}</Td>
                  <Td><ClaimBadge status={c.status} /></Td>
                  <Td className="text-sm font-semibold">{c.refundAmount > 0 ? formatINR(c.refundAmount) : '—'}</Td>
                  <Td className="text-right">
                    <button type="button" className={miniBtn} onClick={() => setDetailId(c.id)} aria-label={`View claim ${c.claimNumber}`}>
                      <Eye size={13} /> Review
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableScroll>
        </Card>
      )}

      {detailId && <ClaimDetail id={detailId} onClose={() => setDetailId(null)} onChanged={() => { void load(); onDirty(); }} ask={ask} />}
      {dialog}
    </div>
  );
}

type AskFn = (title: string, body: string, onConfirm: () => void | Promise<void>, opts?: { confirmLabel?: string; danger?: boolean }) => void;

function ClaimDetail({ id, onClose, onChanged, ask }: { id: string; onClose: () => void; onChanged: () => void; ask: AskFn }) {
  const [claim, setClaim] = useState<AdminClaimDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [next, setNext] = useState('');
  const [refund, setRefund] = useState('');
  const [busy, setBusy] = useState(false);
  const [imgBroken, setImgBroken] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const j = await api<{ claims: AdminClaimDto[] }>('/api/admin/claims?status=all');
      const found = j.claims.find((c) => c.id === id);
      if (!found) throw new Error('Claim not found');
      setClaim(found);
      setNext(found.status);
      setRefund(found.refundAmount > 0 ? String(found.refundAmount / 100) : '');
      setImgBroken(false);
    } catch (e) {
      setError(errText(e));
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) return <SlideOver title="Claim" onClose={onClose}><ErrorState message={error} onRetry={() => void load()} /></SlideOver>;
  if (!claim) return <SlideOver title="Claim" onClose={onClose}><SkeletonRows rows={4} /></SlideOver>;

  const transitions = TRANSITIONS[claim.status] ?? [];
  const needsRefund = next === 'APPROVED';

  async function save() {
    if (!claim) return;
    const changed = next !== claim.status;
    const refundPaise = refund ? Math.round(Number(refund) * 100) : 0;

    if (needsRefund && refundPaise <= 0 && claim.refundAmount <= 0) {
      toast({ title: 'Approved claims need a refund amount (₹)', variant: 'destructive' });
      return;
    }

    const run = async () => {
      setBusy(true);
      try {
        await api('/api/admin/claims', {
          method: 'PATCH',
          body: JSON.stringify({ id: claim!.id, status: changed ? next : undefined, refundAmount: refundPaise > 0 ? refundPaise : undefined }),
        });
        toast({ title: changed ? `${claim!.claimNumber} → ${statusLabel(next)}` : 'Refund amount saved', description: claim!.claimNumber });
        await load();
        onChanged();
      } catch (e) {
        toast({ title: 'Update failed', description: errText(e), variant: 'destructive' });
      } finally {
        setBusy(false);
      }
    };

    if (changed && (next === 'REJECTED' || next === 'RESOLVED')) {
      ask(`${claim.claimNumber} → ${statusLabel(next)}?`, 'This records the decision in the audit trail and closes the review path.', run, { confirmLabel: 'Confirm decision' });
      return;
    }
    await run();
  }

  return (
    <SlideOver title={`${claim.claimNumber} — ${statusLabel(claim.type)}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <ClaimBadge status={claim.status} />
          <Chip tone="muted">order {claim.orderNumber}</Chip>
          <span className="text-xs text-jaggery-3">filed {fmtDateTime(claim.createdAt)}</span>
        </div>

        <section className="rounded-2xl border border-line-warm bg-white p-3">
          <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-jaggery-3">Customer</h3>
          <p className="text-sm font-semibold text-ink">{claim.email}</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-jaggery-2">{claim.description}</p>
        </section>

        <section className="rounded-2xl border border-line-warm bg-white p-3">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-jaggery-3">Evidence</h3>
          {claim.evidencePath && !imgBroken ? (
            <a href={`/api/claims/${claim.id}/evidence`} target="_blank" rel="noopener" className="block overflow-hidden rounded-xl border border-line-warm">
              <img src={`/api/claims/${claim.id}/evidence`} alt="Claim evidence" className="max-h-72 w-full object-contain" onError={() => setImgBroken(true)} />
            </a>
          ) : (
            <p className="inline-flex items-center gap-1.5 text-sm text-jaggery-3">
              <ImageOff size={14} aria-hidden /> {claim.evidencePath ? 'Evidence file unavailable' : 'No evidence attached'}
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-line-warm bg-white p-3">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-jaggery-3">Decision</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Move status to">
              <SelectMenu
                value={next}
                onValueChange={setNext}
                options={[{ value: claim.status, label: `Now: ${statusLabel(claim.status)}` }, ...transitions.map((s) => ({ value: s, label: statusLabel(s) }))]}
                label={`Status decision for claim ${claim.claimNumber}`}
                disabled={busy}
                className={`${selectTriggerCls} w-full`}
              />
            </Field>
            <Field label="Refund amount (₹)" hint={claim.status === 'APPROVED' || needsRefund ? 'Required when approving' : 'Set now or when approving'}>
              <TextField type="number" min={0} step="0.01" value={refund} onChange={(e) => setRefund(e.target.value)} />
            </Field>
          </div>
          {claim.refundAmount > 0 && <p className="mt-2"><DotBadge label={`recorded refund ${formatINR(claim.refundAmount)}`} tone="green" /></p>}
          <p className="mt-2 text-xs text-jaggery-3">
            Workflow: Open → Reviewing → Approved/Rejected → Resolved. Refunds are issued via Payments, this records the claim decision.
          </p>
          <button type="button" className="btn-primary mt-3 h-9 px-4 py-0 text-sm" onClick={() => void save()} disabled={busy}>
            {busy ? 'Saving…' : 'Save decision'}
          </button>
        </section>
      </div>
    </SlideOver>
  );
}

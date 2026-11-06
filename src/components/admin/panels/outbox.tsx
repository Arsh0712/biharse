'use client';

/* ── Email & Outbox — delivery log, preview, retry, test send ── */

import { useCallback, useEffect, useState } from 'react';
import { Eye, MailPlus, RefreshCw, RotateCcw, Send } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { Card, CardHead, EmptyState, ErrorState, Field, OutboxBadge, SkeletonRows, SlideOver, TableScroll, Td, TextField, Th, errText, fmtDateTime } from '../ui';

interface OutboxRow {
  id: string;
  toEmail: string;
  template: string;
  subject: string;
  status: string;
  provider: string;
  error: string;
  attempts: number;
  sentAt: string | null;
  createdAt: string;
}

interface OutboxDto {
  outbox: OutboxRow[];
  smtpConfigured: boolean;
}

export function OutboxPanel({ viewerEmail }: { viewerEmail: string }) {
  const [rows, setRows] = useState<OutboxRow[] | null>(null);
  const [smtp, setSmtp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ subject: string; html: string; text: string } | null>(null);
  const [testTo, setTestTo] = useState(viewerEmail);
  const [sendingTest, setSendingTest] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const j = await api<OutboxDto>('/api/admin/outbox');
      setRows(j.outbox);
      setSmtp(j.smtpConfigured);
    } catch (e) {
      setError(errText(e));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openPreview = async (id: string) => {
    try {
      const j = await api<{ email: { subject: string; html: string; text: string } }>('/api/admin/outbox', {
        method: 'POST',
        body: JSON.stringify({ id, action: 'view' }),
      });
      setPreview(j.email);
    } catch (e) {
      toast({ title: 'Preview failed', description: errText(e), variant: 'destructive' });
    }
  };

  const retry = async (id: string) => {
    try {
      await api('/api/admin/outbox', { method: 'POST', body: JSON.stringify({ id, action: 'retry' }) });
      toast({ title: 'Retry queued' });
      await load();
    } catch (e) {
      toast({ title: 'Retry failed', description: errText(e), variant: 'destructive' });
    }
  };

  const sendTest = async () => {
    setSendingTest(true);
    try {
      const j = await api<{ note: string }>('/api/admin/test-email', { method: 'POST', body: JSON.stringify({ to: testTo.trim() }) });
      toast({ title: 'Test email dispatched', description: j.note });
      await load();
    } catch (e) {
      toast({ title: 'Test send failed', description: errText(e), variant: 'destructive' });
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1">
            <Field label="Send a test email">
              <TextField type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@example.com" />
            </Field>
          </div>
          <button type="button" onClick={() => void sendTest()} disabled={sendingTest || !testTo.includes('@')} className="btn-primary h-10 px-5 py-0 text-sm">
            <Send size={14} /> {sendingTest ? 'Sending…' : 'Send test'}
          </button>
          <p className="w-full text-xs text-jaggery-3">
            {smtp
              ? 'SMTP is configured — transactional emails send live, everything is still logged here.'
              : 'No SMTP_HOST set — every email is rendered, branded and stored here (LOGGED) so nothing is lost. Add SMTP_* env vars to go live.'}
          </p>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <CardHead
          title="Outbox (last 100)"
          desc="Every customer email, branded and bilingual-ready — preview HTML, retry failures."
          actions={
            <button type="button" className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line-warm bg-white px-3 text-xs font-bold text-jaggery transition hover:bg-cream-2" onClick={() => void load()}>
              <RefreshCw size={13} /> Refresh
            </button>
          }
        />
        {error && <ErrorState message={error} onRetry={() => void load()} />}
        {!rows && !error && <SkeletonRows rows={3} />}
        {rows && rows.length === 0 && !error && <EmptyState title="Outbox empty" hint="Order confirmations, shipping notices and newsletters land here." />}
        {rows && rows.length > 0 && (
          <TableScroll maxHeight="62vh" ariaLabel="Email outbox">
            <thead>
              <tr>
                <Th>To</Th>
                <Th>Template</Th>
                <Th>Subject</Th>
                <Th>Status</Th>
                <Th>Attempts</Th>
                <Th>When</Th>
                <Th hidden>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-line-warm hover:bg-cream-2/60">
                  <Td className="max-w-44 truncate text-xs font-semibold text-ink">{r.toEmail}</Td>
                  <Td><span className="rounded-full bg-cream-2 px-2 py-0.5 font-mono text-[10.5px] font-bold text-jaggery">{r.template}</span></Td>
                  <Td className="max-w-52 truncate text-sm">{r.subject}</Td>
                  <Td><OutboxBadge status={r.status} /></Td>
                  <Td className="text-xs">{r.attempts}{r.error ? <span className="block max-w-40 truncate text-[10px] text-brand" title={r.error}>{r.error}</span> : null}</Td>
                  <Td className="text-xs text-jaggery-2">{fmtDateTime(r.sentAt ?? r.createdAt)}</Td>
                  <Td>
                    <div className="flex gap-1.5">
                      <button type="button" className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line-warm bg-white px-3 text-xs font-bold text-jaggery transition hover:bg-cream-2" onClick={() => void openPreview(r.id)} aria-label={`Preview ${r.subject}`}>
                        <Eye size={13} /> View
                      </button>
                      {(r.status === 'FAILED' || r.status === 'QUEUED') && (
                        <button type="button" className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line-warm bg-white px-3 text-xs font-bold text-brand transition hover:bg-brand/10" onClick={() => void retry(r.id)} aria-label={`Retry ${r.subject}`}>
                          <RotateCcw size={13} /> Retry
                        </button>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableScroll>
        )}
      </Card>

      {preview && (
        <SlideOver title={preview.subject || 'Email preview'} onClose={() => setPreview(null)} wide>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-jaggery-3">
              <MailPlus size={13} aria-hidden /> Rendered template preview
            </div>
            <iframe
              title="Email HTML preview"
              srcDoc={preview.html}
              sandbox=""
              className="h-[60vh] w-full rounded-2xl border border-line-warm bg-white"
            />
            {preview.text && (
              <details className="rounded-2xl border border-line-warm bg-cream-2 p-3">
                <summary className="cursor-pointer text-sm font-bold text-ink">Plain-text alternative</summary>
                <pre className="mt-2 whitespace-pre-wrap text-xs text-jaggery-2">{preview.text}</pre>
              </details>
            )}
          </div>
        </SlideOver>
      )}
    </div>
  );
}

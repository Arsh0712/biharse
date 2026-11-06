'use client';

/* ── Inbox — contact messages: filter, status, reply, view ── */

import { useCallback, useEffect, useState } from 'react';
import { Mail, RefreshCw, Send, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { Card, Chip, DotBadge, EmptyState, ErrorState, Field, Modal, SkeletonRows, TextField, errText, fmtDateTime, miniBtn, useDebounced } from '../ui';
import { SelectMenu } from '@/components/ui/select-menu';
import { selectTriggerCls } from '../ui';

interface AdminMessage {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: 'NEW' | 'REPLIED' | 'CLOSED';
  createdAt: string;
}

export function InboxPanel({ onDirty }: { onDirty: () => void }) {
  const [rows, setRows] = useState<AdminMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('all');
  const [qInput, setQInput] = useState('');
  const q = useDebounced(qInput);
  const [replyFor, setReplyFor] = useState<AdminMessage | null>(null);
  const [viewFor, setViewFor] = useState<AdminMessage | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const j = await api<{ messages: AdminMessage[] }>('/api/admin/messages');
      setRows(j.messages ?? []);
    } catch (e) {
      setError(errText(e));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function markStatus(m: AdminMessage, next: string) {
    try {
      await api('/api/admin/messages', { method: 'PATCH', body: JSON.stringify({ id: m.id, status: next }) });
      toast({ title: `Marked ${next}`, description: `${m.name || m.email}${m.subject ? ` · ${m.subject}` : ''}` });
      await load();
      onDirty();
    } catch (e) {
      toast({ title: 'Update failed', description: errText(e), variant: 'destructive' });
    }
  }

  const filtered = (rows ?? []).filter((m) => {
    if (status !== 'all' && m.status !== status) return false;
    if (q.trim()) {
      const hay = `${m.name} ${m.email} ${m.subject} ${m.message}`.toLowerCase();
      if (!hay.includes(q.trim().toLowerCase())) return false;
    }
    return true;
  });

  const counts = {
    NEW: (rows ?? []).filter((m) => m.status === 'NEW').length,
    REPLIED: (rows ?? []).filter((m) => m.status === 'REPLIED').length,
    CLOSED: (rows ?? []).filter((m) => m.status === 'CLOSED').length,
  };

  return (
    <div className="space-y-4">
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-48 flex-1">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-jaggery-3" aria-hidden />
            <TextField value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Search messages…" aria-label="Search inbox" className="pl-9" />
          </div>
          <SelectMenu
            value={status}
            onValueChange={setStatus}
            options={[
              { value: 'all', label: `All (${rows?.length ?? 0})` },
              { value: 'NEW', label: `New (${counts.NEW})` },
              { value: 'REPLIED', label: `Replied (${counts.REPLIED})` },
              { value: 'CLOSED', label: `Closed (${counts.CLOSED})` },
            ]}
            label="Filter messages by status"
            className={`${selectTriggerCls} w-40`}
          />
          <button type="button" className={miniBtn} onClick={() => void load()} aria-label="Refresh inbox">
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </Card>

      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {!rows && !error && <SkeletonRows rows={4} />}
      {rows && rows.length === 0 && !error && <EmptyState title="Inbox is empty" hint="Contact-form messages will appear here." />}
      {rows && filtered.length === 0 && rows.length > 0 && <EmptyState title="No messages match" hint="Try a different status or clear the search." />}

      {filtered.map((m) => (
        <Card key={m.id} className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-ink">{m.name || 'Anonymous'}</span>
                <DotBadge label={m.status} tone={m.status === 'NEW' ? 'amber' : m.status === 'REPLIED' ? 'green' : 'muted'} />
                {m.subject && <Chip tone="muted">{m.subject}</Chip>}
                <span className="text-xs text-jaggery-3">{fmtDateTime(m.createdAt)}</span>
              </div>
              <p className={`mt-1.5 text-sm leading-relaxed text-jaggery-2 ${viewFor?.id === m.id ? '' : 'line-clamp-2'}`}>{m.message}</p>
              <p className="mt-1 text-xs text-jaggery-3">{m.email}{m.phone ? ` · ${m.phone}` : ''}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <div className="flex gap-1.5">
                <button type="button" className={miniBtn} onClick={() => setViewFor(viewFor?.id === m.id ? null : m)} aria-label={`View message from ${m.name || m.email}`}>
                  <Mail size={13} /> {viewFor?.id === m.id ? 'Collapse' : 'View'}
                </button>
                <button type="button" className={miniBtn} onClick={() => setReplyFor(m)} aria-label={`Reply to ${m.name || m.email}`}>
                  <Send size={13} /> Reply
                </button>
              </div>
              <SelectMenu
                value={m.status}
                onValueChange={(v) => void markStatus(m, v)}
                options={['NEW', 'REPLIED', 'CLOSED'].map((s) => ({ value: s, label: s }))}
                label={`Status for message from ${m.name || m.email}`}
                className={`${selectTriggerCls} h-8 w-28 text-xs`}
                align="end"
              />
            </div>
          </div>
        </Card>
      ))}

      {replyFor && <ReplyDialog m={replyFor} onClose={() => setReplyFor(null)} onDone={() => { setReplyFor(null); void load(); onDirty(); }} />}
    </div>
  );
}

function ReplyDialog({ m, onClose, onDone }: { m: AdminMessage; onClose: () => void; onDone: () => void }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!text.trim()) {
      toast({ title: 'Write a reply first', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      await api('/api/admin/messages', { method: 'POST', body: JSON.stringify({ id: m.id, action: 'reply', message: text }) });
      toast({ title: 'Reply sent', description: `Queued to ${m.email}` });
      onDone();
    } catch (e) {
      toast({ title: 'Reply failed', description: errText(e), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={`Reply — ${m.name || m.email}`} onClose={onClose} wide>
      <div className="space-y-3">
        <div className="max-h-40 overflow-y-auto rounded-xl border border-line-warm bg-cream-2/50 p-3 text-sm text-jaggery-2">
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-jaggery-3">Original · {fmtDateTime(m.createdAt)}</p>
          <p className="whitespace-pre-wrap">{m.message}</p>
        </div>
        <Field label="Your reply">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            aria-label="Reply message"
            placeholder="Namaste! Thank you for writing in…"
            className="min-h-36 w-full rounded-xl border border-line-warm bg-white px-3 py-2 text-sm text-ink shadow-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25"
          />
        </Field>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost h-10 px-5 py-0 text-sm" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-primary text-sm" onClick={() => void send()} disabled={busy}>
            {busy ? 'Sending…' : 'Send reply'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

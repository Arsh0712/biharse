'use client';

/* ── Chhath dates — per-year festival calendar editor (upsert) ── */

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { CalendarDays, RefreshCw, Save } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { Card, CardHead, ErrorState, Field, SkeletonRows, TableScroll, Td, TextField, Th, errText, fmtDateTime, isoToLocalInput, localInputToIso } from '../ui';

interface ChhathYearDto {
  id: string;
  year: number;
  nahayKhay: string;
  kharna: string;
  sandhyaArghya: string;
  ushaArghya: string;
  note: string;
}

const FIELDS = [
  { key: 'nahayKhay', label: 'Nahay Khay' },
  { key: 'kharna', label: 'Kharna' },
  { key: 'sandhyaArghya', label: 'Sandhya Arghya' },
  { key: 'ushaArghya', label: 'Usha Arghya' },
] as const;

export function ChhathPanel() {
  const [years, setYears] = useState<ChhathYearDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [year, setYear] = useState('');
  const [dates, setDates] = useState<Record<string, string>>({});
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const j = await api<{ years: ChhathYearDto[] }>('/api/admin/chhath');
      setYears(j.years);
    } catch (e) {
      setError(errText(e));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const editYear = (y: ChhathYearDto) => {
    setYear(String(y.year));
    setNote(y.note ?? '');
    setDates({
      nahayKhay: isoToLocalInput(y.nahayKhay),
      kharna: isoToLocalInput(y.kharna),
      sandhyaArghya: isoToLocalInput(y.sandhyaArghya),
      ushaArghya: isoToLocalInput(y.ushaArghya),
    });
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const y = Number(year);
    if (!y || !dates.nahayKhay || !dates.kharna || !dates.sandhyaArghya || !dates.ushaArghya) {
      toast({ title: 'Year and all four ritual dates are required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await api('/api/admin/chhath', {
        method: 'PATCH',
        body: JSON.stringify({
          year: y,
          nahayKhay: localInputToIso(dates.nahayKhay),
          kharna: localInputToIso(dates.kharna),
          sandhyaArghya: localInputToIso(dates.sandhyaArghya),
          ushaArghya: localInputToIso(dates.ushaArghya),
          note,
        }),
      });
      toast({ title: `Chhath ${y} saved`, description: 'The storefront countdown and banners update instantly.' });
      await load();
    } catch (err) {
      toast({ title: 'Save failed', description: errText(err), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <CardHead
          title="Festival calendar"
          desc="These dates drive the real Chhath countdown on the storefront — enter IST date-times for each ritual day."
          actions={
            <button type="button" className="mini-btn" onClick={() => void load()} aria-label="Refresh Chhath dates">
              <RefreshCw size={13} /> Refresh
            </button>
          }
        />
        {error && <ErrorState message={error} onRetry={() => void load()} />}
        {!years && !error && <SkeletonRows rows={2} />}
        {years && years.length === 0 && !error && (
          <p className="px-4 py-6 text-center text-sm text-jaggery-2">No years added yet — add the next Chhath below.</p>
        )}
        {years && years.length > 0 && (
          <TableScroll maxHeight="40vh" ariaLabel="Chhath years">
            <thead>
              <tr>
                <Th>Year</Th>
                <Th>Nahay Khay</Th>
                <Th>Kharna</Th>
                <Th>Sandhya Arghya</Th>
                <Th>Usha Arghya</Th>
                <Th>Note</Th>
                <Th hidden>Action</Th>
              </tr>
            </thead>
            <tbody>
              {years.map((y) => (
                <tr key={y.id} className="border-t border-line-warm hover:bg-cream-2/60">
                  <Td className="font-bold text-ink">{y.year}</Td>
                  {FIELDS.map((f) => (
                    <Td key={f.key}>{fmtDateTime((y[f.key] as string))}</Td>
                  ))}
                  <Td className="max-w-48 truncate text-jaggery-2" >{y.note}</Td>
                  <Td>
                    <button type="button" className={miniBtnEdit} onClick={() => editYear(y)}>Edit</button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableScroll>
        )}
      </Card>

      <form onSubmit={submit}>
        <Card>
          <CardHead title="Add / update a year" desc="Saving an existing year overwrites it (upsert)." />
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            <Field label="Year"><TextField type="number" min={2024} max={2100} value={year} onChange={(e) => setYear(e.target.value)} placeholder="2026" /></Field>
            <Field label="Note (optional)"><TextField value={note} onChange={(e) => setNote(e.target.value)} placeholder="Order cut-off: 12 Oct" /></Field>
            {FIELDS.map((f) => (
              <Field key={f.key} label={`${f.label} (IST)`}>
                <input
                  type="datetime-local"
                  value={dates[f.key] ?? ''}
                  onChange={(e) => setDates((d) => ({ ...d, [f.key]: e.target.value }))}
                  className="w-full rounded-xl border border-line-warm bg-card px-4 py-2.5 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  aria-label={`${f.label} date`}
                />
              </Field>
            ))}
            <div className="sm:col-span-2">
              <button type="submit" disabled={saving} className="btn-primary h-10 px-6 py-0 text-sm">
                <Save size={14} /> {saving ? 'Saving…' : 'Save year'}
              </button>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
}

const miniBtnEdit = 'inline-flex h-8 items-center gap-1.5 rounded-full border border-line-warm bg-white px-3 text-xs font-bold text-jaggery transition hover:bg-cream-2';

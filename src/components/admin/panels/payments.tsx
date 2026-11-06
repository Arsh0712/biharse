'use client';

/* ── Payments status — provider mode + payment/webhook event feed ── */

import { useCallback, useEffect, useState } from 'react';
import { CreditCard, RefreshCw, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardHead, DotBadge, ErrorState, SkeletonRows, TableScroll, Td, Th, fmtDateTime } from '../ui';

interface PaymentEventDto {
  id: string;
  orderNumber: string;
  provider: string;
  eventType: string;
  paymentId: string;
  paymentOrderId: string;
  signatureValid: boolean;
  processed: boolean;
  createdAt: string;
}

interface WebhookEventDto {
  id: string;
  provider: string;
  eventType: string;
  processed: boolean;
  createdAt: string;
}

interface PaymentsDto {
  paymentMode: 'razorpay' | 'sandbox';
  razorpayConfigured: boolean;
  smtpConfigured: boolean;
  events: PaymentEventDto[];
  webhookEvents: WebhookEventDto[];
}

export function PaymentsPanel() {
  const [data, setData] = useState<PaymentsDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await api<PaymentsDto>('/api/admin/payment-events'));
    } catch (e) {
      setError(errTextOf(e));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      {/* mode cards */}
      {!data && !error && <SkeletonRows rows={2} />}
      {data && (
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line-warm bg-white px-3 py-1.5 text-xs font-bold text-jaggery">
              <CreditCard size={13} aria-hidden />
              {data.paymentMode === 'razorpay' ? 'Razorpay LIVE — keys configured' : 'SANDBOX — no real charges'}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line-warm bg-white px-3 py-1.5 text-xs font-bold text-jaggery">
              <ShieldCheck size={13} aria-hidden />
              Webhook signature check: {data.paymentMode === 'razorpay' ? (process.env.NEXT_PUBLIC_RAZORPAY_WEBHOOK_SET ? 'on' : 'on (server-side)') : 'sandbox'}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line-warm bg-white px-3 py-1.5 text-xs font-bold text-jaggery">
              Email: {data.smtpConfigured ? 'SMTP configured' : 'Outbox mode (no SMTP_HOST)'}
            </span>
            <button type="button" className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-full border border-line-warm bg-white px-3 text-xs font-bold text-jaggery transition hover:bg-cream-2" onClick={() => void load()}>
              <RefreshCw size={13} /> Refresh
            </button>
          </div>
          <p className="mt-3 text-xs text-jaggery-3">
            Keys are set via environment variables (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET / RAZORPAY_WEBHOOK_SECRET) — see Integrations in the docs. Amount-mismatch and stock-failure holds appear here as events with processed = false.
          </p>
        </Card>
      )}

      {error && <ErrorState message={error} onRetry={() => void load()} />}

      {data && (
        <>
          <Card className="overflow-hidden">
            <CardHead title="Payment events (last 30)" desc="Verify, capture, mismatch and refund events across both providers." />
            {data.events.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-jaggery-2">No payment events yet.</p>
            ) : (
              <TableScroll maxHeight="48vh" ariaLabel="Payment events">
                <thead>
                  <tr>
                    <Th>Order</Th>
                    <Th>Event</Th>
                    <Th>Payment ID</Th>
                    <Th>Signature</Th>
                    <Th>Processed</Th>
                    <Th>When</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.events.map((e) => (
                    <tr key={e.id} className="border-t border-line-warm hover:bg-cream-2/60">
                      <Td className="font-mono text-xs font-bold text-ink">{e.orderNumber || '—'}</Td>
                      <Td>
                        <DotBadge
                          label={e.eventType.replaceAll('_', ' ').toLowerCase()}
                          tone={e.eventType.includes('MISMATCH') || e.eventType.includes('FAILED') ? 'bad' : e.eventType.includes('REFUND') ? 'amber' : 'green'}
                        />
                      </Td>
                      <Td className="font-mono text-xs">{e.paymentId || e.paymentOrderId || '—'}</Td>
                      <Td>{e.provider === 'sandbox' ? '—' : e.signatureValid ? <DotBadge label="valid" tone="green" /> : <DotBadge label="invalid" tone="bad" />}</Td>
                      <Td>{e.processed ? <DotBadge label="yes" tone="green" /> : <DotBadge label="pending" tone="amber" />}</Td>
                      <Td className="text-xs text-jaggery-2">{fmtDateTime(e.createdAt)}</Td>
                    </tr>
                  ))}
                </tbody>
              </TableScroll>
            )}
          </Card>

          <Card className="overflow-hidden">
            <CardHead title="Webhook deliveries (last 15)" desc="Raw webhook envelope log — replay tooling lives in the docs." />
            {data.webhookEvents.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-jaggery-2">No webhook deliveries recorded.</p>
            ) : (
              <TableScroll maxHeight="32vh" ariaLabel="Webhook deliveries">
                <thead>
                  <tr>
                    <Th>Provider</Th>
                    <Th>Event</Th>
                    <Th>Processed</Th>
                    <Th>When</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.webhookEvents.map((w) => (
                    <tr key={w.id} className="border-t border-line-warm hover:bg-cream-2/60">
                      <Td>{w.provider}</Td>
                      <Td>{w.eventType}</Td>
                      <Td>{w.processed ? <DotBadge label="yes" tone="green" /> : <DotBadge label="no" tone="amber" />}</Td>
                      <Td className="text-xs text-jaggery-2">{fmtDateTime(w.createdAt)}</Td>
                    </tr>
                  ))}
                </tbody>
              </TableScroll>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function errTextOf(e: unknown): string {
  return e instanceof Error ? e.message : 'Request failed';
}

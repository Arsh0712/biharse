'use client';

/* ── Staff & roles — team list + permission matrix ── */

import { useCallback, useEffect, useState } from 'react';
import { BadgeCheck, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardHead, Chip, DotBadge, ErrorState, SkeletonRows, TableScroll, Td, Th, fmtDate } from '../ui';

interface StaffRow {
  id: string;
  email: string;
  name: string;
  role: string;
  emailVerified: boolean;
  createdAt: string;
}

const ROLE_MATRIX: { role: string; who: string; access: string; tone: 'brand' | 'gold' | 'teal' | 'amber' | 'muted' }[] = [
  {
    role: 'OWNER',
    who: 'You — the founder',
    access: 'Everything: orders, refunds, catalogue, content, settings, staff list, audit log.',
    tone: 'brand',
  },
  {
    role: 'ADMIN',
    who: 'Trusted senior operator',
    access: 'Everything, same as owner (use sparingly).',
    tone: 'brand',
  },
  {
    role: 'MANAGER',
    who: 'Shop manager',
    access: 'Orders, catalogue, customers, claims, content and settings — no owner-only surprises.',
    tone: 'gold',
  },
  {
    role: 'PACKING',
    who: 'Packing desk',
    access: 'Dashboard, orders (print/confirm dispatch), products and inventory only.',
    tone: 'teal',
  },
  {
    role: 'SUPPORT',
    who: 'Customer support',
    access: 'Dashboard, orders (view/notes), customers, inbox and claims.',
    tone: 'amber',
  },
];

export function StaffPanel({ user }: { user: { email: string; name: string; role: string } }) {
  const [staff, setStaff] = useState<StaffRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const j = await api<{ staff: StaffRow[] }>('/api/admin/staff');
      setStaff(j.staff);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <ShieldCheck className="text-jaggery" size={16} aria-hidden />
          <span className="font-semibold text-ink">You are signed in as</span>
          <Chip tone="brand">{user.role}</Chip>
          <span className="text-jaggery-2">{user.email}</span>
          <span className="ml-auto text-xs text-jaggery-3">Roles are assigned in the database (seeded from ADMIN_EMAIL in .env). Ask the owner to change roles.</span>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <CardHead title="Team" desc="Everyone with back-office access." />
        {error && <ErrorState message={error} onRetry={() => void load()} />}
        {!staff && !error && <SkeletonRows rows={2} />}
        {staff && staff.length === 0 && !error && (
          <p className="px-4 py-6 text-center text-sm text-jaggery-2">No staff accounts yet — the owner account is created by the seed from .env.</p>
        )}
        {staff && staff.length > 0 && (
          <TableScroll maxHeight="46vh" ariaLabel="Staff list">
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Role</Th>
                <Th>Email verified</Th>
                <Th>Since</Th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id} className="border-t border-line-warm hover:bg-cream-2/60">
                  <Td className="font-semibold text-ink">{s.name || '—'}</Td>
                  <Td className="text-xs">{s.email}</Td>
                  <Td><Chip tone={ROLE_MATRIX.find((r) => r.role === s.role)?.tone ?? 'muted'}>{s.role}</Chip></Td>
                  <Td>{s.emailVerified ? <BadgeCheck size={15} className="text-green-700" aria-label="Verified" /> : <DotBadge label="unverified" tone="amber" />}</Td>
                  <Td className="text-xs text-jaggery-2">{fmtDate(s.createdAt)}</Td>
                </tr>
              ))}
            </tbody>
          </TableScroll>
        )}
      </Card>

      <Card className="overflow-hidden">
        <CardHead title="Permission matrix" desc="What each role can open — enforced again on every API call, not just the menu." />
        <TableScroll maxHeight="46vh" ariaLabel="Role permission matrix">
          <thead>
            <tr>
              <Th>Role</Th>
              <Th>Who it is for</Th>
              <Th>Access</Th>
            </tr>
          </thead>
          <tbody>
            {ROLE_MATRIX.map((r) => (
              <tr key={r.role} className="border-t border-line-warm hover:bg-cream-2/60">
                <Td><Chip tone={r.tone}>{r.role}</Chip></Td>
                <Td className="text-sm text-ink">{r.who}</Td>
                <Td className="text-sm text-jaggery-2">{r.access}</Td>
              </tr>
            ))}
          </tbody>
        </TableScroll>
      </Card>
    </div>
  );
}

'use client';

/* ── BackOffice shell — dark collapsible sidebar + sticky topbar + panels ──
 * Layout language borrowed from classic e-commerce back offices (fixed dark
 * nav, grouped sections, icon collapse, slide-over drawer on mobile) with a
 * full BiharSe rebrand: jaggery-dark wood, cream text, brand-red active pill.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Boxes, CalendarDays, ChevronsLeft, CreditCard, FileText, Flag, FolderTree,
  Inbox, LayoutDashboard, LogOut, Menu, Package, ScrollText, ShoppingCart, ShieldAlert,
  Store, TicketPercent, UserCog, Users, X, Search,
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { useAuth, useUi } from '@/lib/store';
import type { OrderDto, Role, User } from '@/lib/types';
import { DotBadge, fmtDateTime, inputCls } from './ui';
import type { PanelId, Tone } from './ui';

export type { PanelId };
import { DashboardPanel } from './panels/dashboard';
import { OrdersPanel } from './panels/orders';
import { ProductsPanel } from './panels/products';
import { CategoriesPanel } from './panels/categories';
import { CouponsPanel } from './panels/coupons';
import { InventoryPanel } from './panels/inventory';
import { CustomersPanel } from './panels/customers';
import { InboxPanel } from './panels/inbox';
import { ClaimsPanel } from './panels/claims';
import { ContentPanel } from './panels/content';
import { ChhathPanel } from './panels/chhath';
import { StoreSettingsPanel } from './panels/store-settings';
import { PaymentsPanel } from './panels/payments';
import { OutboxPanel } from './panels/outbox';
import { FlagsPanel } from './panels/flags';
import { AuditPanel } from './panels/audit';
import { StaffPanel } from './panels/staff';

/* ── panel registry + role visibility ────────────────────────────────── */

interface NavItem {
  id: PanelId;
  label: string;
  icon: typeof LayoutDashboard;
  minRole?: 'manager'; // settings-scope panels
  packing?: boolean;   // PACKING role gets this (products/inventory)
}

const NAV_GROUPS: { label?: string; items: NavItem[] }[] = [
  { items: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }] },
  {
    label: 'Sell',
    items: [{ id: 'orders', label: 'Orders', icon: ShoppingCart }],
  },
  {
    label: 'Catalog',
    items: [
      { id: 'products', label: 'Products', icon: Package, packing: true },
      { id: 'categories', label: 'Categories', icon: FolderTree, minRole: 'manager' },
      { id: 'discounts', label: 'Discounts & coupons', icon: TicketPercent, minRole: 'manager' },
      { id: 'inventory', label: 'Inventory', icon: Boxes, packing: true },
    ],
  },
  {
    label: 'Customers',
    items: [{ id: 'customers', label: 'Customers', icon: Users }],
  },
  {
    label: 'Customer service',
    items: [
      { id: 'inbox', label: 'Inbox', icon: Inbox },
      { id: 'claims', label: 'Claims', icon: ShieldAlert },
    ],
  },
  {
    label: 'Content',
    items: [
      { id: 'content', label: 'Content settings', icon: FileText, minRole: 'manager' },
      { id: 'chhath', label: 'Chhath dates', icon: CalendarDays, minRole: 'manager' },
    ],
  },
  {
    label: 'Configure',
    items: [
      { id: 'store-settings', label: 'Store settings', icon: Store, minRole: 'manager' },
      { id: 'payments', label: 'Payments status', icon: CreditCard, minRole: 'manager' },
      { id: 'outbox', label: 'Email & Outbox', icon: Inbox, minRole: 'manager' },
      { id: 'flags', label: 'Feature flags', icon: Flag, minRole: 'manager' },
      { id: 'audit', label: 'Audit log', icon: ScrollText, minRole: 'manager' },
      { id: 'staff', label: 'Staff & roles', icon: UserCog, minRole: 'manager' },
    ],
  },
];

const ROLE_SCOPES: Record<Role, PanelId[]> = {
  CUSTOMER: [],
  OWNER: NAV_GROUPS.flatMap((g) => g.items.map((i) => i.id)),
  ADMIN: NAV_GROUPS.flatMap((g) => g.items.map((i) => i.id)),
  MANAGER: NAV_GROUPS.flatMap((g) => g.items.map((i) => i.id)),
  PACKING: ['dashboard', 'orders', 'products', 'inventory'],
  SUPPORT: ['dashboard', 'orders', 'customers', 'inbox', 'claims'],
};

const GROUP_TINT: Record<string, string> = {
  Sell: 'text-turmeric-soft',
  Catalog: 'text-turmeric-soft',
  Customers: 'text-turmeric-soft',
  'Customer service': 'text-turmeric-soft',
  Content: 'text-turmeric-soft',
  Configure: 'text-turmeric-soft',
};

function visibleGroups(role: Role): { label?: string; items: NavItem[] }[] {
  const allowed = ROLE_SCOPES[role] ?? ROLE_SCOPES.CUSTOMER;
  return NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => allowed.includes(i.id)) })).filter((g) => g.items.length > 0);
}

/* ── notifications (bell) ────────────────────────────────────────────── */

interface NotificationsDto {
  ordersToday: number;
  pendingConfirmations: number;
  paymentReview: number;
  paymentFailed: number;
  lowStock: { slug: string; nameEn: string; stock: number; lowStockAt: number }[];
  lowStockCount: number;
  openClaims: { id: string; claimNumber: string; orderNumber: string; type: string; status: string; createdAt: string }[];
  openClaimsCount: number;
  staleClaimsCount: number;
  failedEmails: number;
  newMessages: number;
}

/* ── sidebar ─────────────────────────────────────────────────────────── */

function NavButton({
  item, active, collapsed, onPick,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onPick: (id: PanelId) => void;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={() => onPick(item.id)}
      aria-current={active ? 'page' : undefined}
      title={collapsed ? item.label : undefined}
      className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[13.5px] font-semibold transition-colors ${
        active ? 'bg-brand text-cream shadow-[0_6px_16px_-6px_rgba(216,0,24,0.8)]' : 'text-cream/75 hover:bg-cream/10 hover:text-cream'
      } ${collapsed ? 'justify-center px-0' : ''}`}
    >
      {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-full bg-turmeric" aria-hidden />}
      <Icon size={17} className="shrink-0" aria-hidden />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </button>
  );
}

function Sidebar({
  user, panel, collapsed, onToggleCollapse, onPick, mobileOpen, onCloseMobile,
}: {
  user: User;
  panel: PanelId;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onPick: (id: PanelId) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const navigate = useUi((s) => s.navigate);
  const logout = useAuth((s) => s.logout);
  const groups = useMemo(() => visibleGroups(user.role), [user.role]);

  const body = (
    <div className="flex h-full flex-col bg-[color:var(--jaggery)] text-cream">
      {/* brand lockup */}
      <div className={`flex items-center gap-2.5 px-4 pb-3 pt-4 ${collapsed ? 'justify-center px-0' : ''}`}>
        <img src="/brand/mandala.png" alt="BiharSe mandala" className="h-9 w-9 shrink-0 rounded-full ring-1 ring-turmeric/50" />
        {!collapsed && (
          <div className="min-w-0">
            <p className="font-display truncate text-lg font-bold leading-tight tracking-tight">
              bihar<span className="text-brand">se</span>
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-turmeric-soft/90">Back office</p>
          </div>
        )}
        <button type="button" onClick={onCloseMobile} aria-label="Close menu" className="ml-auto grid h-8 w-8 place-items-center rounded-full bg-cream/10 text-cream lg:hidden">
          <X size={15} />
        </button>
      </div>
      <div className="mx-3 mb-2 h-px bg-cream/12" aria-hidden />

      {/* nav groups */}
      <nav aria-label="Admin sections" className="min-h-0 flex-1 overflow-y-auto px-3 pb-2 [scrollbar-width:thin]">
        {groups.map((g, gi) => (
          <div key={g.label ?? 'main'} className={gi > 0 ? 'mt-3' : ''}>
            {g.label && !collapsed && (
              <p className={`px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.16em] ${GROUP_TINT[g.label] ?? 'text-cream/40'}`}>{g.label}</p>
            )}
            {g.label && collapsed && <div className="mx-2 mb-2 h-px bg-cream/12" aria-hidden />}
            <div className="space-y-0.5">
              {g.items.map((item) => (
                <NavButton key={item.id} item={item} active={panel === item.id} collapsed={collapsed} onPick={onPick} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* bottom actions */}
      <div className="space-y-1.5 border-t border-cream/12 px-3 py-3">
        {!collapsed && (
          <p className="px-1 pb-1 text-[11px] font-semibold text-cream/60">
            {user.name || user.email} · {user.role}
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            navigate('home');
            onCloseMobile();
            toast({ title: 'Opening your shop', description: 'Storefront view' });
          }}
          className={`flex w-full items-center gap-2 rounded-xl border border-turmeric/50 bg-turmeric/15 px-3 py-2 text-[13px] font-bold text-turmeric-soft transition hover:bg-turmeric/25 ${collapsed ? 'justify-center px-0' : ''}`}
        >
          <Store size={16} aria-hidden />
          {!collapsed && <span>View my shop</span>}
        </button>
        <button
          type="button"
          onClick={() => void logout()}
          className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-semibold text-cream/70 transition hover:bg-cream/10 hover:text-cream ${collapsed ? 'justify-center px-0' : ''}`}
        >
          <LogOut size={15} aria-hidden />
          {!collapsed && <span>Sign out</span>}
        </button>
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={`hidden w-full items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-semibold text-cream/60 transition hover:bg-cream/10 hover:text-cream lg:flex ${collapsed ? 'justify-center px-0' : ''}`}
        >
          {collapsed ? <ChevronsLeft size={15} className="rotate-180" aria-hidden /> : <ChevronsLeft size={15} aria-hidden />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* desktop rail */}
      <aside className={`fixed inset-y-0 left-0 z-40 hidden lg:block ${collapsed ? 'w-16' : 'w-60'}`} aria-label="Sidebar">
        {body}
      </aside>
      {/* mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu" onClick={onCloseMobile}>
          <div className="absolute inset-0 bg-jaggery/60 backdrop-blur-sm" aria-hidden />
          <div className="absolute inset-y-0 left-0 w-64 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {body}
          </div>
        </div>
      )}
    </>
  );
}

/* ── topbar ──────────────────────────────────────────────────────────── */

function QuickSearch({ onOpenOrder }: { onOpenOrder: (o: OrderDto) => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<OrderDto[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    let alive = true;
    setBusy(true);
    const t = setTimeout(async () => {
      try {
        const j = await api<{ orders: OrderDto[] }>(`/api/admin/orders?q=${encodeURIComponent(q.trim())}&perPage=6`);
        if (alive) setResults(j.orders ?? []);
      } catch {
        if (alive) setResults([]);
      } finally {
        if (alive) setBusy(false);
      }
    }, 300);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q]);

  return (
    <div className="relative hidden md:block">
      <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-jaggery-3" aria-hidden />
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 180)}
        placeholder="Search orders — number, email, phone"
        aria-label="Quick search orders"
        className={`${inputCls} h-9 w-72 pl-8 text-[13px]`}
      />
      {open && q.trim().length >= 2 && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-96 rounded-2xl border border-line-warm bg-card p-1.5 shadow-[0_24px_48px_-16px_rgba(61,31,18,0.35)]">
          {busy && <p className="px-3 py-2 text-xs text-jaggery-3">Searching…</p>}
          {!busy && results.length === 0 && <p className="px-3 py-2 text-xs text-jaggery-3">No orders match “{q.trim()}”.</p>}
          {results.map((o) => (
            <button
              key={o.id}
              type="button"
              onMouseDown={() => {
                onOpenOrder(o);
                setOpen(false);
                setQ('');
              }}
              className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-cream-2"
            >
              <span className="min-w-0">
                <span className="block truncate font-mono text-[13px] font-bold text-ink">{o.number}</span>
                <span className="block truncate text-xs text-jaggery-3">{o.email} · {fmtDateTime(o.createdAt)}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-sm font-bold text-brand-deep">₹{(o.total / 100).toLocaleString('en-IN')}</span>
                <span className="text-[11px] text-jaggery-3">{o.status.replace(/_/g, ' ').toLowerCase()}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function BellMenu({ data, loading, onJump, onRefresh }: { data: NotificationsDto | null; loading: boolean; onJump: (p: PanelId) => void; onRefresh: () => void }) {
  const count = data ? data.paymentReview + data.paymentFailed + data.lowStockCount + data.openClaimsCount + data.failedEmails + data.newMessages : 0;

  const rows: { label: string; n: number; tone: Tone; go: PanelId }[] = data
    ? [
        { label: 'Orders to confirm (paid)', n: data.pendingConfirmations, tone: 'gold', go: 'orders' as PanelId },
        { label: 'Payment review holds', n: data.paymentReview, tone: 'amber', go: 'orders' as PanelId },
        { label: 'Payment failed', n: data.paymentFailed, tone: 'brand', go: 'orders' as PanelId },
        { label: 'Low stock products', n: data.lowStockCount, tone: 'amber', go: 'inventory' as PanelId },
        { label: 'Open claims', n: data.openClaimsCount, tone: 'teal', go: 'claims' as PanelId },
        { label: 'Failed emails', n: data.failedEmails, tone: 'brand', go: 'outbox' as PanelId },
        { label: 'New inbox messages', n: data.newMessages, tone: 'teal', go: 'inbox' as PanelId },
      ]
    : [];

  return (
    <details className="group relative">
      <summary
        className="relative grid h-9 w-9 cursor-pointer list-none place-items-center rounded-full border border-line-warm bg-white text-jaggery transition hover:bg-cream-2 [&::-webkit-details-marker]:hidden"
        aria-label={`Notifications${count ? ` — ${count} items need attention` : ''}`}
        onClick={(e) => {
          e.preventDefault();
          const dd = (e.currentTarget.closest('details') as HTMLDetailsElement) ?? null;
          if (dd) dd.open = !dd.open;
          onRefresh();
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-cream">{count > 9 ? '9+' : count}</span>
        )}
      </summary>
      <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-80 rounded-2xl border border-line-warm bg-card p-2 shadow-[0_24px_48px_-16px_rgba(61,31,18,0.35)]">
        <p className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-jaggery-3">Needs attention</p>
        {loading && !data && <p className="px-2 py-3 text-xs text-jaggery-3">Loading…</p>}
        {data && rows.every((r) => r.n === 0) && <p className="px-2 py-3 text-xs text-jaggery-2">All clear — nothing needs attention.</p>}
        {data && rows.filter((r) => r.n > 0).map((r) => (
          <button
            key={r.label}
            type="button"
            onClick={() => {
              const dd = (document.activeElement?.closest('details') as HTMLDetailsElement) ?? null;
              if (dd) dd.open = false;
              onJump(r.go);
            }}
            className="flex w-full items-center justify-between gap-2 rounded-xl px-2 py-2 text-left transition hover:bg-cream-2"
          >
            <span className="text-[13px] font-semibold text-ink">{r.label}</span>
            <DotBadge label={String(r.n)} tone={r.tone} />
          </button>
        ))}
        {data && data.lowStockCount > 0 && (
          <div className="border-t border-line-warm px-2 pb-1 pt-2">
            <p className="pb-1 text-[11px] font-bold uppercase tracking-wider text-jaggery-3">Low stock</p>
            {data.lowStock.slice(0, 4).map((p) => (
              <p key={p.slug} className="flex items-baseline justify-between gap-2 py-0.5 text-xs text-jaggery-2">
                <span className="min-w-0 truncate">{p.nameEn}</span>
                <span className="shrink-0 font-semibold text-brand-deep">{p.stock} left</span>
              </p>
            ))}
          </div>
        )}
        {data && data.openClaimsCount > 0 && (
          <div className="border-t border-line-warm px-2 pb-1 pt-2">
            <p className="pb-1 text-[11px] font-bold uppercase tracking-wider text-jaggery-3">Open claims</p>
            {data.openClaims.slice(0, 4).map((c) => (
              <p key={c.id} className="flex items-baseline justify-between gap-2 py-0.5 text-xs text-jaggery-2">
                <span className="min-w-0 truncate font-mono">{c.claimNumber}</span>
                <span className="shrink-0">{c.type.toLowerCase()}</span>
              </p>
            ))}
          </div>
        )}
      </div>
    </details>
  );
}

function EmployeeMenu({ user }: { user: User }) {
  const navigate = useUi((s) => s.navigate);
  const logout = useAuth((s) => s.logout);
  const initials = (user.name || user.email)
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'BS';

  return (
    <details className="group relative">
      <summary
        className="flex h-9 cursor-pointer list-none items-center gap-2 rounded-full border border-line-warm bg-white pl-1 pr-3 transition hover:bg-cream-2 [&::-webkit-details-marker]:hidden"
        aria-label={`Signed in as ${user.name || user.email}, role ${user.role}`}
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-brand text-xs font-bold text-cream" aria-hidden>{initials}</span>
        <span className="hidden min-w-0 text-left leading-tight sm:block">
          <span className="block max-w-32 truncate text-xs font-bold text-ink">{user.name || user.email}</span>
          <span className="block text-[10px] font-semibold uppercase tracking-wide text-jaggery-3">{user.role}</span>
        </span>
      </summary>
      <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 rounded-2xl border border-line-warm bg-card p-1.5 shadow-[0_24px_48px_-16px_rgba(61,31,18,0.35)]">
        <p className="px-3 py-2 text-xs text-jaggery-3">
          Signed in as <span className="font-semibold text-ink">{user.email}</span>
        </p>
        <button type="button" onClick={() => { const dd = document.querySelector('details[aria-label="Employee menu"]') as HTMLDetailsElement | null; if (dd) dd.open = false; navigate('home'); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] font-semibold text-ink transition hover:bg-cream-2">
          <Store size={14} aria-hidden /> View storefront
        </button>
        <div className="rounded-xl bg-cream-2 px-3 py-2 text-[13px] text-jaggery-2">
          <span className="block font-semibold text-ink">My profile</span>
          <span className="block text-xs">Role: {user.role} — permissions per role matrix (Staff &amp; roles).</span>
        </div>
        <button type="button" onClick={() => void logout()} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] font-semibold text-brand-deep transition hover:bg-brand/10">
          <LogOut size={14} aria-hidden /> Sign out
        </button>
      </div>
    </details>
  );
}

/* ── panel titles + breadcrumbs ──────────────────────────────────────── */

const PANEL_META: Record<PanelId, { crumb: string; title: string }> = {
  dashboard: { crumb: 'Dashboard', title: 'Dashboard' },
  orders: { crumb: 'Sell · Orders', title: 'Orders' },
  products: { crumb: 'Catalog · Products', title: 'Products' },
  categories: { crumb: 'Catalog · Categories', title: 'Categories' },
  discounts: { crumb: 'Catalog · Discounts', title: 'Discounts & coupons' },
  inventory: { crumb: 'Catalog · Inventory', title: 'Inventory' },
  customers: { crumb: 'Customers', title: 'Customers' },
  inbox: { crumb: 'Customer service · Inbox', title: 'Inbox' },
  claims: { crumb: 'Customer service · Claims', title: 'Claims' },
  content: { crumb: 'Content · Settings', title: 'Content settings' },
  chhath: { crumb: 'Content · Chhath', title: 'Chhath dates' },
  'store-settings': { crumb: 'Configure · Store', title: 'Store settings' },
  payments: { crumb: 'Configure · Payments', title: 'Payments status' },
  outbox: { crumb: 'Configure · Email', title: 'Email & Outbox' },
  flags: { crumb: 'Configure · Flags', title: 'Feature flags' },
  audit: { crumb: 'Configure · Audit', title: 'Audit log' },
  staff: { crumb: 'Configure · Staff', title: 'Staff & roles' },
};

/* ── shell ───────────────────────────────────────────────────────────── */

export function BackOffice({ user }: { user: User }) {
  const allowed = ROLE_SCOPES[user.role] ?? ['orders'];
  const [panel, setPanel] = useState<PanelId>('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notif, setNotif] = useState<NotificationsDto | null>(null);
  const [notifLoading, setNotifLoading] = useState(true);
  const [pendingOrderFocus, setPendingOrderFocus] = useState<OrderDto | null>(null);

  const active: PanelId = allowed.includes(panel) ? panel : 'dashboard';
  const meta = PANEL_META[active];

  const loadNotif = useCallback(async () => {
    try {
      setNotifLoading(true);
      setNotif(await api<NotificationsDto>('/api/admin/notifications'));
    } catch {
      /* bell is non-critical */
    } finally {
      setNotifLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotif();
    const t = setInterval(() => void loadNotif(), 90_000);
    return () => clearInterval(t);
  }, [loadNotif]);

  const pick = useCallback(
    (id: PanelId) => {
      if (!allowed.includes(id)) {
        toast({ title: 'Not available for your role', description: `${user.role} accounts don’t have access to this section.`, variant: 'destructive' });
        return;
      }
      setPanel(id);
      setMobileOpen(false);
    },
    [allowed, user.role],
  );

  /* role guard when permissions change */
  useEffect(() => {
    if (!allowed.includes(panel)) setPanel('dashboard');
  }, [allowed, panel]);

  /* deep-focus from quick search: open Orders and hand over the order */
  const openOrderFromSearch = useCallback(
    (o: OrderDto) => {
      setPendingOrderFocus(o);
      setPanel('orders');
    },
    [],
  );

  return (
    <div className="min-h-screen bg-[color:var(--cream-2)]">
      <Sidebar
        user={user}
        panel={active}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        onPick={pick}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className={`flex min-h-screen flex-col transition-[padding] duration-200 ${collapsed ? 'lg:pl-16' : 'lg:pl-60'}`}>
        {/* topbar */}
        <header className="sticky top-0 z-30 border-b border-line-warm bg-[color:var(--cream-2)]/95 backdrop-blur">
          <div className="flex h-14 items-center gap-3 px-3 sm:px-5">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open admin menu"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line-warm bg-white text-jaggery lg:hidden"
            >
              <Menu size={16} />
            </button>
            <div className="min-w-0">
              <p className="hidden truncate text-[11px] font-bold uppercase tracking-wider text-jaggery-3 sm:block">{meta.crumb}</p>
              <h1 className="font-display truncate text-lg font-bold leading-tight text-ink">{meta.title}</h1>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <QuickSearch onOpenOrder={openOrderFromSearch} />
              <BellMenu data={notif} loading={notifLoading} onJump={pick} onRefresh={() => void loadNotif()} />
              <EmployeeMenu user={user} />
            </div>
          </div>
        </header>

        {/* workspace */}
        <main className="mx-auto w-full max-w-7xl flex-1 px-3 py-5 sm:px-5" aria-label={meta.title}>
          <PanelRouter panel={active} user={user} pendingOrderFocus={pendingOrderFocus} onConsumeFocus={() => setPendingOrderFocus(null)} onNotifDirty={() => void loadNotif()} onGoPanel={setPanel} />
        </main>
        <footer className="mt-auto border-t border-line-warm px-4 py-3 text-center text-[11px] text-jaggery-3">
          BiharSe back office · signed in as {user.role} · session secured cookie
        </footer>
      </div>
    </div>
  );
}

/* ── router (direct imports keep the SPA simple) ─────────────────────── */

function PanelRouter({
  panel, user, pendingOrderFocus, onConsumeFocus, onNotifDirty, onGoPanel,
}: {
  panel: PanelId;
  user: User;
  pendingOrderFocus: OrderDto | null;
  onConsumeFocus: () => void;
  onGoPanel: (id: PanelId) => void;
  onNotifDirty: () => void;
}) {
  switch (panel) {
    case 'dashboard': return <DashboardPanel onGoPanel={onGoPanel} />;
    case 'orders': return <OrdersPanel user={user} focusOrder={pendingOrderFocus} onConsumeFocus={onConsumeFocus} onDirty={onNotifDirty} />;
    case 'products': return <ProductsPanel />;
    case 'categories': return <CategoriesPanel />;
    case 'discounts': return <CouponsPanel />;
    case 'inventory': return <InventoryPanel />;
    case 'customers': return <CustomersPanel />;
    case 'inbox': return <InboxPanel onDirty={onNotifDirty} />;
    case 'claims': return <ClaimsPanel onDirty={onNotifDirty} />;
    case 'content': return <ContentPanel />;
    case 'chhath': return <ChhathPanel />;
    case 'store-settings': return <StoreSettingsPanel />;
    case 'payments': return <PaymentsPanel />;
    case 'outbox': return <OutboxPanel viewerEmail={user.email} />;
    case 'flags': return <FlagsPanel />;
    case 'audit': return <AuditPanel />;
    case 'staff': return <StaffPanel user={user} />;
    default: return null;
  }
}

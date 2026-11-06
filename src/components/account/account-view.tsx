'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronRight, Download, Heart, Loader2, MapPin, Package, Pencil, Plus, ShieldCheck, Star, Trash2, Truck, User, X, Zap,
} from 'lucide-react';
import { useUi, useAuth, useWishlist, useCart, useConsent } from '@/lib/store';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { recordConsent } from '@/components/layout/consent-gate';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { SectionOrnament } from '@/components/fx/madhubani';
import type { OrderDto } from '@/lib/types';

const STAFF_ROLES = ['OWNER', 'MANAGER', 'PACKING', 'SUPPORT', 'ADMIN'];

interface SavedAddress {
  id: string;
  label?: string;
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault?: boolean;
}

interface AddressForm {
  label: string;
  name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
}

const EMPTY_FORM: AddressForm = { label: 'Home', name: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '' };

const ADD_INPUT_CLS =
  'w-full rounded-xl border border-line-warm bg-cream-2/40 px-3 py-2 text-[13.5px] outline-none transition-colors placeholder:text-muted-foreground focus:border-brand';

const isPhoneOk = (v: string) => /^[+\d][\d\s-]{8,15}$/.test(v);
const isPinOk = (v: string) => /^\d{6}$/.test(v);

function validateAddress(f: AddressForm): Record<string, string> {
  const errs: Record<string, string> = {};
  if (!f.name.trim()) errs.name = 'Required';
  if (!isPhoneOk(f.phone)) errs.phone = 'Valid phone required';
  if (!f.line1.trim()) errs.line1 = 'Required';
  if (!f.city.trim()) errs.city = 'Required';
  if (!f.state.trim()) errs.state = 'Required';
  if (!isPinOk(f.pincode)) errs.pincode = '6-digit pincode';
  return errs;
}

export default function AccountView() {
  const navigate = useUi((s) => s.navigate);
  const setOverlay = useUi((s) => s.setOverlay);
  const user = useAuth((s) => s.user);
  const ready = useAuth((s) => s.ready);
  const logout = useAuth((s) => s.logout);
  const wishlistCount = useWishlist((s) => s.slugs.length);
  const reopenConsent = useConsent((s) => s.reopenConsent);

  const [ordersInfo, setOrdersInfo] = useState<{ uid: string; count: number } | null>(null);
  const [addrData, setAddrData] = useState<{ uid: string; list: SavedAddress[] } | null>(null);
  const [addrFailed, setAddrFailed] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [savingAddr, setSavingAddr] = useState(false);
  const [form, setForm] = useState<AddressForm>({ ...EMPTY_FORM });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  /* address edit / remove */
  const [editing, setEditing] = useState<SavedAddress | null>(null);
  const [editForm, setEditForm] = useState<AddressForm>({ ...EMPTY_FORM });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editDefault, setEditDefault] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SavedAddress | null>(null);
  const [addrDeleting, setAddrDeleting] = useState(false);

  /* privacy & data */
  const consentAnalytics = useConsent((s) => s.consent.analytics);
  const consentMarketing = useConsent((s) => s.consent.marketing);
  const [prefDraft, setPrefDraft] = useState<{ analytics: boolean; marketing: boolean } | null>(null);
  const [exportBusy, setExportBusy] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [delConfirm, setDelConfirm] = useState('');
  const [delBusy, setDelBusy] = useState(false);

  useEffect(() => {
    if (!ready || !user) return;
    let alive = true;
    api<{ orders: OrderDto[] }>('/api/account/orders')
      .then((j) => { if (alive) setOrdersInfo({ uid: user.id, count: j.orders.length }); })
      .catch(() => { if (alive) setOrdersInfo(null); });
    api<{ addresses: SavedAddress[] }>('/api/account/addresses')
      .then((j) => {
        if (!alive) return;
        setAddrData({ uid: user.id, list: j.addresses });
        setAddrFailed(false);
      })
      .catch(() => { if (alive) setAddrFailed(true); });
    return () => { alive = false; };
  }, [ready, user]);

  const orderCount = ordersInfo && ordersInfo.uid === user?.id ? ordersInfo.count : null;
  const addresses = addrData && addrData.uid === user?.id ? addrData.list : [];
  const addrLoading = Boolean(user) && !addrFailed && !(addrData && addrData.uid === user?.id);

  /* ── auth still resolving ── */
  if (!ready) {
    return (
      <div className="mx-auto max-w-7xl px-4 pb-28 pt-28 sm:px-6 md:pt-32" aria-busy="true">
        <div className="skeleton mx-auto h-10 w-72 rounded-full" />
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="skeleton h-44 rounded-3xl" />
          <div className="skeleton h-44 rounded-3xl" />
        </div>
      </div>
    );
  }

  /* ── guest ── */
  if (!user) {
    const benefits = [
      { icon: Truck, text: 'Track every order in real time, from kadhai to doorstep' },
      { icon: Heart, text: 'Wishlist that stays saved across your visits' },
      { icon: Zap, text: 'Faster checkout with your address on file' },
    ];
    return (
      <div className="mx-auto max-w-7xl px-4 pb-28 pt-28 sm:px-6 md:pt-32">
        <div className="card-warm relative mx-auto max-w-lg overflow-hidden px-8 py-14 text-center">
          <img src="/brand/mandala.png" alt="" aria-hidden className="animate-spin-slow pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full opacity-10" />
          <img src="/brand/mandala.png" alt="BiharSe mandala" className="animate-spin-slow mx-auto h-20 w-20 rounded-full" />
          <h1 className="font-display mt-6 text-3xl font-semibold text-ink">Namaste, guest 👋</h1>
          <p className="mt-2 text-[14.5px] text-muted-foreground">Sign in to make every BiharSe order smoother.</p>

          <ul className="mx-auto mt-7 max-w-sm space-y-3 text-left">
            {benefits.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 rounded-2xl border border-line-warm bg-cream-2/40 px-4 py-3">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand/10 text-brand">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-[13.5px] font-medium text-jaggery">{text}</span>
              </li>
            ))}
          </ul>

          <button onClick={() => setOverlay('auth')} className="btn-primary mt-8">
            <ShieldCheck className="h-4.5 w-4.5" /> Sign in with email OTP
          </button>
          <p className="mt-3 text-[11.5px] text-muted-foreground">No password — a 6-digit OTP over email</p>
        </div>
      </div>
    );
  }

  /* ── signed in ── */
  const isStaff = STAFF_ROLES.includes(user.role);
  const firstName = user.name.split(' ')[0] || user.name;
  const prefShown = prefDraft ?? { analytics: consentAnalytics, marketing: consentMarketing };

  const refreshAddresses = async () => {
    try {
      const j = await api<{ addresses: SavedAddress[] }>('/api/account/addresses');
      setAddrData({ uid: user.id, list: j.addresses });
      setAddrFailed(false);
    } catch { /* keep the current list on screen */ }
  };

  const saveAddress = async () => {
    const errs = validateAddress(form);
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSavingAddr(true);
    try {
      const j = await api<{ address: SavedAddress }>('/api/account/addresses', { method: 'POST', body: JSON.stringify(form) });
      setAddrData((prev) => {
        const list = prev && prev.uid === user.id ? prev.list : [];
        const next = [...list, j.address];
        return { uid: user.id, list: next.sort((a, b) => Number(b.isDefault ?? false) - Number(a.isDefault ?? false)) };
      });
      setForm({ ...EMPTY_FORM });
      setShowAdd(false);
      toast({ title: 'Address saved', description: (form.label || 'Home') + ' · ' + form.city });
    } catch (e) {
      toast({ title: 'Could not save address', description: e instanceof Error ? e.message : 'Try again', variant: 'destructive' });
    }
    setSavingAddr(false);
  };

  const openEdit = (a: SavedAddress) => {
    setEditing(a);
    setEditForm({ label: a.label || 'Home', name: a.name, phone: a.phone, line1: a.line1, line2: a.line2 || '', city: a.city, state: a.state, pincode: a.pincode });
    setEditDefault(Boolean(a.isDefault));
    setEditErrors({});
  };

  const saveEdit = async () => {
    if (!editing) return;
    const errs = validateAddress(editForm);
    setEditErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSavingEdit(true);
    try {
      const j = await api<{ address: SavedAddress }>('/api/account/addresses', {
        method: 'PATCH',
        body: JSON.stringify({ id: editing.id, ...editForm, isDefault: editDefault }),
      });
      setAddrData((prev) => {
        const list = prev && prev.uid === user.id ? prev.list : [];
        const next = list.map((a) => (editDefault && a.id !== j.address.id ? { ...a, isDefault: false } : a))
          .map((a) => (a.id === j.address.id ? j.address : a));
        return { uid: user.id, list: next.sort((a, b) => Number(b.isDefault ?? false) - Number(a.isDefault ?? false)) };
      });
      setEditing(null);
      toast({ title: 'Address updated', description: (editForm.label || 'Home') + ' · ' + editForm.city });
    } catch (e) {
      toast({ title: 'Could not update address', description: e instanceof Error ? e.message : 'Try again', variant: 'destructive' });
    }
    setSavingEdit(false);
  };

  const setDefaultAddress = async (a: SavedAddress) => {
    try {
      await api('/api/account/addresses', { method: 'PATCH', body: JSON.stringify({ id: a.id, isDefault: true }) });
      setAddrData((prev) => {
        const list = prev && prev.uid === user.id ? prev.list : [];
        const next = list.map((x) => ({ ...x, isDefault: x.id === a.id }));
        return { uid: user.id, list: next.sort((x, y) => Number(y.isDefault ?? false) - Number(x.isDefault ?? false)) };
      });
      toast({ title: 'Default address updated', description: `${a.label || 'Home'} · ${a.city}` });
    } catch (e) {
      toast({ title: 'Could not update', description: e instanceof Error ? e.message : 'Try again', variant: 'destructive' });
    }
  };

  const removeAddress = async () => {
    if (!deleteTarget) return;
    setAddrDeleting(true);
    try {
      await api(`/api/account/addresses?id=${encodeURIComponent(deleteTarget.id)}`, { method: 'DELETE' });
      await refreshAddresses();
      toast({ title: 'Address removed', description: 'Past orders keep their delivery record — only your saved copy is gone.' });
    } catch (e) {
      toast({ title: 'Could not remove address', description: e instanceof Error ? e.message : 'Try again', variant: 'destructive' });
    }
    setAddrDeleting(false);
    setDeleteTarget(null);
  };

  /* ── privacy & data ── */
  const savePrefs = () => {
    recordConsent(prefShown);
    toast({ title: 'Privacy preferences saved', description: 'Stored on your device and logged under the DPDP Act 2023.' });
  };

  const downloadData = async () => {
    setExportBusy(true);
    try {
      const r = await fetch('/api/account/export', { cache: 'no-store' });
      if (!r.ok) throw new Error('Export failed — please try again');
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'biharse-my-data.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast({ title: 'Your data is ready', description: 'biharse-my-data.json — downloaded straight from our records.' });
    } catch (e) {
      toast({ title: 'Export failed', description: e instanceof Error ? e.message : 'Please try again', variant: 'destructive' });
    }
    setExportBusy(false);
  };

  const deleteAccount = async () => {
    setDelBusy(true);
    try {
      await api('/api/account/delete', { method: 'POST', body: JSON.stringify({ confirm: 'DELETE' }) });
      useCart.getState().clear();
      useWishlist.getState().clear();
      navigate('home');
      await logout();
      toast({ title: 'Account deleted', description: 'Your personal data has been erased under the DPDP Act 2023. Take care 🙏' });
    } catch (e) {
      toast({ title: 'Could not delete account', description: e instanceof Error ? e.message : 'Please try again', variant: 'destructive' });
    }
    setDelBusy(false);
    setDelOpen(false);
  };

  const signOut = async () => {
    await logout();
    toast({ title: 'Signed out', description: 'Come back soon — the kitchen misses you!' });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pb-28 pt-28 sm:px-6 md:pt-32">
      {/* header */}
      <div className="text-center">
        <p className="text-eyebrow text-jaggery-3">Your account</p>
        <h1 className="font-display mt-2 flex flex-wrap items-center justify-center gap-3 text-display-2 font-semibold text-ink">
          Namaste, {firstName}
          {isStaff && (
            <span className="rounded-full bg-turmeric px-3 py-1 text-[12px] font-extrabold uppercase tracking-wide text-ink shadow">
              Staff · {user.role}
            </span>
          )}
        </h1>
        <div className="mt-4"><SectionOrnament /></div>
      </div>

      <motion.div
        className="mt-10 grid gap-6 md:grid-cols-2"
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* my orders */}
        <button
          onClick={() => navigate('orders')}
          className="card-warm group flex items-center gap-4 p-6 text-left transition-all hover:shadow-[0_24px_50px_-20px_rgba(61,31,18,0.45)]"
          aria-label="My orders"
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand/10 text-brand">
            <Package className="h-6 w-6" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="font-display block text-lg font-semibold text-ink">My Orders</span>
            <span className="text-[13px] text-muted-foreground">
              {orderCount === null ? 'Tap to view your batches' : orderCount === 0 ? 'No orders yet' : orderCount + ' order' + (orderCount > 1 ? 's' : '') + ' placed'}
            </span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
        </button>

        {/* wishlist */}
        <button
          onClick={() => navigate('wishlist')}
          className="card-warm group flex items-center gap-4 p-6 text-left transition-all hover:shadow-[0_24px_50px_-20px_rgba(61,31,18,0.45)]"
          aria-label="Wishlist"
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-saffron/10 text-saffron">
            <Heart className="h-6 w-6" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="font-display block text-lg font-semibold text-ink">Wishlist</span>
            <span className="text-[13px] text-muted-foreground">{wishlistCount} saved treat{wishlistCount === 1 ? '' : 's'}</span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
        </button>

        {/* saved addresses */}
        <section className="card-warm p-6 md:col-span-2" aria-labelledby="saved-addresses">
          <div className="flex items-center justify-between gap-3">
            <h2 id="saved-addresses" className="font-display flex items-center gap-2.5 text-lg font-semibold text-ink">
              <MapPin className="h-5 w-5 text-brand" /> Saved addresses
            </h2>
            <button
              onClick={() => setShowAdd((v) => !v)}
              className="btn-ghost !px-4 !py-2 text-[13px]"
              aria-expanded={showAdd}
            >
              {showAdd ? <><X className="h-3.5 w-3.5" /> Close</> : <><Plus className="h-3.5 w-3.5" /> Add address</>}
            </button>
          </div>

          {addrLoading ? (
            <div className="mt-5 space-y-3" aria-busy="true">
              <div className="skeleton h-16 rounded-2xl" />
              <div className="skeleton h-16 rounded-2xl" />
            </div>
          ) : addresses.length === 0 ? (
            <p className="mt-5 rounded-2xl border border-dashed border-line-warm bg-cream-2/40 px-4 py-6 text-center text-[13.5px] text-muted-foreground">
              {addrFailed ? 'Couldn\u2019t load saved addresses — check your connection and refresh.'
                : 'No saved addresses yet — add one and checkout gets faster.'}
            </p>
          ) : (
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {addresses.map((a) => (
                <li key={a.id} className="rounded-2xl border border-line-warm bg-cream-2/40 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] font-bold text-jaggery">{a.label || 'Home'}</p>
                    {a.isDefault ? (
                      <span className="flex items-center gap-1 rounded-full bg-turmeric px-2 py-0.5 text-[10.5px] font-extrabold text-ink">
                        <Star className="h-3 w-3 fill-ink" /> Default
                      </span>
                    ) : (
                      <button
                        onClick={() => void setDefaultAddress(a)}
                        className="flex min-h-[32px] items-center gap-1 rounded-full border border-line-warm px-2.5 py-0.5 text-[10.5px] font-bold text-jaggery-2 transition-colors hover:border-brand hover:text-brand"
                        aria-label={`Set ${a.label || 'Home'} as default address`}
                      >
                        <Star className="h-3 w-3" /> Set default
                      </button>
                    )}
                  </div>
                  <p className="mt-1.5 text-[13.5px] font-semibold text-ink">{a.name}</p>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
                    {a.line1}{a.line2 ? ', ' + a.line2 : ''}, {a.city}, {a.state} — {a.pincode} · {a.phone}
                  </p>
                  <div className="mt-3 flex gap-2 border-t border-line-warm/60 pt-3">
                    <button
                      onClick={() => openEdit(a)}
                      className="flex min-h-[36px] items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-bold text-jaggery-2 transition-colors hover:bg-brand/10 hover:text-brand"
                      aria-label={`Edit ${a.label || 'Home'} address`}
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget(a)}
                      className="flex min-h-[36px] items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-bold text-jaggery-2 transition-colors hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Remove ${a.label || 'Home'} address`}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* inline add form */}
          {showAdd && (
            <form
              className="mt-5 grid gap-3 rounded-2xl border border-brand/25 bg-brand/5 p-4 sm:grid-cols-2"
              onSubmit={(e) => { e.preventDefault(); void saveAddress(); }}
            >
              <AddressFields form={form} setForm={setForm} errors={formErrors} />
              <div className="sm:col-span-2">
                <button type="submit" disabled={savingAddr} className="btn-primary !py-2.5 text-[14px]">
                  {savingAddr ? 'Saving…' : 'Save address'}
                </button>
              </div>
            </form>
          )}
        </section>

        {/* profile details */}
        <section className="card-warm p-6" aria-labelledby="profile-details">
          <h2 id="profile-details" className="font-display flex items-center gap-2.5 text-lg font-semibold text-ink">
            <User className="h-5 w-5 text-brand" /> Profile details
          </h2>
          <dl className="mt-5 space-y-3 text-[13.5px]">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="truncate font-semibold text-ink">{user.email}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Phone</dt>
              <dd className="font-semibold text-ink">{user.phone || '—'}</dd>
            </div>
          </dl>
          <p className="mt-4 rounded-xl bg-cream-2/60 px-3.5 py-2.5 text-[12px] text-muted-foreground">
            To change your email or phone, contact support — we verify every detail by hand.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {isStaff && (
              <button onClick={() => navigate('admin')} className="btn-primary !px-5 !py-2.5 text-[14px]">
                Open Admin
              </button>
            )}
            <button onClick={signOut} className="btn-ghost !px-5 !py-2.5 text-[14px]">
              Sign out
            </button>
          </div>
        </section>

        {/* privacy & data (DPDP Act 2023) */}
        <section className="card-warm p-6" aria-labelledby="privacy-data">
          <h2 id="privacy-data" className="font-display flex items-center gap-2.5 text-lg font-semibold text-ink">
            <ShieldCheck className="h-5 w-5 text-brand" /> Privacy &amp; data
          </h2>
          <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
            Under India&apos;s DPDP Act 2023 you control your data — see what we hold, change your consent, or erase it all.
          </p>

          {/* consent preferences */}
          <h3 className="mt-5 text-[11.5px] font-bold uppercase tracking-wide text-jaggery-3">Consent preferences</h3>
          <TooltipProvider delayDuration={200}>
            <ul className="mt-2.5 space-y-2">
              <li className="flex items-center justify-between gap-3 rounded-xl border border-line-warm bg-cream-2/40 px-3 py-2">
                <span className="min-w-0">
                  <span className="block text-[12.5px] font-bold text-jaggery">Essential</span>
                  <span className="block text-[11px] text-muted-foreground">Cart, sign-in, payments — always on.</span>
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span aria-disabled="true">
                      <Switch checked disabled aria-label="Essential cookies — always on" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[180px] text-center text-[11.5px]">
                    Always on — required for BiharSe to function
                  </TooltipContent>
                </Tooltip>
              </li>
              <li className="flex items-center justify-between gap-3 rounded-xl border border-line-warm bg-cream-2/40 px-3 py-2">
                <span className="min-w-0">
                  <span className="block text-[12.5px] font-bold text-jaggery">Analytics</span>
                  <span className="block text-[11px] text-muted-foreground">GA4 &amp; Meta — anonymous stats.</span>
                </span>
                <Switch
                  checked={prefShown.analytics}
                  onCheckedChange={(v) => setPrefDraft({ ...prefShown, analytics: v })}
                  aria-label="Analytics cookies"
                />
              </li>
              <li className="flex items-center justify-between gap-3 rounded-xl border border-line-warm bg-cream-2/40 px-3 py-2">
                <span className="min-w-0">
                  <span className="block text-[12.5px] font-bold text-jaggery">Marketing</span>
                  <span className="block text-[11px] text-muted-foreground">Email newsletter &amp; offers.</span>
                </span>
                <Switch
                  checked={prefShown.marketing}
                  onCheckedChange={(v) => setPrefDraft({ ...prefShown, marketing: v })}
                  aria-label="Marketing emails"
                />
              </li>
            </ul>
          </TooltipProvider>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={savePrefs} className="btn-primary !px-4 !py-2 text-[12.5px]">Save preferences</button>
            <button onClick={reopenConsent} className="btn-ghost !px-4 !py-2 text-[12.5px]">Cookie preferences</button>
          </div>

          {/* data tools */}
          <h3 className="mt-6 text-[11.5px] font-bold uppercase tracking-wide text-jaggery-3">Your data, your rights</h3>
          <div className="mt-2.5 space-y-2.5">
            <button
              onClick={() => void downloadData()}
              disabled={exportBusy}
              className="flex min-h-[44px] w-full items-center gap-3 rounded-xl border border-line-warm bg-cream-2/40 px-3.5 py-2.5 text-left transition-colors hover:border-brand hover:bg-brand/5 disabled:opacity-60"
            >
              {exportBusy ? <Loader2 className="h-4.5 w-4.5 shrink-0 animate-spin text-brand" /> : <Download className="h-4.5 w-4.5 shrink-0 text-brand" />}
              <span className="min-w-0">
                <span className="block text-[13px] font-bold text-ink">{exportBusy ? 'Packing your file…' : 'Download my data'}</span>
                <span className="block text-[11px] text-muted-foreground">A JSON copy of your profile, orders &amp; consent history.</span>
              </span>
            </button>
            <AlertDialog open={delOpen} onOpenChange={(o) => { setDelOpen(o); if (!o) setDelConfirm(''); }}>
              <AlertDialogTrigger asChild>
                <button
                  className="flex min-h-[44px] w-full items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-left transition-colors hover:bg-destructive/10 disabled:opacity-60"
                  disabled={delBusy}
                >
                  <Trash2 className="h-4.5 w-4.5 shrink-0 text-destructive" />
                  <span className="min-w-0">
                    <span className="block text-[13px] font-bold text-destructive">Delete my account</span>
                    <span className="block text-[11px] text-muted-foreground">Erases your profile &amp; saved data, per DPDP Act 2023.</span>
                  </span>
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete your BiharSe account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently erases your profile, saved addresses, wishlist and reviews, as required under India&apos;s DPDP Act 2023.
                    Order totals are retained only where tax law requires. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div>
                  <label htmlFor="delete-confirm" className="mb-1.5 block text-[12px] font-bold text-jaggery-3">
                    Type DELETE to confirm
                  </label>
                  <input
                    id="delete-confirm"
                    value={delConfirm}
                    onChange={(e) => setDelConfirm(e.target.value.toUpperCase())}
                    placeholder="DELETE"
                    autoComplete="off"
                    className="w-full rounded-xl border border-line-warm bg-cream-2/40 px-3 py-2 text-[14px] font-bold tracking-widest outline-none focus:border-destructive"
                    aria-label="Type DELETE to confirm account deletion"
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel className="min-h-[44px]">Keep my account</AlertDialogCancel>
                  <AlertDialogAction
                    className="min-h-[44px] bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive"
                    disabled={delConfirm !== 'DELETE' || delBusy}
                    onClick={(e) => { e.preventDefault(); void deleteAccount(); }}
                  >
                    {delBusy ? <><Loader2 className="h-4 w-4 animate-spin" /> Deleting…</> : 'Delete forever'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </section>
      </motion.div>

      {/* edit address dialog */}
      <Dialog open={Boolean(editing)} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit “{editing?.label || 'Home'}”</DialogTitle>
            <DialogDescription>Update the saved address — checkout will use these details.</DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => { e.preventDefault(); void saveEdit(); }}
          >
            <AddressFields form={editForm} setForm={setEditForm} errors={editErrors} />
            <label className="flex sm:col-span-2 cursor-pointer items-center justify-between gap-3 rounded-xl border border-line-warm bg-cream-2/40 px-3.5 py-2.5">
              <span className="text-[12.5px] font-bold text-jaggery">Use as my default address</span>
              <Switch checked={editDefault} onCheckedChange={setEditDefault} aria-label="Use as default address" />
            </label>
            <DialogFooter className="sm:col-span-2">
              <button type="button" onClick={() => setEditing(null)} className="btn-ghost !px-5 !py-2.5 text-[14px]">Cancel</button>
              <button type="submit" disabled={savingEdit} className="btn-primary !px-5 !py-2.5 text-[14px]">
                {savingEdit ? 'Saving…' : 'Save changes'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* remove address confirm */}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove “{deleteTarget?.label || 'Home'}”?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? `${deleteTarget.name} · ${deleteTarget.city} ${deleteTarget.pincode} — ` : ''}
              it disappears from saved addresses. Past orders keep their delivery record for tracking.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-[44px]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="min-h-[44px] bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive"
              disabled={addrDeleting}
              onClick={(e) => { e.preventDefault(); void removeAddress(); }}
            >
              {addrDeleting ? <><Loader2 className="h-4 w-4 animate-spin" /> Removing…</> : 'Remove address'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AddressFields({ form, setForm, errors }: { form: AddressForm; setForm: React.Dispatch<React.SetStateAction<AddressForm>>; errors: Record<string, string> }) {
  return (
    <>
      <FormField label="Label" error={errors.label}>
        <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className={ADD_INPUT_CLS} placeholder="Home" aria-label="Address label" />
      </FormField>
      <FormField label="Name *" error={errors.name}>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={ADD_INPUT_CLS} placeholder="Mithilesh Kumar" aria-label="Recipient name" />
      </FormField>
      <FormField label="Phone *" error={errors.phone}>
        <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={ADD_INPUT_CLS} placeholder="+91 98765 43210" aria-label="Phone" inputMode="tel" />
      </FormField>
      <FormField label="Pincode *" error={errors.pincode}>
        <input value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })} className={ADD_INPUT_CLS} placeholder="800001" aria-label="Pincode" inputMode="numeric" />
      </FormField>
      <FormField label="Address line 1 *" error={errors.line1}>
        <input value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} className={ADD_INPUT_CLS} placeholder="House, street, area" aria-label="Address line 1" />
      </FormField>
      <FormField label="Address line 2" error={errors.line2}>
        <input value={form.line2} onChange={(e) => setForm({ ...form, line2: e.target.value })} className={ADD_INPUT_CLS} placeholder="Landmark (optional)" aria-label="Address line 2" />
      </FormField>
      <FormField label="City *" error={errors.city}>
        <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={ADD_INPUT_CLS} placeholder="Patna" aria-label="City" />
      </FormField>
      <FormField label="State *" error={errors.state}>
        <input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className={ADD_INPUT_CLS} placeholder="Bihar" aria-label="State" />
      </FormField>
    </>
  );
}

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[11.5px] font-bold uppercase tracking-wide text-jaggery-3">{label}</label>
      {children}
      {error && <p className="mt-1 text-[11.5px] font-semibold text-destructive" role="alert">{error}</p>}
    </div>
  );
}

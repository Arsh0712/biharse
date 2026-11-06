'use client';

/* ── BiharSe back office (Task 13) — PrestaShop-style shell, BiharSe identity ──
 * Staff gate → BackOffice shell (dark sidebar + topbar + panel workspace).
 * Panels live in ./panels/**. All data comes from the live admin APIs.
 * ────────────────────────────────────────────────────────────────────────── */

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { LogOut } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { useAuth, useUi } from '@/lib/store';
import type { User } from '@/lib/types';
import { Field, TextField, errText } from './ui';
import { BackOffice } from './back-office';

/* ── gate cards ──────────────────────────────────────────────────────── */

function CenteredLoader() {
  return (
    <div className="grid min-h-screen place-items-center bg-cream">
      <img src="/brand/mandala.png" alt="Loading" className="animate-spin-slow h-16 w-16 rounded-full" />
    </div>
  );
}

function SignInCard() {
  const authLoad = useAuth((s) => s.load);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const clean = email.trim();
    if (!clean || !password) {
      toast({ title: 'Email and password required', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: clean, password }) });
      toast({ title: 'Signed in', description: 'Welcome back, opening the back office…' });
      await authLoad();
    } catch (err) {
      toast({ title: 'Sign-in failed', description: errText(err), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-cream px-4 py-10">
      <div className="card-warm w-full max-w-sm p-7 text-center">
        <img src="/brand/mandala.png" alt="" className="animate-spin-slow mx-auto h-16 w-16 rounded-full opacity-90" />
        <p className="text-eyebrow mt-4 text-jaggery-3">BiharSe back office</p>
        <h1 className="font-display mt-1 text-2xl font-bold text-ink">Staff sign-in</h1>
        <form onSubmit={submit} className="mt-6 space-y-3 text-left">
          <Field label="Email">
            <TextField
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@biharse.org"
              required
            />
          </Field>
          <Field label="Password">
            <TextField
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </Field>
          <button type="submit" className="btn-primary w-full text-sm" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="mt-5 text-xs leading-relaxed text-jaggery-3">
          Staff accounts use password sign-in. Owner credentials are configured via the{' '}
          <span className="font-mono text-jaggery-2">ADMIN_EMAIL / ADMIN_PASSWORD</span> env vars.
        </p>
      </div>
    </div>
  );
}

function NotStaffCard({ user }: { user: User }) {
  const logout = useAuth((s) => s.logout);
  const navigate = useUi((s) => s.navigate);

  async function signOut() {
    await logout();
    navigate('home');
    toast({ title: 'Signed out' });
  }

  return (
    <div className="grid min-h-screen place-items-center bg-cream px-4 py-10">
      <div className="card-warm w-full max-w-sm p-7 text-center">
        <img src="/brand/mandala.png" alt="" className="mx-auto h-16 w-16 rounded-full opacity-80" />
        <h1 className="font-display mt-4 text-2xl font-bold text-ink">Not staff</h1>
        <p className="mt-2 text-sm text-jaggery-2">
          You’re signed in as <span className="font-semibold">{user.name || user.email}</span>, but the admin panel is only
          for BiharSe staff accounts.
        </p>
        <button type="button" className="btn-ghost mt-6 w-full text-sm" onClick={() => void signOut()}>
          <LogOut size={15} /> Sign out
        </button>
      </div>
    </div>
  );
}

/* ── root ────────────────────────────────────────────────────────────── */

export default function AdminView() {
  const user = useAuth((s) => s.user);
  const ready = useAuth((s) => s.ready);
  const authLoad = useAuth((s) => s.load);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!user) void authLoad();
  }, [user, authLoad]);

  if (!mounted) return null; // avoid SSR mismatch for the dynamic import
  if (!ready && !user) return <CenteredLoader />;
  if (!user) return <SignInCard />;
  if (user.role === 'CUSTOMER') return <NotStaffCard user={user} />;
  return <BackOffice user={user} />;
}

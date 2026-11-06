'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { X, Loader2, MailCheck, ShieldCheck, TimerReset } from 'lucide-react';
import { useUi, useAuth } from '@/lib/store';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

/** Auth modal — email OTP (primary) + Google (when configured). Remounts on open to reset state. */
export function AuthModal() {
  const overlay = useUi((s) => s.overlay);
  if (overlay !== 'auth') return null;
  return <AuthModalInner key="auth-open" />;
}

function AuthModalInner() {
  const overlay = useUi((s) => s.overlay);
  const setOverlay = useUi((s) => s.setOverlay);
  const navigate = useUi((s) => s.navigate);
  const setUser = useAuth((s) => s.set);

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const requestOtp = async (resend = false) => {
    setError('');
    if (!/.+@.+\..+/.test(email)) { setError('Enter a valid email address'); return; }
    setLoading(true);
    try {
      await api('/api/auth/otp', { method: 'POST', body: JSON.stringify({ email }) });
      setStep('code');
      setCooldown(30);
      toast({ title: resend ? 'New code sent' : 'Code sent', description: `6-digit code is on its way to ${email}` });
      setTimeout(() => codeRefs.current[0]?.focus(), 120);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send code');
    }
    setLoading(false);
  };

  const verify = async (combined?: string) => {
    const value = combined ?? code.join('');
    if (!/^\d{6}$/.test(value)) { setError('Enter all 6 digits'); return; }
    setError('');
    setLoading(true);
    try {
      const j = await api<{ user: import('@/lib/types').User }>('/api/auth/verify', {
        method: 'POST',
        body: JSON.stringify({ email, code: value }),
      });
      setUser(j.user);
      setOverlay(null);
      toast({ title: 'Namaste! 🙏', description: `Signed in as ${j.user.name}` });
      if (['OWNER', 'ADMIN', 'MANAGER', 'PACKING', 'SUPPORT'].includes(j.user.role)) navigate('admin');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed');
    }
    setLoading(false);
  };

  const onCodeChange = (i: number, v: string) => {
    const digit = v.replace(/\D/g, '').slice(-1);
    const next = [...code];
    next[i] = digit;
    setCode(next);
    if (digit && i < 5) codeRefs.current[i + 1]?.focus();
    if (next.every((d) => d !== '')) verify(next.join(''));
  };

  return (
    <AnimatePresence>
      {overlay === 'auth' && (
        <motion.div className="fixed inset-0 z-[70] grid place-items-center bg-jaggery/55 px-4 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={() => setOverlay(null)} role="dialog" aria-modal="true" aria-label="Sign in">
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* branded header */}
            <div className="relative bg-jaggery px-8 pb-10 pt-8 text-center text-cream" data-theme="dark">
              <button onClick={() => setOverlay(null)} className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-cream/10 text-cream transition hover:bg-cream/20" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
              <Image src="/brand/mandala.png" alt="" width={64} height={64} className="mx-auto rounded-full" />
              <h2 className="font-display mt-3 text-2xl font-semibold">{step === 'email' ? 'Namaste, welcome home' : 'Check your inbox'}</h2>
              <p className="mt-1 text-sm text-cream/70">
                {step === 'email' ? 'Sign in to track orders, save favourites & gift faster' : `We sent a 6-digit code to ${email}`}
              </p>
            </div>

            <div className="px-8 py-7">
              {step === 'email' ? (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="auth-email" className="mb-1.5 block text-[13px] font-semibold text-ink">Email address</label>
                    <input
                      id="auth-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && requestOtp()}
                      placeholder="you@example.com"
                      className="w-full rounded-xl border border-line-warm bg-cream-2/60 px-4 py-3 text-[15px] outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                    />
                  </div>
                  {error && <p className="text-[13px] font-medium text-brand-deep">{error}</p>}
                  <button onClick={() => requestOtp()} disabled={loading} className="btn-primary w-full text-[15px]">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailCheck className="h-4 w-4" />}
                    Continue with email
                  </button>
                  <div className="flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <span className="h-px flex-1 bg-line-warm" /> or <span className="h-px flex-1 bg-line-warm" />
                  </div>
                  <a href="/api/auth/google" className={`flex w-full items-center justify-center gap-3 rounded-full border border-line-warm bg-white py-3 text-[15px] font-semibold text-ink transition hover:bg-cream-2 ${'opacity-90'}`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
                    Continue with Google
                  </a>
                  <p className="flex items-center justify-center gap-1.5 pt-1 text-center text-[12px] text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5 text-jaggery-3" /> Passwordless & secure — one-time codes only
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-center gap-2">
                    {code.map((d, i) => (
                      <input
                        key={i}
                        ref={(el) => { codeRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        aria-label={`Digit ${i + 1}`}
                        value={d}
                        onChange={(e) => onCodeChange(i, e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Backspace' && !code[i] && i > 0) codeRefs.current[i - 1]?.focus(); }}
                        className="h-13 w-11 rounded-xl border border-line-warm bg-cream-2/60 py-3 text-center text-lg font-bold outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                      />
                    ))}
                  </div>
                  {error && <p className="text-center text-[13px] font-medium text-brand-deep">{error}</p>}
                  <button onClick={() => verify()} disabled={loading} className="btn-primary w-full text-[15px]">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Verify & sign in
                  </button>
                  <div className="flex items-center justify-between text-[13px]">
                    <button onClick={() => setStep('email')} className="font-semibold text-jaggery-2 hover:text-brand">← Change email</button>
                    <button
                      onClick={() => cooldown === 0 && requestOtp(true)}
                      disabled={cooldown > 0 || loading}
                      className="flex items-center gap-1 font-semibold text-jaggery-2 disabled:opacity-50 hover:text-brand"
                    >
                      <TimerReset className="h-3.5 w-3.5" /> {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Loader2, MailCheck } from 'lucide-react';
import { api } from '@/lib/api-client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      // The backend always returns the same generic response whether
      // or not the email exists (prevents account enumeration), so we
      // always show the same confirmation panel on success.
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen grid place-items-center bg-bg-950 relative overflow-hidden">
      <div className="absolute top-10 left-10 w-[350px] h-[350px] rounded-full bg-neon-500/10 blur-3xl" />
      <div className="w-full max-w-md relative z-10">
        <Link href="/auth/login" className="text-slate-400 text-xs uppercase tracking-widest">
          ← back to sign in
        </Link>

        <div className="card mt-4">
          {sent ? (
            <div className="text-center py-2">
              <div className="mx-auto w-12 h-12 rounded-full bg-neon-500/15 border border-neon-500/40 grid place-items-center">
                <MailCheck className="w-6 h-6 text-neon-400" />
              </div>
              <h1 className="font-display text-2xl font-semibold mt-4">Check your email</h1>
              <p className="text-slate-400 text-sm mt-2">
                If an account exists for <span className="text-slate-200">{email}</span>, we&apos;ve sent a
                link to reset your password. The link expires in 30 minutes.
              </p>
              <button
                type="button"
                className="btn-ghost w-full mt-6"
                onClick={() => setSent(false)}
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              <h1 className="font-display text-2xl font-semibold">Reset your password</h1>
              <p className="text-slate-400 text-sm mt-1">
                Enter the email associated with your account and we&apos;ll send you a reset link.
              </p>

              <form onSubmit={submit} className="mt-6 space-y-4">
                <div>
                  <label className="label" htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    required
                    autoFocus
                    className="input"
                    placeholder="you@interntrack.local"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn-primary w-full" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Reset Link'}
                </button>
              </form>
            </>
          )}

          <div className="mt-6 text-center text-xs text-slate-500">
            Remembered your password?{' '}
            <Link href="/auth/login" className="hover:text-neon-400">Sign in</Link>
          </div>
        </div>
      </div>
    </main>
  );
}

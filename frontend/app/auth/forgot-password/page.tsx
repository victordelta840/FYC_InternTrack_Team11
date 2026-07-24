'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, Mail, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api-client';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
    } catch {
      // The API always returns a generic response either way (it never
      // reveals whether the email exists), so there's nothing to branch on
      // here — fall through to the same success state regardless.
    } finally {
      setLoading(false);
      setSent(true);
    }
  }

  return (
    <main className="min-h-screen grid place-items-center bg-bg-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(56,189,248,0.10),transparent_60%)]" />
      <div className="w-full max-w-md relative z-10">
        <div className="card border-neon-500/30 shadow-neon">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-neon-500/20 text-neon-400 flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display text-xl">Forgot Password</h1>
              <p className="text-xs text-slate-400">We'll email you a reset link</p>
            </div>
          </div>

          {sent ? (
            <div className="mt-4 space-y-4">
              <div className="flex items-start gap-2 rounded-lg border border-neon-500/30 bg-neon-500/10 p-3 text-sm text-slate-300">
                <CheckCircle2 className="w-4 h-4 mt-0.5 text-neon-400 shrink-0" />
                <span>
                  If an account exists for that email, a password reset link has been sent.
                  Check your inbox.
                </span>
              </div>
              <Link href="/auth/login" className="btn-primary w-full inline-flex items-center justify-center">
                Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-4 space-y-4">
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  required
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <button className="btn-primary w-full" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Reset Link'}
              </button>
            </form>
          )}

          <p className="mt-4 text-xs text-slate-500">
            Remembered your password?{' '}
            <Link className="text-neon-400 hover:underline" href="/auth/login">Back to login</Link>.
          </p>
        </div>
      </div>
    </main>
  );
}

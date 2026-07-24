'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, KeyRound } from 'lucide-react';
import { api } from '@/lib/api-client';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      toast.error('Reset link is missing or invalid. Please request a new one.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword, confirmPassword });
      toast.success('Password reset. You can now log in.');
      router.replace('/auth/login');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Reset link is invalid or expired');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card border-neon-500/30 shadow-neon">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-neon-500/20 text-neon-400 flex items-center justify-center">
          <KeyRound className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-display text-xl">Reset Password</h1>
          <p className="text-xs text-slate-400">Choose a new password for your account</p>
        </div>
      </div>

      {!token && (
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          This reset link is missing its token. Please request a new one from the{' '}
          <Link className="underline" href="/auth/forgot-password">forgot password</Link> page.
        </div>
      )}

      <form onSubmit={submit} className="mt-4 space-y-4">
        <div>
          <label className="label">New Password</label>
          <input
            type="password"
            required
            minLength={8}
            className="input"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Confirm Password</label>
          <input
            type="password"
            required
            minLength={8}
            className="input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        <button className="btn-primary w-full" disabled={loading || !token}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reset Password'}
        </button>
      </form>

      <p className="mt-4 text-xs text-slate-500">
        <Link className="text-neon-400 hover:underline" href="/auth/login">Back to login</Link>.
      </p>
    </div>
  );
}

export default function ResetPassword() {
  return (
    <main className="min-h-screen grid place-items-center bg-bg-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(56,189,248,0.10),transparent_60%)]" />
      <div className="w-full max-w-md relative z-10">
        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}

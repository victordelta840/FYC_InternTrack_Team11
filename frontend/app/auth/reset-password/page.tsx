'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, ShieldAlert } from 'lucide-react';
import { api } from '@/lib/api-client';

const PASSWORD_RULES = [
  { test: (v: string) => v.length >= 8, label: 'At least 8 characters' },
  { test: (v: string) => /[A-Z]/.test(v), label: 'One uppercase letter' },
  { test: (v: string) => /[a-z]/.test(v), label: 'One lowercase letter' },
  { test: (v: string) => /[0-9]/.test(v), label: 'One number' },
];

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const rulesPassed = PASSWORD_RULES.every((r) => r.test(newPassword));
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const canSubmit = token && rulesPassed && passwordsMatch && !loading;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!rulesPassed) {
      toast.error('Password does not meet the requirements below.');
      return;
    }
    if (!passwordsMatch) {
      toast.error('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/reset-password', { token, newPassword });
      toast.success(res.data?.message || 'Password reset successfully.');
      router.push('/auth/login');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid or expired reset link.');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="text-center py-2">
        <div className="mx-auto w-12 h-12 rounded-full bg-red-500/15 border border-red-500/40 grid place-items-center">
          <ShieldAlert className="w-6 h-6 text-red-400" />
        </div>
        <h1 className="font-display text-2xl font-semibold mt-4">Invalid reset link</h1>
        <p className="text-slate-400 text-sm mt-2">
          This password reset link is missing or malformed. Please request a new one.
        </p>
        <Link href="/auth/forgot-password" className="btn-primary w-full mt-6 inline-flex">
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="font-display text-2xl font-semibold">Set a new password</h1>
      <p className="text-slate-400 text-sm mt-1">Choose a strong password for your account.</p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="newPassword">New password</label>
          <input
            id="newPassword"
            type="password"
            required
            autoFocus
            className="input"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="confirmPassword">Confirm new password</label>
          <input
            id="confirmPassword"
            type="password"
            required
            className="input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          {confirmPassword.length > 0 && !passwordsMatch && (
            <p className="text-[11px] text-red-400 mt-1">Passwords do not match.</p>
          )}
        </div>

        <ul className="space-y-1">
          {PASSWORD_RULES.map((rule) => {
            const passed = rule.test(newPassword);
            return (
              <li
                key={rule.label}
                className={`text-[11px] flex items-center gap-1.5 ${
                  passed ? 'text-neon-400' : 'text-slate-500'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${passed ? 'bg-neon-400' : 'bg-slate-600'}`} />
                {rule.label}
              </li>
            );
          })}
        </ul>

        <button type="submit" className="btn-primary w-full" disabled={!canSubmit}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reset Password'}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen grid place-items-center bg-bg-950 relative overflow-hidden">
      <div className="absolute top-10 left-10 w-[350px] h-[350px] rounded-full bg-neon-500/10 blur-3xl" />
      <div className="w-full max-w-md relative z-10">
        <Link href="/auth/login" className="text-slate-400 text-xs uppercase tracking-widest">
          ← back to sign in
        </Link>

        <div className="card mt-4">
          <Suspense fallback={<Loader2 className="w-5 h-5 animate-spin text-slate-400 mx-auto" />}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}

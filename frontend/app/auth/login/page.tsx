'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';

export default function StudentMentorLogin() {
  const router = useRouter();
  const { setAccessToken, setUser } = useAuthStore();
  const [email, setEmail] = useState('student1@interntrack.local');
  const [password, setPassword] = useState('Student@12345');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      setAccessToken(res.data.accessToken);
      setUser(res.data.user);
      toast.success(`Welcome, ${res.data.user.firstName}`);
      router.replace(res.data.user.role === 'MENTOR' ? '/mentor' : '/student');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen grid place-items-center bg-bg-950 relative overflow-hidden">
      <div className="absolute top-10 left-10 w-[350px] h-[350px] rounded-full bg-neon-500/10 blur-3xl" />
      <div className="w-full max-w-md relative z-10">
        <Link href="/" className="text-slate-400 text-xs uppercase tracking-widest">
          ← back to home
        </Link>
        <div className="card mt-4">
          <h1 className="font-display text-2xl font-semibold">Sign in to your portal</h1>
          <p className="text-slate-400 text-sm mt-1">Student & Mentor access.</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                required
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                required
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In'}
            </button>
          </form>

          <p className="mt-3 text-center text-xs">
            <Link className="text-neon-400 hover:underline" href="/auth/forgot-password">
              Forgot Password?
            </Link>
          </p>

          <div className="mt-6 flex items-center justify-between text-xs text-slate-500">
            <Link href="/auth/register" className="hover:text-neon-400">Create student account</Link>
            <Link href="/admin/login" className="hover:text-neon-400">Admin gateway →</Link>
          </div>
        </div>
      </div>
    </main>
  );
}

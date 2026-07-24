'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';

export default function AdminLogin() {
  const router = useRouter();
  const { setAccessToken, setUser } = useAuthStore();
  const [email, setEmail] = useState('admin@interntrack.local');
  const [password, setPassword] = useState('Admin@12345');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/admin/login', { email, password });
      setAccessToken(res.data.accessToken);
      setUser(res.data.user);
      toast.success('Admin session established');
      router.replace('/admin');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen grid place-items-center bg-bg-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(56,189,248,0.10),transparent_60%)]" />
      <div className="w-full max-w-md relative z-10">
        <div className="card border-neon-500/30 shadow-neon">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-neon-500/20 text-neon-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display text-xl">Admin Console</h1>
              <p className="text-xs text-slate-400">Isolated administrator gateway</p>
            </div>
          </div>

          <form onSubmit={submit} className="mt-4 space-y-4">
            <div>
              <label className="label">Admin Email</label>
              <input
                type="email"
                required
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                required
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button className="btn-primary w-full" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enter Admin Console'}
            </button>
          </form>
          <p className="mt-3 text-center text-xs">
            <Link className="text-neon-400 hover:underline" href="/auth/forgot-password">
              Forgot Password?
            </Link>
          </p>
          <p className="mt-4 text-xs text-slate-500">
            Not an admin? <Link className="text-neon-400 hover:underline" href="/auth/login">Use the portal login</Link>.
          </p>
        </div>
      </div>
    </main>
  );
}

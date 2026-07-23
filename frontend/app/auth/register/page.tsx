'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api-client';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    rollNumber: '',
    department: '',
  });
  const [loading, setLoading] = useState(false);

  function update<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/register', form);
      toast.success('Account created. Please sign in.');
      router.push('/auth/login');
    } catch (err: any) {
      const m = err.response?.data?.message;
      toast.error(Array.isArray(m) ? m.join(', ') : m || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen grid place-items-center bg-bg-950 relative overflow-hidden py-10">
      <div className="w-full max-w-lg relative z-10">
        <Link href="/" className="text-slate-400 text-xs uppercase tracking-widest">
          ← back to home
        </Link>
        <div className="card mt-4">
          <h1 className="font-display text-2xl">Create student account</h1>
          <p className="text-slate-400 text-sm mt-1">Only students self-register. Admins provision mentors.</p>

          <form onSubmit={submit} className="mt-6 grid grid-cols-2 gap-4">
            <div>
              <label className="label">First name</label>
              <input required className="input" value={form.firstName} onChange={(e) => update('firstName', e.target.value)} />
            </div>
            <div>
              <label className="label">Last name</label>
              <input required className="input" value={form.lastName} onChange={(e) => update('lastName', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="label">Email</label>
              <input required type="email" className="input" value={form.email} onChange={(e) => update('email', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="label">Password</label>
              <input required type="password" className="input" value={form.password} onChange={(e) => update('password', e.target.value)} />
              <p className="text-[11px] text-slate-500 mt-1">Min 8 chars, must include upper, lower, and a number.</p>
            </div>
            <div>
              <label className="label">Roll number</label>
              <input className="input" value={form.rollNumber} onChange={(e) => update('rollNumber', e.target.value)} />
            </div>
            <div>
              <label className="label">Department</label>
              <input className="input" value={form.department} onChange={(e) => update('department', e.target.value)} />
            </div>
            <div className="col-span-2">
              <button className="btn-primary w-full" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

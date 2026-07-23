'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api-client';
import { AppShell } from '@/components/AppShell';
import { useRequireRole } from '@/hooks/use-require-role';
import { toast } from 'sonner';
import { Loader2, Plus, X } from 'lucide-react';

export default function AdminUsers() {
  const user = useRequireRole('ADMIN');
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    email: '',
    password: '',
    role: 'MENTOR' as 'ADMIN' | 'MENTOR' | 'STUDENT',
    firstName: '',
    lastName: '',
    rollNumber: '',
    department: '',
  });

  const list = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get('/users')).data,
    enabled: !!user,
  });

  const create = useMutation({
    mutationFn: async () => (await api.post('/users', form)).data,
    onSuccess: () => {
      toast.success('User created');
      qc.invalidateQueries({ queryKey: ['users'] });
      setOpen(false);
      setForm({ email: '', password: '', role: 'MENTOR', firstName: '', lastName: '', rollNumber: '', department: '' });
    },
    onError: (e: any) => {
      const m = e.response?.data?.message;
      toast.error(Array.isArray(m) ? m.join(', ') : m || 'Failed');
    },
  });

  if (!user) return null;
  return (
    <AppShell role="ADMIN">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl">Users</h1>
          <p className="text-slate-400">Provision mentors, admins, and student accounts.</p>
        </div>
        <button className="btn-primary" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4" /> New User
        </button>
      </div>

      <div className="card mt-6 p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bg-800/60 text-slate-400 uppercase text-xs">
            <tr>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Role</th>
              <th className="text-left px-4 py-3">Roll / Dept</th>
              <th className="text-left px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {(list.data ?? []).map((u: any) => (
              <tr key={u.id} className="border-t border-line hover:bg-bg-800/40">
                <td className="px-4 py-3">{u.firstName} {u.lastName}</td>
                <td className="px-4 py-3 text-slate-400">{u.email}</td>
                <td className="px-4 py-3">
                  <span className="badge-muted">{u.role}</span>
                </td>
                <td className="px-4 py-3 text-slate-500">{u.rollNumber ?? '—'} / {u.department ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={u.isActive ? 'badge-active' : 'badge-danger'}>
                    {u.isActive ? 'Active' : 'Disabled'}
                  </span>
                </td>
              </tr>
            ))}
            {!list.data?.length && (
              <tr><td className="px-4 py-6 text-slate-500" colSpan={5}>No users yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 bg-black/60 grid place-items-center p-6">
          <div className="card w-full max-w-lg relative">
            <button className="absolute top-4 right-4 text-slate-400 hover:text-white" onClick={() => setOpen(false)}>
              <X className="w-4 h-4" />
            </button>
            <h2 className="font-display text-xl">Create User</h2>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div>
                <label className="label">Role</label>
                <select className="input" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as any }))}>
                  <option value="ADMIN">ADMIN</option>
                  <option value="MENTOR">MENTOR</option>
                  <option value="STUDENT">STUDENT</option>
                </select>
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="label">First name</label>
                <input className="input" value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
              </div>
              <div>
                <label className="label">Last name</label>
                <input className="input" value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
              </div>
              <div>
                <label className="label">Password</label>
                <input className="input" type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
              </div>
              <div>
                <label className="label">Roll (student)</label>
                <input className="input" value={form.rollNumber} onChange={(e) => setForm((f) => ({ ...f, rollNumber: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className="label">Department</label>
                <input className="input" value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} />
              </div>
            </div>
            <button
              className="btn-primary w-full mt-4"
              disabled={create.isPending}
              onClick={() => create.mutate()}
            >
              {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create User'}
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}

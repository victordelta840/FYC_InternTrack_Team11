'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { AppShell } from '@/components/AppShell';
import { QueryState } from '@/components/QueryState';
import { useRequireRole } from '@/hooks/use-require-role';
import { toast } from 'sonner';
import { Loader2, Plus, X, ShieldCheck, ShieldOff, ChevronRight } from 'lucide-react';

function fmtText(v: unknown, fallback = '—'): string {
  if (v === null || v === undefined) return fallback;
  const s = String(v).trim();
  return s.length ? s : fallback;
}

export default function AdminUsers() {
  const user = useRequireRole('ADMIN');
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'MENTOR' | 'STUDENT'>('ALL');
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

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) =>
      (await api.patch(`/users/${id}/status`, { active })).data,
    onMutate: async ({ id, active }) => {
      await qc.cancelQueries({ queryKey: ['users'] });
      const prev = qc.getQueryData<any[]>(['users']);
      qc.setQueryData<any[]>(['users'], (old) =>
        (old ?? []).map((u) => (u.id === id ? { ...u, isActive: active } : u)),
      );
      return { prev };
    },
    onError: (e: any, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['users'], ctx.prev);
      toast.error(e.response?.data?.message || 'Failed to update status');
    },
    onSuccess: (_data, vars) => {
      toast.success(vars.active ? 'User activated' : 'User deactivated');
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  if (!user) return null;

  const filtered = (list.data ?? []).filter((u: any) => roleFilter === 'ALL' || u.role === roleFilter);

  return (
    <AppShell role="ADMIN">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl">Users</h1>
          <p className="text-slate-400">Provision mentors, admins, and student accounts.</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="input w-40" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as any)}>
            <option value="ALL">All roles</option>
            <option value="ADMIN">Admin</option>
            <option value="MENTOR">Mentor</option>
            <option value="STUDENT">Student</option>
          </select>
          <button className="btn-primary" onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4" /> New User
          </button>
        </div>
      </div>

      <div className="card mt-6 p-0 overflow-hidden">
        <QueryState
          query={list}
          loadingLabel="Loading users…"
          emptyLabel="No users yet. Create the first account to get started."
          className="py-14 flex flex-col items-center gap-2 text-slate-400 text-sm"
        >
          {() => (
            <table className="w-full text-sm">
              <thead className="bg-bg-800/60 text-slate-400 uppercase text-xs">
                <tr>
                  <th className="text-left px-4 py-3">Name</th>
                  <th className="text-left px-4 py-3">Email</th>
                  <th className="text-left px-4 py-3">Role</th>
                  <th className="text-left px-4 py-3">Roll / Dept</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u: any) => {
                  const isSelf = u.id === user.id;
                  const isPending = toggleActive.isPending && toggleActive.variables?.id === u.id;
                  return (
                    <tr key={u.id} className="border-t border-line hover:bg-bg-800/40 group">
                      <td className="px-4 py-3">
                        <Link href={`/admin/users/${u.id}`} className="flex items-center gap-1.5 hover:text-neon-400 transition-colors">
                          {fmtText(u.firstName)} {fmtText(u.lastName, '')}
                          <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className="badge-muted">{u.role}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{fmtText(u.rollNumber)} / {fmtText(u.department)}</td>
                      <td className="px-4 py-3">
                        <span className={u.isActive ? 'badge-active' : 'badge-danger'}>
                          {u.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          className="text-[11px] font-mono px-2 py-1 rounded border border-line text-slate-300 hover:border-neon-500 hover:text-neon-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1"
                          disabled={isPending || isSelf}
                          title={isSelf ? 'You cannot deactivate your own account' : undefined}
                          onClick={() => toggleActive.mutate({ id: u.id, active: !u.isActive })}
                        >
                          {isPending ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : u.isActive ? (
                            <ShieldOff className="w-3 h-3" />
                          ) : (
                            <ShieldCheck className="w-3 h-3" />
                          )}
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!filtered.length && (
                  <tr><td className="px-4 py-6 text-slate-500" colSpan={6}>No users match this filter.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </QueryState>
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

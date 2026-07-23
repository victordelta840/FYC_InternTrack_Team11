'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api-client';
import { AppShell } from '@/components/AppShell';
import { useRequireRole } from '@/hooks/use-require-role';
import { toast } from 'sonner';
import { Loader2, Plus, X } from 'lucide-react';

const CATEGORIES = ['Attendance', 'Mentor', 'Facilities', 'Payment', 'Curriculum', 'Other'];

const STATUS_STYLES: Record<string, string> = {
  OPEN: 'badge-warn',
  IN_REVIEW: 'badge-active',
  ESCALATED: 'badge-danger',
  RESOLVED: 'badge-active',
  CLOSED: 'badge-muted',
};

export default function StudentComplaints() {
  const user = useRequireRole('STUDENT');
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ category: 'Attendance', subject: '', description: '' });

  const list = useQuery({
    queryKey: ['complaints'],
    queryFn: async () => (await api.get('/complaints')).data,
    enabled: !!user,
  });

  const create = useMutation({
    mutationFn: async () => (await api.post('/complaints', form)).data,
    onSuccess: () => {
      toast.success('Complaint filed. SLA: 48h.');
      qc.invalidateQueries({ queryKey: ['complaints'] });
      setOpen(false);
      setForm({ category: 'Attendance', subject: '', description: '' });
    },
    onError: (e: any) => {
      const m = e.response?.data?.message;
      toast.error(Array.isArray(m) ? m.join(', ') : m || 'Failed');
    },
  });

  if (!user) return null;

  return (
    <AppShell role="STUDENT">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl">Your Complaints</h1>
          <p className="text-slate-400">Track resolution progress with SLA guarantees.</p>
        </div>
        <button className="btn-primary" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4" /> New Complaint
        </button>
      </div>

      <div className="grid gap-4 mt-6">
        {(list.data ?? []).map((c: any) => (
          <div key={c.id} className="card">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-widest">{c.category}</div>
                <div className="font-display text-lg mt-1">{c.subject}</div>
                <div className="text-sm text-slate-400 mt-2">{c.description}</div>
              </div>
              <span className={STATUS_STYLES[c.status] ?? 'badge-muted'}>{c.status.replace('_', ' ')}</span>
            </div>
            <div className="text-xs text-slate-500 mt-4 flex items-center gap-4">
              <span>Filed: {new Date(c.createdAt).toLocaleString()}</span>
              {c.slaBreachAt && (
                <span>SLA breach: <span className={new Date(c.slaBreachAt) < new Date() ? 'text-red-400' : 'text-slate-400'}>{new Date(c.slaBreachAt).toLocaleString()}</span></span>
              )}
              {c.assignee && (
                <span>Assigned to: <span className="text-slate-300">{c.assignee.profile?.firstName} {c.assignee.profile?.lastName}</span></span>
              )}
            </div>
            {c.resolutionNotes && (
              <div className="mt-3 rounded-md border border-neon-500/30 bg-neon-500/5 px-3 py-2 text-sm">
                <span className="text-neon-400 font-mono text-xs">Resolution:</span> {c.resolutionNotes}
              </div>
            )}
          </div>
        ))}
        {!list.data?.length && (
          <div className="text-slate-500 text-center py-10">No complaints filed yet.</div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-40 bg-black/60 grid place-items-center p-6">
          <div className="card w-full max-w-lg relative">
            <button className="absolute top-4 right-4 text-slate-400 hover:text-white" onClick={() => setOpen(false)}>
              <X className="w-4 h-4" />
            </button>
            <h2 className="font-display text-xl">File Complaint</h2>
            <div className="space-y-3 mt-4">
              <div>
                <label className="label">Category</label>
                <select className="input" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Subject</label>
                <input className="input" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} />
              </div>
              <div>
                <label className="label">Description (min 10 chars)</label>
                <textarea className="input" rows={4} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <button className="btn-primary w-full" disabled={create.isPending} onClick={() => create.mutate()}>
                {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'File Complaint'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

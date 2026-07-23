'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { AppShell } from '@/components/AppShell';
import { useRequireRole } from '@/hooks/use-require-role';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const STATUS_STYLES: Record<string, string> = {
  OPEN: 'badge-warn',
  IN_REVIEW: 'badge-active',
  ESCALATED: 'badge-danger',
  RESOLVED: 'badge-active',
  CLOSED: 'badge-muted',
};

export default function MentorComplaints() {
  const user = useRequireRole('MENTOR');
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ['complaints'],
    queryFn: async () => (await api.get('/complaints')).data,
    enabled: !!user,
  });

  const transition = useMutation({
    mutationFn: async (input: { id: string; status: string; resolutionNotes?: string }) =>
      (await api.patch(`/complaints/${input.id}/status`, {
        status: input.status,
        resolutionNotes: input.resolutionNotes,
      })).data,
    onSuccess: () => {
      toast.success('Status updated');
      qc.invalidateQueries({ queryKey: ['complaints'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  async function handleTransition(id: string, next: string) {
    let notes: string | undefined;
    if (next === 'RESOLVED') {
      const v = window.prompt('Resolution notes (min 5 chars):');
      if (!v || v.trim().length < 5) return toast.error('Notes required');
      notes = v.trim();
    }
    transition.mutate({ id, status: next, resolutionNotes: notes });
  }

  if (!user) return null;

  return (
    <AppShell role="MENTOR">
      <h1 className="font-display text-3xl">Assigned Complaints</h1>
      <p className="text-slate-400">Resolve within 48h to avoid SLA escalation.</p>

      <div className="grid gap-4 mt-6">
        {(list.data ?? []).map((c: any) => {
          const overdue = c.slaBreachAt && new Date(c.slaBreachAt) < new Date() && c.status !== 'RESOLVED' && c.status !== 'CLOSED';
          return (
            <div key={c.id} className={`card ${overdue ? 'border-red-500/40' : ''}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="text-xs text-slate-500 uppercase tracking-widest">
                    {c.category} · {c.student?.profile?.firstName} {c.student?.profile?.lastName}
                  </div>
                  <div className="font-display text-lg mt-1">{c.subject}</div>
                  <div className="text-sm text-slate-400 mt-2">{c.description}</div>
                  <div className="text-xs text-slate-500 mt-3">
                    Filed: {new Date(c.createdAt).toLocaleString()} · SLA:{' '}
                    <span className={overdue ? 'text-red-400' : 'text-slate-400'}>{new Date(c.slaBreachAt).toLocaleString()}</span>
                  </div>
                  {c.resolutionNotes && (
                    <div className="mt-3 rounded-md border border-neon-500/30 bg-neon-500/5 px-3 py-2 text-sm">
                      <span className="text-neon-400 font-mono text-xs">Resolution:</span> {c.resolutionNotes}
                    </div>
                  )}
                </div>
                <span className={STATUS_STYLES[c.status] ?? 'badge-muted'}>{c.status.replace('_', ' ')}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {c.status === 'OPEN' && (
                  <button className="btn-ghost text-xs" onClick={() => handleTransition(c.id, 'IN_REVIEW')} disabled={transition.isPending}>Move to In Review</button>
                )}
                {(c.status === 'OPEN' || c.status === 'IN_REVIEW') && (
                  <button className="btn-primary text-xs" onClick={() => handleTransition(c.id, 'RESOLVED')} disabled={transition.isPending}>Resolve</button>
                )}
                {c.status === 'RESOLVED' && (
                  <button className="btn-ghost text-xs" onClick={() => handleTransition(c.id, 'CLOSED')} disabled={transition.isPending}>Close</button>
                )}
                {transition.isPending && <Loader2 className="w-4 h-4 animate-spin text-neon-400" />}
              </div>
            </div>
          );
        })}
        {!list.data?.length && (
          <div className="text-slate-500 text-center py-10">No complaints assigned to you.</div>
        )}
      </div>
    </AppShell>
  );
}

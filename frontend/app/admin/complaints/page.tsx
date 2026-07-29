'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { AppShell } from '@/components/AppShell';
import { useRequireRole } from '@/hooks/use-require-role';
import { toast } from 'sonner';
import { AlertTriangle, Clock, CheckCircle2, XCircle } from 'lucide-react';

const COLUMNS = [
  { key: 'OPEN', label: 'Open', color: 'text-amber-400', icon: <Clock className="w-4 h-4" /> },
  { key: 'IN_REVIEW', label: 'In Review', color: 'text-neon-400', icon: <Clock className="w-4 h-4" /> },
  { key: 'ESCALATED', label: 'Escalated', color: 'text-red-400', icon: <AlertTriangle className="w-4 h-4" /> },
  { key: 'RESOLVED', label: 'Resolved', color: 'text-emerald-400', icon: <CheckCircle2 className="w-4 h-4" /> },
  { key: 'CLOSED', label: 'Closed', color: 'text-slate-400', icon: <XCircle className="w-4 h-4" /> },
];

export default function AdminComplaintsBoard() {
  const user = useRequireRole('ADMIN');
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ['complaints'],
    queryFn: async () => (await api.get('/complaints')).data,
    enabled: !!user,
    refetchInterval: 30_000,
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

  async function move(id: string, next: string) {
    let notes: string | undefined;
    if (next === 'RESOLVED') {
      const v = window.prompt('Resolution notes (min 5 chars):');
      if (!v || v.trim().length < 5) return toast.error('Notes required');
      notes = v.trim();
    }
    transition.mutate({ id, status: next, resolutionNotes: notes });
  }

  if (!user) return null;
  const grouped: Record<string, any[]> = { OPEN: [], IN_REVIEW: [], ESCALATED: [], RESOLVED: [], CLOSED: [] };
  for (const c of list.data ?? []) grouped[c.status]?.push(c);

  return (
    <AppShell role="ADMIN">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl">Complaints Board</h1>
          <p className="text-slate-400">SLA cron runs every 10 min. Auto-escalates after 48h.</p>
        </div>
        <div className="text-xs text-slate-500 font-mono">Auto-refresh: 30s</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 mt-6">
        {COLUMNS.map((col) => (
          <div key={col.key} className="rounded-xl bg-bg-900/50 border border-line p-3 min-h-[500px]">
            <div className={`flex items-center gap-2 text-xs uppercase tracking-widest ${col.color} mb-3`}>
              {col.icon} {col.label} <span className="ml-auto text-slate-500">{grouped[col.key]?.length ?? 0}</span>
            </div>
            <div className="space-y-2">
              {grouped[col.key]?.map((c: any) => {
                const overdue = c.slaBreachAt && new Date(c.slaBreachAt) < new Date() && !['RESOLVED', 'CLOSED'].includes(c.status);
                return (
                  <div key={c.id} className={`rounded-lg bg-bg-800/60 border ${overdue ? 'border-red-500/40' : 'border-line'} p-3 text-sm`}>
                    <div className="text-[10px] uppercase tracking-widest text-slate-500">{c.category}</div>
                    <Link href={`/admin/complaints/${c.id}`} className="font-semibold mt-1 text-slate-100 line-clamp-2 block hover:text-neon-400 transition-colors">
                      {c.subject}
                    </Link>
                    <div className="text-xs text-slate-500 mt-1">
                      {c.student?.profile?.firstName} {c.student?.profile?.lastName}
                    </div>
                    {c.slaBreachAt && !['RESOLVED', 'CLOSED'].includes(c.status) && (
                      <div className={`text-[10px] font-mono mt-2 ${overdue ? 'text-red-400' : 'text-slate-500'}`}>
                        SLA {overdue ? 'BREACHED' : 'due'}: {new Date(c.slaBreachAt).toLocaleString()}
                      </div>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {c.status === 'OPEN' && <MiniBtn onClick={() => move(c.id, 'IN_REVIEW')}>→ Review</MiniBtn>}
                      {['OPEN', 'IN_REVIEW', 'ESCALATED'].includes(c.status) && (
                        <MiniBtn onClick={() => move(c.id, 'RESOLVED')}>→ Resolve</MiniBtn>
                      )}
                      {c.status === 'RESOLVED' && <MiniBtn onClick={() => move(c.id, 'CLOSED')}>→ Close</MiniBtn>}
                    </div>
                  </div>
                );
              })}
              {!grouped[col.key]?.length && (
                <div className="text-xs text-slate-600 text-center py-6">Empty</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}

function MiniBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-[10px] font-mono px-2 py-1 rounded border border-line text-slate-300 hover:border-neon-500 hover:text-neon-400 transition-colors"
    >
      {children}
    </button>
  );
}

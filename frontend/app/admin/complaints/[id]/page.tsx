'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { AppShell } from '@/components/AppShell';
import { QueryState } from '@/components/QueryState';
import { useRequireRole } from '@/hooks/use-require-role';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Clock, AlertTriangle, UserCog } from 'lucide-react';

// Mirrors the backend TRANSITIONS map in complaints.service.ts — kept here purely
// to decide which action buttons to show; the backend is still the source of truth
// and rejects illegal transitions regardless of what the UI offers.
const TRANSITIONS: Record<string, string[]> = {
  OPEN: ['IN_REVIEW', 'ESCALATED', 'RESOLVED'],
  IN_REVIEW: ['ESCALATED', 'RESOLVED'],
  ESCALATED: ['RESOLVED'],
  RESOLVED: ['CLOSED', 'IN_REVIEW'],
  CLOSED: [],
};

const STATUS_LABEL: Record<string, string> = {
  OPEN: 'Open',
  IN_REVIEW: 'In Review',
  ESCALATED: 'Escalated',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

function fmtText(v: unknown, fallback = 'N/A'): string {
  if (v === null || v === undefined) return fallback;
  const s = String(v).trim();
  return s.length ? s : fallback;
}

function fmtDate(v: unknown): string {
  if (!v) return 'N/A';
  const d = new Date(v as string);
  return isNaN(d.getTime()) ? 'N/A' : d.toLocaleString();
}

function personName(p: any): string {
  const name = `${p?.profile?.firstName ?? ''} ${p?.profile?.lastName ?? ''}`.trim();
  return name || p?.email || 'Unknown';
}

export default function AdminComplaintDetail() {
  const currentUser = useRequireRole('ADMIN');
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const complaintId = params.id;

  const [assigneeId, setAssigneeId] = useState('');

  const detail = useQuery({
    queryKey: ['complaint', complaintId],
    queryFn: async () => (await api.get(`/complaints/${complaintId}`)).data,
    enabled: !!currentUser && !!complaintId,
  });

  const staff = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get('/users')).data,
    enabled: !!currentUser,
  });

  const transition = useMutation({
    mutationFn: async (input: { status: string; resolutionNotes?: string }) =>
      (await api.patch(`/complaints/${complaintId}/status`, input)).data,
    onSuccess: (data) => {
      toast.success('Status updated');
      qc.setQueryData(['complaint', complaintId], (old: any) => ({ ...old, ...data }));
      qc.invalidateQueries({ queryKey: ['complaints'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to update status'),
  });

  const assign = useMutation({
    mutationFn: async (id: string) => (await api.patch(`/complaints/${complaintId}/assign`, { assigneeId: id })).data,
    onSuccess: (data) => {
      toast.success('Complaint reassigned');
      qc.setQueryData(['complaint', complaintId], (old: any) => ({ ...old, ...data }));
      qc.invalidateQueries({ queryKey: ['complaints'] });
      setAssigneeId('');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to reassign'),
  });

  function move(next: string) {
    let notes: string | undefined;
    if (next === 'RESOLVED') {
      const v = window.prompt('Resolution notes (min 5 chars):');
      if (!v || v.trim().length < 5) return toast.error('Resolution notes are required');
      notes = v.trim();
    }
    transition.mutate({ status: next, resolutionNotes: notes });
  }

  if (!currentUser) return null;

  const staffOptions = (staff.data ?? []).filter((u: any) => u.role === 'MENTOR' || u.role === 'ADMIN');

  return (
    <AppShell role="ADMIN">
      <button className="btn-ghost mb-4" onClick={() => router.push('/admin/complaints')}>
        <ArrowLeft className="w-4 h-4" /> Back to Complaints Board
      </button>

      <QueryState query={detail} loadingLabel="Loading complaint…" emptyLabel="This complaint could not be found.">
        {(c: any) => {
          const overdue = c.slaBreachAt && new Date(c.slaBreachAt) < new Date() && !['RESOLVED', 'CLOSED'].includes(c.status);
          const allowed = TRANSITIONS[c.status] ?? [];
          return (
            <>
              {/* ---------- header ---------- */}
              <div className="card flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-slate-500">{fmtText(c.category)}</div>
                  <h1 className="font-display text-2xl mt-1">{fmtText(c.subject)}</h1>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="badge-muted">{STATUS_LABEL[c.status] ?? c.status}</span>
                    {overdue && (
                      <span className="badge-danger flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> SLA Breached
                      </span>
                    )}
                  </div>
                </div>
                {allowed.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {allowed.map((s) => (
                      <button
                        key={s}
                        className="btn-ghost text-xs"
                        disabled={transition.isPending}
                        onClick={() => move(s)}
                      >
                        {transition.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : `→ ${STATUS_LABEL[s] ?? s}`}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid md:grid-cols-3 gap-4 mt-6">
                {/* ---------- description ---------- */}
                <div className="card md:col-span-2">
                  <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Description</div>
                  <p className="text-sm text-slate-300 whitespace-pre-wrap">{fmtText(c.description)}</p>

                  {c.resolutionNotes && (
                    <div className="mt-4 pt-4 border-t border-line">
                      <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Resolution Notes</div>
                      <p className="text-sm text-slate-300 whitespace-pre-wrap">{c.resolutionNotes}</p>
                    </div>
                  )}
                </div>

                {/* ---------- sidebar ---------- */}
                <div className="flex flex-col gap-4">
                  <div className="card">
                    <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Filed By</div>
                    {c.student ? (
                      <Link href={`/admin/users/${c.student.id}`} className="text-sm text-slate-200 hover:text-neon-400 transition-colors">
                        {personName(c.student)}
                      </Link>
                    ) : (
                      <div className="text-sm text-slate-500">N/A</div>
                    )}
                    <div className="text-xs text-slate-500 mt-1">{fmtText(c.student?.email)}</div>
                  </div>

                  <div className="card">
                    <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5">
                      <UserCog className="w-3.5 h-3.5" /> Assigned To
                    </div>
                    {c.assignee ? (
                      <Link href={`/admin/users/${c.assignee.id}`} className="text-sm text-slate-200 hover:text-neon-400 transition-colors">
                        {personName(c.assignee)}
                      </Link>
                    ) : (
                      <div className="text-sm text-slate-500">Unassigned</div>
                    )}

                    <div className="flex items-center gap-2 mt-3">
                      <select className="input" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                        <option value="">Reassign to…</option>
                        {staffOptions.map((u: any) => (
                          <option key={u.id} value={u.id}>{u.firstName} {u.lastName} · {u.role}</option>
                        ))}
                      </select>
                      <button
                        className="btn-ghost text-xs shrink-0"
                        disabled={!assigneeId || assign.isPending}
                        onClick={() => assign.mutate(assigneeId)}
                      >
                        {assign.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Assign'}
                      </button>
                    </div>
                  </div>

                  <div className="card">
                    <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> Timeline
                    </div>
                    <div className="text-xs text-slate-400 space-y-1.5">
                      <div>Created: {fmtDate(c.createdAt)}</div>
                      <div>Last activity: {fmtDate(c.lastActivityAt)}</div>
                      <div className={overdue ? 'text-red-400' : ''}>SLA due: {fmtDate(c.slaBreachAt)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          );
        }}
      </QueryState>
    </AppShell>
  );
}

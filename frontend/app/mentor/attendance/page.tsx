'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { api } from '@/lib/api-client';
import { AppShell } from '@/components/AppShell';
import { useRequireRole } from '@/hooks/use-require-role';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

type Status = 'PRESENT' | 'ABSENT' | 'HALF_DAY';

export default function MentorAttendance() {
  const user = useRequireRole('MENTOR');
  const qc = useQueryClient();
  const [internshipId, setInternshipId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const internships = useQuery({
    queryKey: ['internships'],
    queryFn: async () => (await api.get('/internships')).data,
    enabled: !!user,
  });

  const roster = useQuery({
    queryKey: ['roster', internshipId],
    queryFn: async () => (await api.get(`/attendance/roster/${internshipId}`)).data,
    enabled: !!internshipId,
  });

  const existing = useQuery({
    queryKey: ['attendance-day', internshipId, date],
    queryFn: async () => (await api.get(`/attendance/internship/${internshipId}`)).data,
    enabled: !!internshipId,
  });

  const dayMap = useMemo(() => {
    const m = new Map<string, { id: string; status: Status }>();
    (existing.data ?? []).forEach((r: any) => {
      if (r.date === date) m.set(r.studentId, { id: r.id, status: r.status });
    });
    return m;
  }, [existing.data, date]);

  const mark = useMutation({
    mutationFn: async (input: { studentId: string; status: Status }) =>
      (await api.post('/attendance/mark', {
        internshipId,
        studentId: input.studentId,
        date,
        status: input.status,
      })).data,
    onSuccess: () => {
      toast.success('Attendance saved');
      qc.invalidateQueries({ queryKey: ['attendance-day'] });
      qc.invalidateQueries({ queryKey: ['roster'] });
    },
    onError: (e: any) => {
      const c = e.response?.data?.code;
      if (c === 'ATTENDANCE_EXISTS') {
        toast.error('Already marked — use edit with justification.');
      } else {
        toast.error(e.response?.data?.message || 'Failed');
      }
    },
  });

  const edit = useMutation({
    mutationFn: async (input: { id: string; status: Status; justification: string }) =>
      (await api.patch(`/attendance/${input.id}`, {
        status: input.status,
        justification: input.justification,
      })).data,
    onSuccess: () => {
      toast.success('Attendance edited (lineage recorded)');
      qc.invalidateQueries({ queryKey: ['attendance-day'] });
      qc.invalidateQueries({ queryKey: ['roster'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  async function set(studentId: string, status: Status) {
    const current = dayMap.get(studentId);
    if (!current) {
      mark.mutate({ studentId, status });
      return;
    }
    if (current.status === status) return;
    const j = window.prompt('Reason for editing attendance (min 5 chars):');
    if (!j || j.trim().length < 5) {
      toast.error('Justification required');
      return;
    }
    edit.mutate({ id: current.id, status, justification: j });
  }

  if (!user) return null;

  return (
    <AppShell role="MENTOR">
      <h1 className="font-display text-3xl">Daily Attendance</h1>
      <p className="text-slate-400">Mark PRESENT / HALF_DAY / ABSENT per student per day.</p>

      <div className="card mt-6 grid md:grid-cols-3 gap-3">
        <div>
          <label className="label">Internship</label>
          <select className="input" value={internshipId} onChange={(e) => setInternshipId(e.target.value)}>
            <option value="">— pick one —</option>
            {(internships.data ?? []).map((i: any) => (
              <option key={i.id} value={i.id}>{i.title} · {i.organization}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Date</label>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      {internshipId && roster.data && (
        <div className="card mt-6 p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bg-800/60 text-slate-400 uppercase text-xs">
              <tr>
                <th className="text-left px-4 py-3">Student</th>
                <th className="text-left px-4 py-3">Roll</th>
                <th className="text-center px-4 py-3">Status ({date})</th>
                <th className="text-right px-4 py-3">Overall %</th>
              </tr>
            </thead>
            <tbody>
              {roster.data.roster.map((r: any) => {
                const cur = dayMap.get(r.studentId);
                return (
                  <tr key={r.studentId} className="border-t border-line">
                    <td className="px-4 py-3">{r.firstName} {r.lastName}</td>
                    <td className="px-4 py-3 text-slate-500">{r.rollNumber ?? '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex gap-1">
                        {(['PRESENT', 'HALF_DAY', 'ABSENT'] as Status[]).map((s) => (
                          <button
                            key={s}
                            className={
                              cur?.status === s
                                ? 'btn-primary text-xs px-3 py-1'
                                : 'btn-ghost text-xs px-3 py-1'
                            }
                            onClick={() => set(r.studentId, s)}
                            disabled={mark.isPending || edit.isPending}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      <span className={parseFloat(r.percentage) >= 90 ? 'text-neon-400' : 'text-amber-400'}>
                        {r.percentage}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {(mark.isPending || edit.isPending) && (
            <div className="p-3 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" /> Saving…
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}

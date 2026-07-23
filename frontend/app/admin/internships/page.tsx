// frontend/app/admin/internships/page.tsx
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api-client';
import { AppShell } from '@/components/AppShell';
import { useRequireRole } from '@/hooks/use-require-role';
import { toast } from 'sonner';
import { Loader2, Plus, X, ScrollText } from 'lucide-react';

function studentDisplayName(student: any): string {
  const firstName = student?.profile?.firstName ?? student?.firstName ?? '';
  const lastName = student?.profile?.lastName ?? student?.lastName ?? '';
  const full = `${firstName} ${lastName}`.trim();
  return full || student?.email || 'Unknown student';
}

function studentDisplayId(student: any): string {
  return student?.profile?.rollNumber ?? student?.rollNumber ?? student?.email ?? '';
}

export default function AdminInternships() {
  const user = useRequireRole('ADMIN');
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    organization: '',
    description: '',
    startDate: '',
    endDate: '',
    totalDays: 40,
    mentorIds: [] as string[],
    studentIds: [] as string[],
  });

  const list = useQuery({
    queryKey: ['internships'],
    queryFn: async () => (await api.get('/internships')).data,
    enabled: !!user,
  });
  const users = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get('/users')).data,
    enabled: !!user,
  });

  const create = useMutation({
    mutationFn: async () => (await api.post('/internships', form)).data,
    onSuccess: () => {
      toast.success('Internship created');
      qc.invalidateQueries({ queryKey: ['internships'] });
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const issueCert = useMutation({
    mutationFn: async ({ studentId, internshipId }: { studentId: string; internshipId: string }) => {
      const pre = await api.get('/certificates/precheck', {
        params: { studentId, internshipId },
      });
      if (!pre.data.eligible) {
        const err: any = new Error('ATTENDANCE_BELOW_THRESHOLD');
        err.ineligible = true;
        err.stats = pre.data;
        throw err;
      }
      return (await api.post('/certificates/issue', { studentId, internshipId })).data;
    },
    onSuccess: () => {
      toast.success('Certificate issued');
      // Certificates page (queryKey: ['certs']) will refetch next time it's viewed
      // (or immediately, if it's mounted elsewhere in the tree).
      qc.invalidateQueries({ queryKey: ['certs'] });
    },
    onError: (e: any) => {
      if (e.ineligible) {
        toast.error(
          `Attendance does not meet the required threshold for certificate issuance. (Current: ${e.stats.percentage}%, Required: ${e.stats.threshold}%)`,
        );
      } else {
        toast.error(e.response?.data?.message || 'Failed to issue certificate');
      }
    },
  });

  if (!user) return null;
  const mentors = (users.data ?? []).filter((u: any) => u.role === 'MENTOR');
  const students = (users.data ?? []).filter((u: any) => u.role === 'STUDENT');

  return (
    <AppShell role="ADMIN">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl">Internships</h1>
          <p className="text-slate-400">Assign mentors and enroll students.</p>
        </div>
        <button className="btn-primary" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4" /> New Internship
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        {(list.data ?? []).map((i: any) => (
          <div key={i.id} className="card">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-display text-lg">{i.title}</div>
                <div className="text-sm text-slate-400">{i.organization}</div>
              </div>
              <span className={i.status === 'ACTIVE' ? 'badge-active' : 'badge-muted'}>{i.status}</span>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-4 text-center">
              <Stat label="Days" value={i.totalDays} />
              <Stat label="Mentors" value={i.mentors?.length ?? 0} />
              <Stat label="Students" value={i.students?.length ?? 0} />
            </div>
            <div className="mt-3 text-xs text-slate-500">{i.startDate} → {i.endDate}</div>

            {!!i.students?.length && (
              <div className="mt-4 pt-4 border-t border-line">
                <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">
                  Enrolled Students
                </div>
                <div className="space-y-2">
                  {i.students.map((entry: any) => {
                    // i.students[] is the InternshipStudent join relation, not a User.
                    // The actual user lives at entry.student.
                    const student = entry.student ?? entry;
                    const isThisPending =
                      issueCert.isPending &&
                      issueCert.variables?.studentId === student.id &&
                      issueCert.variables?.internshipId === i.id;
                    return (
                      <div key={student.id} className="flex items-center justify-between gap-2 text-sm">
                        <span className="truncate">
                          {studentDisplayName(student)}{' '}
                          <span className="text-slate-500">· {studentDisplayId(student)}</span>
                        </span>
                        <button
                          className="btn-ghost text-xs shrink-0"
                          disabled={isThisPending}
                          onClick={() => issueCert.mutate({ studentId: student.id, internshipId: i.id })}
                        >
                          {isThisPending ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <>
                              <ScrollText className="w-3 h-3" /> Issue Certificate
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
        {!list.data?.length && (
          <div className="text-slate-500 col-span-2 text-center py-10">No internships yet.</div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-40 bg-black/60 grid place-items-center p-6">
          <div className="card w-full max-w-xl relative">
            <button className="absolute top-4 right-4 text-slate-400 hover:text-white" onClick={() => setOpen(false)}>
              <X className="w-4 h-4" />
            </button>
            <h2 className="font-display text-xl">New Internship</h2>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="col-span-2">
                <label className="label">Title</label>
                <input className="input" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className="label">Organization</label>
                <input className="input" value={form.organization} onChange={(e) => setForm((f) => ({ ...f, organization: e.target.value }))} />
              </div>
              <div>
                <label className="label">Start Date</label>
                <input className="input" type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div>
                <label className="label">End Date</label>
                <input className="input" type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
              </div>
              <div>
                <label className="label">Total Days</label>
                <input className="input" type="number" min={1} value={form.totalDays} onChange={(e) => setForm((f) => ({ ...f, totalDays: parseInt(e.target.value) }))} />
              </div>
              <div className="col-span-2">
                <label className="label">Description</label>
                <textarea className="input" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className="label">Mentors</label>
                <select multiple className="input h-24" value={form.mentorIds} onChange={(e) => setForm((f) => ({ ...f, mentorIds: Array.from(e.target.selectedOptions).map(o => o.value) }))}>
                  {mentors.map((m: any) => (
                    <option key={m.id} value={m.id}>{m.firstName} {m.lastName} · {m.email}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="label">Students</label>
                <select multiple className="input h-32" value={form.studentIds} onChange={(e) => setForm((f) => ({ ...f, studentIds: Array.from(e.target.selectedOptions).map(o => o.value) }))}>
                  {students.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.firstName} {s.lastName} · {s.rollNumber ?? s.email}</option>
                  ))}
                </select>
              </div>
            </div>
            <button className="btn-primary w-full mt-4" disabled={create.isPending} onClick={() => create.mutate()}>
              {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-bg-800/60 border border-line px-3 py-2">
      <div className="text-xl font-display text-neon-400">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-slate-500">{label}</div>
    </div>
  );
}
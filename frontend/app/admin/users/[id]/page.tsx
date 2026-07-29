'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { AppShell } from '@/components/AppShell';
import { QueryState } from '@/components/QueryState';
import { useRequireRole } from '@/hooks/use-require-role';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Loader2,
  Mail,
  Phone,
  ShieldCheck,
  ShieldOff,
  BookMarked,
  ClipboardList,
  CalendarClock,
} from 'lucide-react';

// ---------- safe formatting ----------

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function fmtText(v: unknown, fallback = 'N/A'): string {
  if (v === null || v === undefined) return fallback;
  const s = String(v).trim();
  return s.length ? s : fallback;
}

function fmtPercent(v: unknown): string {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return isFiniteNumber(n) ? `${n}%` : 'N/A';
}

function fmtDate(v: unknown): string {
  if (!v) return 'N/A';
  const d = new Date(v as string);
  return isNaN(d.getTime()) ? 'N/A' : d.toLocaleString();
}

interface AdminUser {
  id: string;
  email: string;
  role: 'ADMIN' | 'MENTOR' | 'STUDENT';
  isActive: boolean;
  lastLoginAt: string | null;
  firstName: string;
  lastName: string;
  rollNumber: string | null;
  department: string | null;
  phone: string | null;
  createdAt: string;
}

export default function AdminUserDetail() {
  const currentUser = useRequireRole('ADMIN');
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const userId = params.id;

  const [internshipFilter, setInternshipFilter] = useState<string>('');

  const detail = useQuery<AdminUser>({
    queryKey: ['admin-user', userId],
    queryFn: async () => (await api.get(`/users/${userId}`)).data,
    enabled: !!currentUser && !!userId,
  });

  // The backend doesn't expose a filtered "internships for this user" endpoint
  // for admins (only self-scoped listForUser). Reuse the existing /internships
  // list and filter client-side rather than adding a duplicate API.
  const internships = useQuery({
    queryKey: ['internships'],
    queryFn: async () => (await api.get('/internships')).data,
    enabled: !!currentUser && !!detail.data,
  });

  const toggleActive = useMutation({
    mutationFn: async (active: boolean) => (await api.patch(`/users/${userId}/status`, { active })).data,
    onSuccess: (data) => {
      toast.success(data.isActive ? 'User activated' : 'User deactivated');
      qc.setQueryData(['admin-user', userId], data);
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to update status'),
  });

  const relatedInternships = useMemo(() => {
    const list: any[] = internships.data ?? [];
    const u = detail.data;
    if (!u) return [];
    if (u.role === 'STUDENT') {
      return list.filter((i) => (i.students ?? []).some((e: any) => (e.student?.id ?? e.studentId) === u.id));
    }
    if (u.role === 'MENTOR') {
      return list.filter((i) => (i.mentors ?? []).some((e: any) => (e.mentor?.id ?? e.mentorId) === u.id));
    }
    return [];
  }, [internships.data, detail.data]);

  const selectedInternshipId = internshipFilter || relatedInternships[0]?.id || '';

  const stats = useQuery({
    queryKey: ['admin-user-attendance-stats', userId, selectedInternshipId],
    queryFn: async () =>
      (await api.get(`/attendance/student/${userId}/stats`, { params: { internshipId: selectedInternshipId } })).data,
    enabled: !!currentUser && detail.data?.role === 'STUDENT' && !!selectedInternshipId,
  });

  const history = useQuery({
    queryKey: ['admin-user-attendance-history', userId, selectedInternshipId],
    queryFn: async () =>
      (await api.get(`/attendance/student/${userId}`, { params: { internshipId: selectedInternshipId } })).data,
    enabled: !!currentUser && detail.data?.role === 'STUDENT' && !!selectedInternshipId,
  });

  if (!currentUser) return null;

  return (
    <AppShell role="ADMIN">
      <button className="btn-ghost mb-4" onClick={() => router.push('/admin/users')}>
        <ArrowLeft className="w-4 h-4" /> Back to Users
      </button>

      <QueryState
        query={detail}
        loadingLabel="Loading user…"
        emptyLabel="This user could not be found."
      >
        {(u) => (
          <>
            {/* ---------- header ---------- */}
            <div className="card flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-neon-500 to-cyan-glow grid place-items-center font-display text-xl text-bg-950 shrink-0">
                  {(u.firstName?.[0] ?? u.email[0]).toUpperCase()}
                </div>
                <div>
                  <h1 className="font-display text-2xl">
                    {fmtText(u.firstName)} {fmtText(u.lastName, '')}
                  </h1>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="badge-muted">{u.role}</span>
                    <span className={u.isActive ? 'badge-active' : 'badge-danger'}>
                      {u.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                className={u.isActive ? 'btn-danger' : 'btn-primary'}
                disabled={toggleActive.isPending || u.id === currentUser.id}
                title={u.id === currentUser.id ? 'You cannot deactivate your own account' : undefined}
                onClick={() => toggleActive.mutate(!u.isActive)}
              >
                {toggleActive.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : u.isActive ? (
                  <ShieldOff className="w-4 h-4" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}
                {u.isActive ? 'Deactivate User' : 'Activate User'}
              </button>
            </div>

            {/* ---------- profile grid ---------- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="card">
                <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Contact</div>
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Mail className="w-4 h-4 text-slate-500 shrink-0" /> {fmtText(u.email)}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-300 mt-2">
                  <Phone className="w-4 h-4 text-slate-500 shrink-0" /> {fmtText(u.phone)}
                </div>
              </div>
              <div className="card">
                <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Academic / Org</div>
                <div className="text-sm text-slate-300">Roll No: {fmtText(u.rollNumber)}</div>
                <div className="text-sm text-slate-300 mt-2">Department: {fmtText(u.department)}</div>
              </div>
              <div className="card">
                <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Account</div>
                <div className="text-sm text-slate-300">Created: {fmtDate(u.createdAt)}</div>
                <div className="text-sm text-slate-300 mt-2">Last login: {fmtDate(u.lastLoginAt)}</div>
              </div>
            </div>

            {/* ---------- internships ---------- */}
            {(u.role === 'STUDENT' || u.role === 'MENTOR') && (
              <div className="card mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-lg flex items-center gap-2">
                    <BookMarked className="w-4 h-4 text-neon-400" /> Internships
                  </h2>
                  {relatedInternships.length > 1 && u.role === 'STUDENT' && (
                    <select
                      className="input w-56"
                      value={selectedInternshipId}
                      onChange={(e) => setInternshipFilter(e.target.value)}
                    >
                      {relatedInternships.map((i: any) => (
                        <option key={i.id} value={i.id}>{i.title}</option>
                      ))}
                    </select>
                  )}
                </div>

                {internships.isLoading ? (
                  <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading internships…
                  </div>
                ) : !relatedInternships.length ? (
                  <div className="text-slate-500 text-sm text-center py-6">
                    Not enrolled in / assigned to any internships yet.
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-3">
                    {relatedInternships.map((i: any) => (
                      <Link
                        key={i.id}
                        href={`/admin/internships/${i.id}`}
                        className="rounded-lg border border-line px-3 py-3 hover:border-neon-500/40 hover:bg-neon-500/5 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm text-slate-200">{i.title}</span>
                          <span className={i.status === 'ACTIVE' ? 'badge-active' : 'badge-muted'}>{i.status}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">{i.organization}</div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ---------- attendance history (students only) ---------- */}
            {u.role === 'STUDENT' && (
              <div className="card mt-6">
                <h2 className="font-display text-lg flex items-center gap-2 mb-4">
                  <ClipboardList className="w-4 h-4 text-neon-400" /> Attendance History
                </h2>

                {!selectedInternshipId ? (
                  <div className="text-slate-500 text-sm text-center py-6">
                    No internship enrollment to show attendance for.
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
                      <MiniStat label="Attendance" value={fmtPercent(stats.data?.percentage)} highlight />
                      <MiniStat label="Present" value={fmtText(stats.data?.present)} />
                      <MiniStat label="Absent" value={fmtText(stats.data?.absent)} />
                      <MiniStat label="Half Day" value={fmtText(stats.data?.halfDay)} />
                      <MiniStat label="Total Days" value={fmtText(stats.data?.totalDays)} />
                    </div>

                    {history.isLoading ? (
                      <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
                        <Loader2 className="w-4 h-4 animate-spin" /> Loading history…
                      </div>
                    ) : !history.data?.length ? (
                      <div className="flex flex-col items-center text-center py-8">
                        <CalendarClock className="w-6 h-6 text-slate-500 mb-2" />
                        <div className="text-slate-400 text-sm">No attendance records for this internship yet.</div>
                      </div>
                    ) : (
                      <div className="max-h-80 overflow-y-auto rounded-lg border border-line">
                        <table className="w-full text-sm">
                          <thead className="bg-bg-800/60 text-slate-400 uppercase text-xs sticky top-0">
                            <tr>
                              <th className="text-left px-4 py-2">Date</th>
                              <th className="text-left px-4 py-2">Status</th>
                              <th className="text-left px-4 py-2">Notes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {history.data.map((r: any) => (
                              <tr key={r.id} className="border-t border-line">
                                <td className="px-4 py-2 text-slate-300">{fmtText(r.date)}</td>
                                <td className="px-4 py-2">
                                  <span
                                    className={
                                      r.status === 'PRESENT'
                                        ? 'badge-active'
                                        : r.status === 'ABSENT'
                                        ? 'badge-danger'
                                        : 'badge-warn'
                                    }
                                  >
                                    {fmtText(r.status)}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-slate-500">{fmtText(r.notes, '—')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </QueryState>
    </AppShell>
  );
}

function MiniStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-lg bg-bg-800/60 border border-line px-3 py-2 text-center">
      <div className={`text-lg font-display ${highlight ? 'text-neon-400' : 'text-slate-200'}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-slate-500">{label}</div>
    </div>
  );
}

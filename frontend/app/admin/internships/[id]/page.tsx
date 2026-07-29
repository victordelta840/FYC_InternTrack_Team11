'use client';

import { useEffect, useRef, useState } from 'react';
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
  ScrollText,
  Users,
  GraduationCap,
  CalendarRange,
  UserPlus,
  UserMinus,
} from 'lucide-react';

const STATUSES = ['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED'] as const;

function fmtText(v: unknown, fallback = 'N/A'): string {
  if (v === null || v === undefined) return fallback;
  const s = String(v).trim();
  return s.length ? s : fallback;
}

function fmtPercent(v: unknown): string {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? `${n}%` : 'N/A';
}

function personName(entry: any, nestedKey: 'mentor' | 'student'): string {
  const p = entry?.[nestedKey] ?? entry;
  const name = `${p?.profile?.firstName ?? p?.firstName ?? ''} ${p?.profile?.lastName ?? p?.lastName ?? ''}`.trim();
  return name || p?.email || `Unknown ${nestedKey}`;
}

function personSubLabel(entry: any, nestedKey: 'mentor' | 'student'): string {
  const p = entry?.[nestedKey] ?? entry;
  return p?.profile?.rollNumber ?? p?.rollNumber ?? p?.email ?? '';
}

/**
 * Searchable multi-select used for both mentor and student assignment.
 * `available` should already exclude anyone currently assigned, which is
 * what keeps duplicate assignments from being selectable in the first
 * place (the backend also rejects duplicates defensively).
 */
function AssignPanel({
  label,
  available,
  isAssigning,
  onAssign,
}: {
  label: string;
  available: any[];
  isAssigning: boolean;
  onAssign: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on outside click and on Escape. Listening on the document (rather
  // than a full-screen overlay div) keeps this a true floating popover that
  // never occupies space in the page's layout flow.
  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  // Reset transient search/selection state whenever the popover closes,
  // regardless of how it closed (outside click, Escape, or a confirmed assign).
  useEffect(() => {
    if (!open) {
      setQuery('');
      setSelected([]);
    }
  }, [open]);

  const filtered = available.filter((u: any) => {
    const haystack = `${u.firstName ?? ''} ${u.lastName ?? ''} ${u.email ?? ''} ${u.rollNumber ?? ''}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  });

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function confirm() {
    if (!selected.length) return;
    onAssign(selected);
    setOpen(false);
  }

  return (
    <div className="relative" ref={rootRef}>
      <button className="btn-ghost text-xs" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <UserPlus className="w-3.5 h-3.5" /> Assign {label}
      </button>

      {open && (
        <div className="card absolute right-0 top-full z-30 mt-2 w-80 shadow-2xl">
          <input
            autoFocus
            className="input"
            placeholder={`Search ${label.toLowerCase()}s…`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
            {filtered.length === 0 && (
              <div className="py-3 text-center text-xs text-slate-500">
                {available.length === 0 ? `No unassigned ${label.toLowerCase()}s left.` : 'No matches.'}
              </div>
            )}
            {filtered.map((u: any) => (
              <label
                key={u.id}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-bg-800/60"
              >
                <input
                  type="checkbox"
                  className="accent-neon-500"
                  checked={selected.includes(u.id)}
                  onChange={() => toggle(u.id)}
                />
                <span className="truncate">
                  {u.firstName} {u.lastName} <span className="text-slate-500">· {u.rollNumber ?? u.email}</span>
                </span>
              </label>
            ))}
          </div>
          <button
            className="btn-primary mt-3 w-full"
            disabled={!selected.length || isAssigning}
            onClick={confirm}
          >
            {isAssigning ? <Loader2 className="w-4 h-4 animate-spin" /> : `Assign${selected.length ? ` (${selected.length})` : ''}`}
          </button>
        </div>
      )}
    </div>
  );
}

export default function AdminInternshipDetail() {
  const currentUser = useRequireRole('ADMIN');
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const internshipId = params.id;

  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  const detail = useQuery({
    queryKey: ['internship', internshipId],
    queryFn: async () => (await api.get(`/internships/${internshipId}`)).data,
    enabled: !!currentUser && !!internshipId,
  });

  const roster = useQuery({
    queryKey: ['internship-roster', internshipId],
    queryFn: async () => (await api.get(`/attendance/roster/${internshipId}`)).data,
    enabled: !!currentUser && !!internshipId,
  });

  const users = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get('/users')).data,
    enabled: !!currentUser,
  });

  function invalidateInternship() {
    qc.invalidateQueries({ queryKey: ['internship', internshipId] });
    qc.invalidateQueries({ queryKey: ['internships'] });
    qc.invalidateQueries({ queryKey: ['internship-roster', internshipId] });
  }

  const updateStatus = useMutation({
    mutationFn: async (status: string) => (await api.patch(`/internships/${internshipId}/status`, { status })).data,
    onSuccess: (data) => {
      toast.success(`Status changed to ${data.status}`);
      qc.setQueryData(['internship', internshipId], data);
      qc.invalidateQueries({ queryKey: ['internships'] });
      setPendingStatus(null);
    },
    onError: (e: any) => {
      toast.error(e.response?.data?.message || 'Failed to update status');
      setPendingStatus(null);
    },
  });

  const assignMentors = useMutation({
    mutationFn: async (mentorIds: string[]) => {
      await Promise.all(mentorIds.map((mentorId) => api.post(`/internships/${internshipId}/mentors`, { mentorId })));
    },
    onSuccess: () => {
      toast.success('Mentor(s) assigned');
      invalidateInternship();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to assign mentor'),
  });

  const removeMentor = useMutation({
    mutationFn: async (mentorId: string) => {
      await api.delete(`/internships/${internshipId}/mentors/${mentorId}`);
    },
    onSuccess: () => {
      toast.success('Mentor removed');
      invalidateInternship();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to remove mentor'),
  });

  const assignStudents = useMutation({
    mutationFn: async (studentIds: string[]) => {
      await Promise.all(studentIds.map((studentId) => api.post(`/internships/${internshipId}/students`, { studentId })));
    },
    onSuccess: () => {
      toast.success('Student(s) assigned');
      invalidateInternship();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to assign student'),
  });

  const removeStudent = useMutation({
    mutationFn: async (studentId: string) => {
      await api.delete(`/internships/${internshipId}/students/${studentId}`);
    },
    onSuccess: () => {
      toast.success('Student removed');
      invalidateInternship();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to remove student'),
  });

  const issueCert = useMutation({
    mutationFn: async (studentId: string) => {
      const pre = await api.get('/certificates/precheck', { params: { studentId, internshipId } });
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
      qc.invalidateQueries({ queryKey: ['certs'] });
    },
    onError: (e: any) => {
      if (e.ineligible) {
        toast.error(
          `Attendance below threshold. (Current: ${e.stats.percentage}%, Required: ${e.stats.threshold}%)`,
        );
      } else {
        toast.error(e.response?.data?.message || 'Failed to issue certificate');
      }
    },
  });

  if (!currentUser) return null;

  const allMentors = (users.data ?? []).filter((u: any) => u.role === 'MENTOR');
  const allStudents = (users.data ?? []).filter((u: any) => u.role === 'STUDENT');

  return (
    <AppShell role="ADMIN">
      <button className="btn-ghost mb-4" onClick={() => router.push('/admin/internships')}>
        <ArrowLeft className="w-4 h-4" /> Back to Internships
      </button>

      <QueryState query={detail} loadingLabel="Loading internship…" emptyLabel="This internship could not be found.">
        {(i: any) => {
          const assignedMentorIds = (i.mentors ?? []).map((e: any) => (e.mentor ?? e).id);
          const assignedStudentIds = (i.students ?? []).map((e: any) => (e.student ?? e).id);
          const availableMentors = allMentors.filter((m: any) => !assignedMentorIds.includes(m.id));
          const availableStudents = allStudents.filter((s: any) => !assignedStudentIds.includes(s.id));

          return (
            <>
              {/* ---------- header ---------- */}
              <div className="card flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="font-display text-2xl">{fmtText(i.title)}</h1>
                  <div className="text-sm text-slate-400 mt-1">{fmtText(i.organization)}</div>
                  <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                    <CalendarRange className="w-3.5 h-3.5" /> {fmtText(i.startDate)} → {fmtText(i.endDate)} · {fmtText(i.totalDays)} days
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    className="input w-40"
                    value={pendingStatus ?? i.status}
                    onChange={(e) => setPendingStatus(e.target.value)}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <button
                    className="btn-primary"
                    disabled={updateStatus.isPending || !pendingStatus || pendingStatus === i.status}
                    onClick={() => pendingStatus && updateStatus.mutate(pendingStatus)}
                  >
                    {updateStatus.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Status'}
                  </button>
                </div>
              </div>

              {i.description && (
                <div className="card mt-6">
                  <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Description</div>
                  <p className="text-sm text-slate-300">{i.description}</p>
                </div>
              )}

              {/* ---------- mentors ---------- */}
              <div className="card mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-lg flex items-center gap-2">
                    <Users className="w-4 h-4 text-neon-400" /> Mentors
                  </h2>
                  <AssignPanel
                    label="Mentor"
                    available={availableMentors}
                    isAssigning={assignMentors.isPending}
                    onAssign={(ids) => assignMentors.mutate(ids)}
                  />
                </div>
                {!i.mentors?.length ? (
                  <div className="text-slate-500 text-sm text-center py-4">No mentors assigned.</div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-2">
                    {i.mentors.map((entry: any) => {
                      const m = entry.mentor ?? entry;
                      const isRemoving = removeMentor.isPending && removeMentor.variables === m.id;
                      return (
                        <div
                          key={m.id}
                          className="rounded-lg border border-line px-3 py-2 text-sm flex items-center justify-between gap-2"
                        >
                          <Link
                            href={`/admin/users/${m.id}`}
                            className="truncate hover:text-neon-400 transition-colors"
                          >
                            {personName(entry, 'mentor')}{' '}
                            <span className="text-slate-500">· {m.email}</span>
                          </Link>
                          <button
                            className="text-slate-500 hover:text-red-400 shrink-0"
                            title="Remove mentor"
                            disabled={isRemoving}
                            onClick={() => removeMentor.mutate(m.id)}
                          >
                            {isRemoving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserMinus className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ---------- enrolled students (assignment) ---------- */}
              <div className="card mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-lg flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-neon-400" /> Enrolled Students
                  </h2>
                  <AssignPanel
                    label="Student"
                    available={availableStudents}
                    isAssigning={assignStudents.isPending}
                    onAssign={(ids) => assignStudents.mutate(ids)}
                  />
                </div>
                {!i.students?.length ? (
                  <div className="text-slate-500 text-sm text-center py-4">No students enrolled.</div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-2">
                    {i.students.map((entry: any) => {
                      const s = entry.student ?? entry;
                      const isRemoving = removeStudent.isPending && removeStudent.variables === s.id;
                      return (
                        <div
                          key={s.id}
                          className="rounded-lg border border-line px-3 py-2 text-sm flex items-center justify-between gap-2"
                        >
                          <Link
                            href={`/admin/users/${s.id}`}
                            className="truncate hover:text-neon-400 transition-colors"
                          >
                            {personName(entry, 'student')}{' '}
                            <span className="text-slate-500">· {personSubLabel(entry, 'student')}</span>
                          </Link>
                          <button
                            className="text-slate-500 hover:text-red-400 shrink-0"
                            title="Remove student"
                            disabled={isRemoving}
                            onClick={() => removeStudent.mutate(s.id)}
                          >
                            {isRemoving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserMinus className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ---------- roster / attendance ---------- */}
              <div className="card mt-6">
                <h2 className="font-display text-lg flex items-center gap-2 mb-4">
                  <GraduationCap className="w-4 h-4 text-neon-400" /> Student Roster &amp; Attendance
                </h2>

                {roster.isLoading ? (
                  <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading roster…
                  </div>
                ) : roster.isError ? (
                  <div className="text-red-300 text-sm text-center py-4">Couldn&apos;t load roster data.</div>
                ) : !roster.data?.roster?.length ? (
                  <div className="text-slate-500 text-sm text-center py-6">No students enrolled yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-bg-800/60 text-slate-400 uppercase text-xs">
                        <tr>
                          <th className="text-left px-4 py-2">Student</th>
                          <th className="text-left px-4 py-2">Roll No.</th>
                          <th className="text-left px-4 py-2">Present</th>
                          <th className="text-left px-4 py-2">Absent</th>
                          <th className="text-left px-4 py-2">Half Day</th>
                          <th className="text-left px-4 py-2">Attendance</th>
                          <th className="text-right px-4 py-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {roster.data.roster.map((r: any) => {
                          const pct = typeof r.percentage === 'string' ? parseFloat(r.percentage) : r.percentage;
                          const eligible = typeof pct === 'number' && Number.isFinite(pct) && pct >= 75;
                          const isThisPending = issueCert.isPending && issueCert.variables === r.studentId;
                          return (
                            <tr key={r.studentId} className="border-t border-line hover:bg-bg-800/40">
                              <td className="px-4 py-2">
                                <Link href={`/admin/users/${r.studentId}`} className="hover:text-neon-400 transition-colors">
                                  {fmtText(r.firstName)} {fmtText(r.lastName, '')}
                                </Link>
                              </td>
                              <td className="px-4 py-2 text-slate-500">{fmtText(r.rollNumber)}</td>
                              <td className="px-4 py-2 text-slate-300">{fmtText(r.present)}</td>
                              <td className="px-4 py-2 text-slate-300">{fmtText(r.absent)}</td>
                              <td className="px-4 py-2 text-slate-300">{fmtText(r.halfDay)}</td>
                              <td className="px-4 py-2">
                                <span className={eligible ? 'badge-active' : 'badge-warn'}>{fmtPercent(r.percentage)}</span>
                              </td>
                              <td className="px-4 py-2 text-right">
                                <button
                                  className="btn-ghost text-xs"
                                  disabled={isThisPending}
                                  onClick={() => issueCert.mutate(r.studentId)}
                                >
                                  {isThisPending ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <>
                                      <ScrollText className="w-3 h-3" /> Issue Certificate
                                    </>
                                  )}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          );
        }}
      </QueryState>
    </AppShell>
  );
}

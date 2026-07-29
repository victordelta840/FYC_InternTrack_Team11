'use client';

<<<<<<< HEAD
=======
import { useEffect, useRef, useState } from 'react';
>>>>>>> ef70be6 (Complete internship management updates)
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { AppShell } from '@/components/AppShell';
import { QueryState } from '@/components/QueryState';
import { useRequireRole } from '@/hooks/use-require-role';
<<<<<<< HEAD
import type { AdminOverview } from '@/types';
=======
>>>>>>> ef70be6 (Complete internship management updates)
import {
  Users,
  BookMarked,
  ScrollText,
<<<<<<< HEAD
  LayoutTemplate,
  MessageSquareWarning,
  Activity,
  History,
  ClipboardList,
  Webhook,
  UserPlus,
  UploadCloud,
} from 'lucide-react';

export default function AdminOverviewPage() {
  const user = useRequireRole('ADMIN');

  const overview = useQuery({
    queryKey: ['admin-overview'],
    queryFn: async () => (await api.get<AdminOverview>('/admin/overview')).data,
    enabled: !!user,
    // Counts drift as the system is used; keep them reasonably fresh without
    // hammering the endpoint on every tab focus.
    staleTime: 15_000,
    refetchInterval: 60_000,
  });

=======
  FileText,
  Percent,
  AlertTriangle,
  RefreshCw,
  UserCog,
  ClipboardList,
  MessageSquareWarning,
  ArrowRight,
  Inbox,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

// ---------- response shape (matches DashboardService.getAdminSummary() exactly) ----------
// GET /dashboard/admin-summary — existing endpoint, no changes made to the backend.

interface AdminDashboardTotals {
  users?: number;
  internships?: number;
  certificates?: number;
  templates?: number;
}

interface AdminActivity {
  id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  userId: string | null;
  createdAt: string;
}

interface AdminDashboardSummary {
  totals?: AdminDashboardTotals;
  activeInternships?: number;
  pendingComplaints?: number;
  recentActivity?: AdminActivity[];
  // Not currently returned by /dashboard/admin-summary. Read defensively under
  // every plausible key so this keeps working if the backend ever adds it,
  // and so it never crashes in the meantime — renders as N/A until then.
  attendance?: number | null;
  attendancePercentage?: number | null;
  usersByRole?: Record<string, number>;
}

const QUICK_ACTIONS = [
  { label: 'Manage Students', description: 'View, edit, and manage student accounts', href: '/admin/users', icon: UserCog },
  { label: 'Manage Internships', description: 'Create and track internship programs', href: '/admin/internships', icon: BookMarked },
  { label: 'Generate Certificates', description: 'Issue and review certificates', href: '/admin/certificates', icon: ScrollText },
  { label: 'Attendance', description: 'Review attendance records', href: '/admin/attendance', icon: ClipboardList },
  { label: 'Complaints', description: 'Resolve open student complaints', href: '/admin/complaints', icon: MessageSquareWarning },
];

// ---------- safe formatting: never render undefined / null / NaN ----------

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function fmtNumber(v: unknown): string {
  return isFiniteNumber(v) ? String(v) : 'N/A';
}

function fmtPercent(v: unknown): string {
  return isFiniteNumber(v) ? `${v}%` : 'N/A';
}

function fmtText(v: unknown, fallback = 'N/A'): string {
  if (v === null || v === undefined) return fallback;
  const s = String(v).trim();
  return s.length ? s : fallback;
}

function shortId(id: string | null): string {
  if (!id) return 'System';
  return `User ${id.slice(0, 8)}`;
}

// ---------- animated counter ----------

function useCountUp(target: number | null, durationMs = 800): number {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number>();

  useEffect(() => {
    if (target === null || !Number.isFinite(target)) {
      setValue(0);
      return;
    }
    const start = performance.now();
    function tick(now: number) {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target! * eased));
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    }
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target, durationMs]);

  return value;
}

// ---------- activity badge styling ----------

function activityTone(action: string): { dot: string; text: string; label: string } {
  const a = action.toLowerCase();
  if (a.includes('delete') || a.includes('remove') || a.includes('reject') || a.includes('lock')) {
    return { dot: 'bg-red-400', text: 'text-red-300', label: 'Delete' };
  }
  if (a.includes('update') || a.includes('edit') || a.includes('status') || a.includes('assign')) {
    return { dot: 'bg-cyan-glow', text: 'text-cyan-glow', label: 'Update' };
  }
  if (a.includes('map')) {
    return { dot: 'bg-violet-400', text: 'text-violet-300', label: 'Map' };
  }
  if (a.includes('issue')) {
    return { dot: 'bg-amber-400', text: 'text-amber-300', label: 'Issue' };
  }
  if (a.includes('create') || a.includes('register') || a.includes('add') || a.includes('upload')) {
    return { dot: 'bg-neon-400', text: 'text-neon-400', label: 'Create' };
  }
  return { dot: 'bg-slate-400', text: 'text-slate-300', label: 'Activity' };
}

function humanizeAction(action: string, resource: string): string {
  const cleaned = fmtText(action, '').replace(/[._]/g, ' ').trim();
  const label = cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : 'Activity';
  const res = fmtText(resource, '');
  return res ? `${label} · ${res}` : label;
}

export default function AdminOverview() {
  const user = useRequireRole('ADMIN');

  const overview = useQuery<AdminDashboardSummary>({
    queryKey: ['admin-dashboard-summary'],
    queryFn: async () => (await api.get('/dashboard/admin-summary')).data,
    enabled: !!user,
    retry: 2,
    staleTime: 30_000,
  });

  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const totals = overview.data?.totals;
  const attendanceRaw = overview.data?.attendance ?? overview.data?.attendancePercentage ?? null;
  const attendanceValue = isFiniteNumber(attendanceRaw) ? attendanceRaw : null;
  const usersByRole = overview.data?.usersByRole;

  const summaryChips = [
    { label: 'Students', value: totals?.users },
    { label: 'Internships', value: totals?.internships },
    { label: 'Certificates', value: totals?.certificates },
    { label: 'Templates', value: totals?.templates },
    { label: 'Pending Complaints', value: overview.data?.pendingComplaints },
  ];

>>>>>>> ef70be6 (Complete internship management updates)
  if (!user) return null;

  return (
    <AppShell role="ADMIN">
<<<<<<< HEAD
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl">Overview</h1>
          <p className="text-slate-400 mt-1">Welcome back, {user.firstName}.</p>
        </div>
      </div>

      <div className="mt-6">
        <QueryState
          query={overview}
          loadingLabel="Loading dashboard…"
          isEmpty={() => false}
        >
          {(data) => (
            <>
              <StatGrid data={data} />

              <div className="grid lg:grid-cols-[1fr_360px] gap-6 mt-8">
                <RecentActivity activity={data.recentActivity} />
                <QuickActions />
              </div>
            </>
          )}
        </QueryState>
      </div>
=======
      {/* ---------- Welcome / summary header ---------- */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-neon-500 to-cyan-glow grid place-items-center shrink-0">
            <Sparkles className="w-5 h-5 text-bg-950" />
          </div>
          <div>
            <h1 className="font-display text-3xl">Welcome, {fmtText(user.firstName, 'Admin')}</h1>
            <p className="text-slate-400 mt-1">{today}</p>
          </div>
        </div>

        {overview.data && (
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {summaryChips.map((item) => (
              <div key={item.label} className="flex items-center gap-1.5 text-sm">
                <CheckCircle2 className="w-3.5 h-3.5 text-neon-400" />
                <span className="text-slate-400">{item.label}:</span>
                <span className="text-slate-200 font-mono">{fmtNumber(item.value)}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5 text-sm">
              <CheckCircle2 className="w-3.5 h-3.5 text-neon-400" />
              <span className="text-slate-400">Attendance:</span>
              <span className="text-slate-200 font-mono">{fmtPercent(attendanceValue)}</span>
            </div>
          </div>
        )}
      </div>

      {/* ---------- loading skeleton ---------- */}
      {overview.isLoading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-3 w-24 bg-bg-800 rounded" />
              <div className="h-8 w-14 bg-bg-800 rounded mt-3" />
              <div className="h-2 w-16 bg-bg-800 rounded mt-3" />
            </div>
          ))}
        </div>
      )}

      {/* ---------- error state ---------- */}
      {overview.isError && !overview.isLoading && (
        <div className="card mt-6 border-red-500/30 bg-red-500/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-red-300">Couldn&apos;t load dashboard data</div>
              <p className="text-slate-400 text-sm mt-1">
                There was a problem fetching the overview. Please try again.
              </p>
            </div>
            <button className="btn-ghost shrink-0" onClick={() => overview.refetch()}>
              <RefreshCw className="w-4 h-4" /> Retry
            </button>
          </div>
        </div>
      )}

      {/* ---------- empty state (query resolved but returned nothing usable) ---------- */}
      {!overview.isLoading && !overview.isError && !overview.data && (
        <div className="card mt-6 flex flex-col items-center text-center py-10">
          <Inbox className="w-8 h-8 text-slate-500 mb-3" />
          <div className="text-slate-300 font-medium">No dashboard data available</div>
          <p className="text-slate-500 text-sm mt-1 max-w-xs">
            The dashboard summary endpoint returned no data. Try refreshing.
          </p>
          <button className="btn-ghost mt-4" onClick={() => overview.refetch()}>
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
        </div>
      )}

      {/* ---------- stat cards ---------- */}
      {overview.data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            <StatCard
              icon={Users}
              label="Total Students"
              value={isFiniteNumber(totals?.users) ? totals!.users! : null}
              hint="Registered accounts"
              tone="ok"
            />
            <StatCard
              icon={BookMarked}
              label="Active Internships"
              value={isFiniteNumber(overview.data.activeInternships) ? overview.data.activeInternships! : null}
              hint={`of ${fmtNumber(totals?.internships)} total`}
              tone="ok"
            />
            <StatCard
              icon={ScrollText}
              label="Certificates Generated"
              value={isFiniteNumber(totals?.certificates) ? totals!.certificates! : null}
              hint="All time"
              tone="ok"
            />
            <StatCard
              icon={Percent}
              label="Attendance Percentage"
              value={attendanceValue}
              displayOverride={fmtPercent(attendanceValue)}
              hint={attendanceValue === null ? 'Attendance data unavailable' : 'Average across internships'}
              tone={attendanceValue === null ? 'neutral' : attendanceValue >= 75 ? 'ok' : 'warn'}
            />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            <StatCard
              icon={FileText}
              label="Templates"
              value={isFiniteNumber(totals?.templates) ? totals!.templates! : null}
              hint="Certificate templates"
              tone="neutral"
            />
            <StatCard
              icon={MessageSquareWarning}
              label="Pending Complaints"
              value={isFiniteNumber(overview.data.pendingComplaints) ? overview.data.pendingComplaints! : null}
              hint="Open, in review, or escalated"
              tone={
                isFiniteNumber(overview.data.pendingComplaints) && overview.data.pendingComplaints! > 0
                  ? 'warn'
                  : 'ok'
              }
            />

            {/* ---------- Users by Role ---------- */}
            <div className="card col-span-2 transition-all hover:border-neon-500/40 hover:-translate-y-0.5">
              <div className="text-slate-400 text-sm mb-3">Users by Role</div>
              {!usersByRole || !Object.keys(usersByRole).length ? (
                <div className="text-slate-500 text-sm py-4 text-center">No data available</div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(usersByRole).map(([role, count]) => (
                    <div key={role} className="rounded-lg bg-bg-800/60 border border-line px-3 py-2 text-center">
                      <div className="text-xl font-display text-neon-400">{fmtNumber(count)}</div>
                      <div className="text-[10px] uppercase tracking-widest text-slate-500">{role}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ---------- recent activity + quick actions ---------- */}
          <div className="grid lg:grid-cols-[1fr_360px] gap-6 mt-8">
            <div className="card">
              <h2 className="font-display text-lg mb-4">Recent Activity</h2>

              {!overview.data.recentActivity?.length ? (
                <div className="flex flex-col items-center justify-center text-center py-10">
                  <div className="w-12 h-12 rounded-full bg-bg-800 grid place-items-center mb-3">
                    <Inbox className="w-5 h-5 text-slate-500" />
                  </div>
                  <div className="text-slate-300 font-medium">No recent activity</div>
                  <p className="text-slate-500 text-sm mt-1 max-w-xs">
                    Actions taken across the platform — user registrations, certificate issuance,
                    template changes — will show up here as they happen.
                  </p>
                </div>
              ) : (
                <ul className="space-y-1">
                  {overview.data.recentActivity.map((activity) => {
                    const tone = activityTone(fmtText(activity.action, ''));
                    return (
                      <li
                        key={activity.id}
                        className="flex items-start gap-3 text-sm py-2.5 border-b border-line last:border-0"
                      >
                        <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${tone.dot}`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-slate-200 flex items-center gap-2 flex-wrap">
                            <span>{humanizeAction(activity.action, activity.resource)}</span>
                            <span className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded ${tone.text} bg-white/5`}>
                              {tone.label}
                            </span>
                          </div>
                          <div className="text-slate-500 text-xs mt-0.5 flex items-center gap-1.5">
                            <span>{shortId(activity.userId)}</span>
                            <span>·</span>
                            <span>
                              {activity.createdAt && !isNaN(new Date(activity.createdAt).getTime())
                                ? new Date(activity.createdAt).toLocaleString()
                                : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="card">
              <h2 className="font-display text-lg mb-4">Quick Actions</h2>
              <div className="space-y-2">
                {QUICK_ACTIONS.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link
                      key={action.href}
                      href={action.href}
                      className="group flex items-center gap-3 rounded-lg border border-line px-3 py-3 transition-all hover:border-neon-500/40 hover:bg-neon-500/5 hover:-translate-y-0.5"
                    >
                      <div className="w-9 h-9 rounded-lg bg-bg-800 grid place-items-center text-neon-400 shrink-0 group-hover:bg-neon-500/10 transition-colors">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-slate-200 font-medium">{action.label}</div>
                        <div className="text-xs text-slate-500 truncate">{action.description}</div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-600 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-neon-400" />
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
>>>>>>> ef70be6 (Complete internship management updates)
    </AppShell>
  );
}

<<<<<<< HEAD
function StatGrid({ data }: { data: AdminOverview }) {
  const { counts, usersByRole } = data;

  const cards: Array<{
    label: string;
    value: number;
    icon: React.ReactNode;
    href: string;
    sub?: string;
  }> = [
    {
      label: 'Total Users',
      value: counts.totalUsers,
      icon: <Users className="w-5 h-5" />,
      href: '/admin/users',
      sub: `${usersByRole.STUDENT} students · ${usersByRole.MENTOR} mentors · ${usersByRole.ADMIN} admins`,
    },
    {
      label: 'Total Internships',
      value: counts.totalInternships,
      icon: <BookMarked className="w-5 h-5" />,
      href: '/admin/internships',
    },
    {
      label: 'Active Internships',
      value: counts.activeInternships,
      icon: <Activity className="w-5 h-5" />,
      href: '/admin/internships',
    },
    {
      label: 'Total Certificates',
      value: counts.totalCertificates,
      icon: <ScrollText className="w-5 h-5" />,
      href: '/admin/certificates',
    },
    {
      label: 'Total Templates',
      value: counts.totalTemplates,
      icon: <LayoutTemplate className="w-5 h-5" />,
      href: '/admin/templates',
    },
    {
      label: 'Pending Complaints',
      value: counts.pendingComplaints,
      icon: <MessageSquareWarning className="w-5 h-5" />,
      href: '/admin/complaints',
      sub: counts.pendingComplaints > 0 ? 'Needs attention' : undefined,
    },
  ];

  return (
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {cards.map((c) => (
        <Link
          key={c.label}
          href={c.href}
          className="card hover:border-neon-500/50 transition-colors flex flex-col gap-3"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-lg bg-neon-500/10 text-neon-400 flex items-center justify-center">
              {c.icon}
            </div>
            {c.label === 'Pending Complaints' && data.counts.pendingComplaints > 0 && (
              <span className="badge-warn">Needs attention</span>
            )}
          </div>
          <div>
            <div className="font-display text-3xl">{c.value.toLocaleString()}</div>
            <div className="text-sm text-slate-400 mt-0.5">{c.label}</div>
          </div>
          {c.label === 'Total Users' && (
            <div className="text-[11px] text-slate-500 font-mono">{c.sub}</div>
          )}
        </Link>
      ))}
    </div>
  );
}

function RecentActivity({ activity }: { activity: AdminOverview['recentActivity'] }) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <History className="w-4 h-4 text-neon-400" />
        <h2 className="font-display text-lg">Recent Activity</h2>
      </div>
      {!activity.length ? (
        <div className="text-slate-500 text-sm text-center py-8">No activity recorded yet.</div>
      ) : (
        <div className="space-y-3 max-h-[480px] overflow-auto pr-1">
          {activity.map((a) => (
            <div key={a.id} className="flex items-start gap-3 text-sm border-b border-line/60 pb-3 last:border-0">
              <span className="badge-muted shrink-0 mt-0.5">{a.action}</span>
              <div className="min-w-0">
                <div className="text-slate-200 truncate">
                  <span className="font-medium">{a.actor.name}</span>{' '}
                  <span className="text-slate-500">acted on</span>{' '}
                  <span className="font-mono text-xs text-slate-400">{a.resource}</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {new Date(a.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QuickActions() {
  const actions = [
    { label: 'Add User', href: '/admin/users', icon: <UserPlus className="w-4 h-4" /> },
    { label: 'New Internship', href: '/admin/internships', icon: <BookMarked className="w-4 h-4" /> },
    { label: 'Upload Template', href: '/admin/templates', icon: <UploadCloud className="w-4 h-4" /> },
    { label: 'Review Attendance', href: '/admin/attendance', icon: <ClipboardList className="w-4 h-4" /> },
    { label: 'Resolve Complaints', href: '/admin/complaints', icon: <MessageSquareWarning className="w-4 h-4" /> },
    { label: 'Manage Webhooks', href: '/admin/webhooks', icon: <Webhook className="w-4 h-4" /> },
  ];

  return (
    <div className="card h-fit">
      <h2 className="font-display text-lg mb-4">Quick Actions</h2>
      <div className="flex flex-col gap-2">
        {actions.map((a) => (
          <Link key={a.label} href={a.href} className="btn-ghost justify-start w-full">
            {a.icon}
            {a.label}
          </Link>
        ))}
=======
function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone,
  displayOverride,
}: {
  icon: typeof Users;
  label: string;
  value: number | null;
  hint: string;
  tone: 'ok' | 'warn' | 'neutral';
  displayOverride?: string;
}) {
  const animated = useCountUp(value, 800);
  const display = displayOverride ?? fmtNumber(value);

  const toneDot = {
    ok: 'bg-neon-400',
    warn: 'bg-amber-400',
    neutral: 'bg-slate-500',
  }[tone];

  const toneGlow = {
    ok: 'hover:shadow-[0_0_0_1px_rgba(34,197,94,0.25),0_0_24px_-6px_rgba(34,197,94,0.35)]',
    warn: 'hover:shadow-[0_0_0_1px_rgba(245,158,11,0.25),0_0_24px_-6px_rgba(245,158,11,0.35)]',
    neutral: 'hover:shadow-[0_0_0_1px_rgba(148,163,184,0.2),0_0_24px_-6px_rgba(148,163,184,0.25)]',
  }[tone];

  return (
    <div className={`card transition-all hover:border-neon-500/40 hover:-translate-y-0.5 ${toneGlow}`}>
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${toneDot}`} />
            <span className="text-slate-400 text-sm truncate">{label}</span>
          </div>
          <div className="font-display text-3xl mt-1">
            {value === null ? display : displayOverride ? displayOverride : animated}
          </div>
          <div className="text-slate-500 text-xs mt-1">{fmtText(hint)}</div>
        </div>
        <Icon className="w-8 h-8 text-neon-400 shrink-0" />
>>>>>>> ef70be6 (Complete internship management updates)
      </div>
    </div>
  );
}
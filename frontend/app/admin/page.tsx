'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { AppShell } from '@/components/AppShell';
import { QueryState } from '@/components/QueryState';
import { useRequireRole } from '@/hooks/use-require-role';
import type { AdminOverview } from '@/types';
import {
  Users,
  BookMarked,
  ScrollText,
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

  if (!user) return null;

  return (
    <AppShell role="ADMIN">
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
    </AppShell>
  );
}

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
      </div>
    </div>
  );
}

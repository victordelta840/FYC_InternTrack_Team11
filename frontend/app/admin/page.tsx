'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Users,
  BookMarked,
  ScrollText,
  LayoutTemplate,
  Activity,
  MessageSquareWarning,
  Percent,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { AppShell } from '@/components/AppShell';
import { useRequireRole } from '@/hooks/use-require-role';
import { SummaryHeader } from '@/components/admin/SummaryHeader';
import { StatCard, type StatTone } from '@/components/admin/StatCard';
import { UsersByRole } from '@/components/admin/UsersByRole';
import { RecentActivity } from '@/components/admin/RecentActivity';
import { QuickActions } from '@/components/admin/QuickActions';
import { AdminDashboardSkeleton } from '@/components/admin/LoadingSkeleton';
import { AdminDashboardError } from '@/components/admin/ErrorState';
import { AdminDashboardEmpty } from '@/components/admin/EmptyState';
import { isFiniteNumber } from '@/components/admin/format';
import type { AdminDashboardSummary } from '@/components/admin/types';

// GET /dashboard/admin-summary — existing backend endpoint, unchanged.
async function fetchAdminSummary(): Promise<AdminDashboardSummary> {
  const res = await api.get<AdminDashboardSummary>('/dashboard/admin-summary');
  return res.data;
}

export default function AdminOverviewPage() {
  const user = useRequireRole('ADMIN');

  const overview = useQuery<AdminDashboardSummary>({
    queryKey: ['admin-dashboard-summary'],
    queryFn: fetchAdminSummary,
    enabled: !!user,
    retry: 2,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  if (!user) return null;

  const data = overview.data;
  const totals = data?.totals;

  const usersTotal = isFiniteNumber(totals?.users) ? (totals!.users as number) : null;
  const internshipsTotal = isFiniteNumber(totals?.internships) ? (totals!.internships as number) : null;
  const certificatesTotal = isFiniteNumber(totals?.certificates) ? (totals!.certificates as number) : null;
  const templatesTotal = isFiniteNumber(totals?.templates) ? (totals!.templates as number) : null;
  const activeInternships = isFiniteNumber(data?.activeInternships)
    ? (data!.activeInternships as number)
    : null;
  const pendingComplaints = isFiniteNumber(data?.pendingComplaints)
    ? (data!.pendingComplaints as number)
    : null;

  const attendanceRaw = data?.attendance ?? data?.attendancePercentage ?? null;
  const attendanceValue = isFiniteNumber(attendanceRaw) ? attendanceRaw : null;

  const complaintsTone: StatTone =
    pendingComplaints === null ? 'neutral' : pendingComplaints > 0 ? 'warn' : 'ok';
  const complaintsHint =
    pendingComplaints === null ? 'No data available' : pendingComplaints > 0 ? 'Needs attention' : 'All clear';

  const chips = [
    { label: 'Students', value: usersTotal },
    { label: 'Internships', value: internshipsTotal },
    { label: 'Certificates', value: certificatesTotal },
    { label: 'Pending Complaints', value: pendingComplaints },
  ];

  const hasAnyData =
    !!data &&
    (usersTotal !== null ||
      internshipsTotal !== null ||
      certificatesTotal !== null ||
      templatesTotal !== null ||
      activeInternships !== null ||
      pendingComplaints !== null ||
      (data.recentActivity?.length ?? 0) > 0 ||
      Object.values(data.usersByRole ?? {}).some((v) => isFiniteNumber(v)));

  return (
    <AppShell role="ADMIN">
      {overview.isPending ? (
        <AdminDashboardSkeleton />
      ) : overview.isError ? (
        <AdminDashboardError
          message={overview.error instanceof Error ? overview.error.message : undefined}
          onRetry={() => overview.refetch()}
          isRetrying={overview.isFetching}
        />
      ) : !hasAnyData ? (
        <AdminDashboardEmpty />
      ) : (
        <div className="space-y-8">
          <SummaryHeader name={user.firstName} chips={chips} />

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              icon={Users}
              label="Total Users"
              value={usersTotal}
              hint="Across all roles"
              href="/admin/users"
              tone="ok"
            />
            <StatCard
              icon={BookMarked}
              label="Total Internships"
              value={internshipsTotal}
              hint="All programs"
              href="/admin/internships"
              tone="neutral"
            />
            <StatCard
              icon={Activity}
              label="Active Internships"
              value={activeInternships}
              hint="Currently running"
              href="/admin/internships"
              tone="ok"
            />
            <StatCard
              icon={ScrollText}
              label="Certificates Issued"
              value={certificatesTotal}
              hint="Total issued"
              href="/admin/certificates"
              tone="neutral"
            />
            <StatCard
              icon={LayoutTemplate}
              label="Templates"
              value={templatesTotal}
              hint="Certificate templates"
              href="/admin/templates"
              tone="neutral"
            />
            <StatCard
              icon={MessageSquareWarning}
              label="Pending Complaints"
              value={pendingComplaints}
              hint={complaintsHint}
              href="/admin/complaints"
              tone={complaintsTone}
            />
          </div>

          {attendanceValue !== null && (
            <div className="card flex items-center gap-4">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-neon-500/10 text-neon-400">
                <Percent className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <div className="text-sm text-slate-400">Average Attendance</div>
                <div className="font-display text-2xl text-slate-50">{attendanceValue}%</div>
              </div>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <RecentActivity items={data?.recentActivity} />
            <div className="space-y-4">
              <UsersByRole usersByRole={data?.usersByRole} />
              <QuickActions />
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

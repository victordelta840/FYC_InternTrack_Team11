'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { AppShell } from '@/components/AppShell';
import { useRequireRole } from '@/hooks/use-require-role';
import { ProgressRing } from '@/components/ProgressRing';
import { ScrollText, ArrowRight } from 'lucide-react';

export default function StudentOverview() {
  const user = useRequireRole('STUDENT');

  const internships = useQuery({
    queryKey: ['internships'],
    queryFn: async () => (await api.get('/internships')).data,
    enabled: !!user,
  });

  if (!user) return null;

  return (
    <AppShell role="STUDENT">
      <h1 className="font-display text-3xl">Welcome, {user.firstName}</h1>
      <p className="text-slate-400">Track your internship progress in real time.</p>

      <div className="grid md:grid-cols-2 gap-6 mt-8">
        {(internships.data ?? []).map((i: any) => (
          <StudentInternshipCard key={i.id} internship={i} studentId={user.id} />
        ))}
        {!internships.data?.length && (
          <div className="card text-slate-400">You are not enrolled in any internships yet.</div>
        )}
      </div>
    </AppShell>
  );
}

function StudentInternshipCard({ internship, studentId }: { internship: any; studentId: string }) {
  const stats = useQuery({
    queryKey: ['student-stats', studentId, internship.id],
    queryFn: async () =>
      (await api.get(`/attendance/student/${studentId}/stats?internshipId=${internship.id}`)).data,
  });
  const precheck = useQuery({
    queryKey: ['precheck', studentId, internship.id],
    queryFn: async () =>
      (await api.get(`/certificates/precheck?studentId=${studentId}&internshipId=${internship.id}`)).data,
  });

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-display text-lg">{internship.title}</div>
          <div className="text-sm text-slate-400">{internship.organization}</div>
          <div className="text-xs text-slate-500 mt-1">
            {internship.startDate} → {internship.endDate} · {internship.totalDays} total days
          </div>
        </div>
        <span className={internship.status === 'ACTIVE' ? 'badge-active' : 'badge-muted'}>{internship.status}</span>
      </div>
      <div className="grid grid-cols-[auto_1fr] gap-6 mt-6 items-center">
        <ProgressRing percentage={stats.data?.percentage ?? '0.00'} />
        <div className="text-sm">
          <div>
            <span className="text-slate-400">Present:</span>{' '}
            <span className="text-neon-400 font-semibold">{stats.data?.present ?? 0}</span>
          </div>
          <div>
            <span className="text-slate-400">Half-day:</span>{' '}
            <span className="text-amber-400 font-semibold">{stats.data?.halfDay ?? 0}</span>
          </div>
          <div>
            <span className="text-slate-400">Absent:</span>{' '}
            <span className="text-red-400 font-semibold">{stats.data?.absent ?? 0}</span>
          </div>
          <div className="mt-3">
            {precheck.data?.eligible ? (
              <span className="badge-active">Eligible for certificate</span>
            ) : (
              <span className="badge-warn">Below {precheck.data?.threshold ?? '90.00'}% — {precheck.data?.percentage ?? '0.00'}%</span>
            )}
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <Link href={`/student/certificate?internship=${internship.id}`} className="btn-ghost">
          <ScrollText className="w-4 h-4" /> Certificate <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

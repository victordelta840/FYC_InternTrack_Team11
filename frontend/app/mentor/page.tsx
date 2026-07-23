'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { AppShell } from '@/components/AppShell';
import { useRequireRole } from '@/hooks/use-require-role';
import Link from 'next/link';
import { ClipboardList, Upload } from 'lucide-react';

export default function MentorOverview() {
  const user = useRequireRole('MENTOR');
  const internships = useQuery({
    queryKey: ['internships'],
    queryFn: async () => (await api.get('/internships')).data,
    enabled: !!user,
  });

  if (!user) return null;

  return (
    <AppShell role="MENTOR">
      <h1 className="font-display text-3xl">Cohort Oversight</h1>
      <p className="text-slate-400">Internships assigned to you.</p>

      <div className="grid md:grid-cols-2 gap-4 mt-6">
        <Link href="/mentor/attendance" className="card hover:border-neon-500/50 transition-colors">
          <ClipboardList className="w-8 h-8 text-neon-400 mb-3" />
          <div className="font-display text-lg">Daily Attendance</div>
          <div className="text-sm text-slate-400 mt-1">Mark & edit attendance with justifications.</div>
        </Link>
        <Link href="/mentor/import" className="card hover:border-neon-500/50 transition-colors">
          <Upload className="w-8 h-8 text-neon-400 mb-3" />
          <div className="font-display text-lg">Bulk Import</div>
          <div className="text-sm text-slate-400 mt-1">CSV / XLSX import with staging preview.</div>
        </Link>
      </div>

      <h2 className="font-display text-xl mt-10 mb-3">Your internships</h2>
      <div className="grid md:grid-cols-2 gap-4">
        {(internships.data ?? []).map((i: any) => (
          <div key={i.id} className="card">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-display text-lg">{i.title}</div>
                <div className="text-sm text-slate-400">{i.organization}</div>
              </div>
              <span className={i.status === 'ACTIVE' ? 'badge-active' : 'badge-muted'}>{i.status}</span>
            </div>
            <div className="text-xs text-slate-500 mt-2">
              {i.students?.length ?? 0} students · {i.totalDays} days
            </div>
          </div>
        ))}
        {!internships.data?.length && (
          <div className="text-slate-500 col-span-2 text-center py-10">No internships assigned.</div>
        )}
      </div>
    </AppShell>
  );
}

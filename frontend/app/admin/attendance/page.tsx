'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api-client';
import { AppShell } from '@/components/AppShell';
import { useRequireRole } from '@/hooks/use-require-role';

export default function AdminAttendance() {
  const user = useRequireRole('ADMIN');
  const [internshipId, setInternshipId] = useState<string>('');

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

  if (!user) return null;

  return (
    <AppShell role="ADMIN">
      <h1 className="font-display text-3xl">Attendance Rosters</h1>
      <p className="text-slate-400">Live attendance percentages across all internships.</p>

      <div className="card mt-6">
        <label className="label">Select Internship</label>
        <select className="input max-w-md" value={internshipId} onChange={(e) => setInternshipId(e.target.value)}>
          <option value="">— pick one —</option>
          {(internships.data ?? []).map((i: any) => (
            <option key={i.id} value={i.id}>{i.title} · {i.organization}</option>
          ))}
        </select>
      </div>

      {internshipId && roster.data && (
        <div className="card mt-6 p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bg-800/60 text-slate-400 uppercase text-xs">
              <tr>
                <th className="text-left px-4 py-3">Student</th>
                <th className="text-left px-4 py-3">Roll</th>
                <th className="text-right px-4 py-3">Present</th>
                <th className="text-right px-4 py-3">Half</th>
                <th className="text-right px-4 py-3">Absent</th>
                <th className="text-right px-4 py-3">Total</th>
                <th className="text-right px-4 py-3">%</th>
                <th className="text-center px-4 py-3">Certificate</th>
              </tr>
            </thead>
            <tbody>
              {(roster.data.roster ?? []).map((r: any) => (
                <tr key={r.studentId} className="border-t border-line hover:bg-bg-800/40">
                  <td className="px-4 py-3">{r.firstName} {r.lastName}</td>
                  <td className="px-4 py-3 text-slate-500">{r.rollNumber ?? '—'}</td>
                  <td className="px-4 py-3 text-right">{r.present}</td>
                  <td className="px-4 py-3 text-right">{r.halfDay}</td>
                  <td className="px-4 py-3 text-right">{r.absent}</td>
                  <td className="px-4 py-3 text-right">{r.totalDays}</td>
                  <td className="px-4 py-3 text-right font-mono">{r.percentage}</td>
                  <td className="px-4 py-3 text-center">
                    {parseFloat(r.percentage) >= 90 ? (
                      <span className="badge-active">Eligible</span>
                    ) : (
                      <span className="badge-warn">Below 90.00%</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}

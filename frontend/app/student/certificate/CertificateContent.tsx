'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api-client';
import { AppShell } from '@/components/AppShell';
import { useRequireRole } from '@/hooks/use-require-role';
import { ProgressRing } from '@/components/ProgressRing';
import { toast } from 'sonner';
import { Download, Loader2, ScrollText } from 'lucide-react';

export default function CertificateContent() {
  const user = useRequireRole('STUDENT');
  const qc = useQueryClient();
  const search = useSearchParams();
  const [internshipId, setInternshipId] = useState('');

  useEffect(() => {
    const q = search.get('internship');
    if (q) setInternshipId(q);
  }, [search]);

  const internships = useQuery({
    queryKey: ['internships'],
    queryFn: async () => (await api.get('/internships')).data,
    enabled: !!user,
  });

  const precheck = useQuery({
    queryKey: ['precheck', user?.id, internshipId],
    queryFn: async () =>
      (await api.get(`/certificates/precheck?studentId=${user!.id}&internshipId=${internshipId}`)).data,
    enabled: !!user && !!internshipId,
  });

  const mine = useQuery({
    queryKey: ['my-certs'],
    queryFn: async () => (await api.get('/certificates/mine')).data,
    enabled: !!user,
  });

  const issue = useMutation({
    mutationFn: async () => (await api.post('/certificates/self-issue', { internshipId })).data,
    onSuccess: () => {
      toast.success('Certificate issued');
      qc.invalidateQueries({ queryKey: ['my-certs'] });
    },
    onError: (e: any) => {
      const d = e.response?.data;
      if (d?.code === 'ATTENDANCE_BELOW_THRESHOLD') {
        toast.error(
          `Attendance ${d.details.currentPercentage}% is below the required ${d.details.requiredPercentage}%. Short by ${d.details.shortfall}%.`,
        );
      } else if (d?.code === 'NO_ACTIVE_TEMPLATE' || d?.code === 'TEMPLATE_UNMAPPED') {
        toast.error(d.message);
      } else {
        toast.error(d?.message || 'Issue failed');
      }
    },
  });

  async function download(id: string) {
    const res = await api.get(`/certificates/${id}/download`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `certificate.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!user) return null;

  return (
    <AppShell role="STUDENT">
      <h1 className="font-display text-3xl">Your Certificate</h1>
      <p className="text-slate-400">Available once your attendance is 90.00% or higher.</p>

      <div className="card mt-6 max-w-md">
        <label className="label">Choose internship</label>
        <select className="input" value={internshipId} onChange={(e) => setInternshipId(e.target.value)}>
          <option value="">— select —</option>
          {(internships.data ?? []).map((i: any) => (
            <option key={i.id} value={i.id}>{i.title}</option>
          ))}
        </select>
      </div>

      {internshipId && precheck.data && (
        <div className="card mt-6 grid md:grid-cols-[auto_1fr] gap-8 items-center">
          <ProgressRing percentage={precheck.data.percentage} threshold={precheck.data.threshold} />
          <div>
            {precheck.data.eligible ? (
              <>
                <div className="badge-active">Eligible</div>
                <p className="mt-3 text-slate-300">
                  You have met the required {precheck.data.threshold}% threshold. Click below to
                  generate your certificate.
                </p>
                <button className="btn-primary mt-4" onClick={() => issue.mutate()} disabled={issue.isPending}>
                  {issue.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ScrollText className="w-4 h-4" /> Generate Certificate</>}
                </button>
              </>
            ) : (
              <>
                <div className="badge-warn">Below Threshold</div>
                <p className="mt-3 text-slate-300">
                  Your current attendance is <span className="text-amber-400 font-semibold">{precheck.data.percentage}%</span>,
                  which is below the required <span className="text-neon-400 font-semibold">{precheck.data.threshold}%</span>.
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Present days: {precheck.data.present} · Half-days: {precheck.data.halfDay} · Absent: {precheck.data.absent} of {precheck.data.totalDays}.
                </p>
                <button className="btn-primary mt-4 opacity-50 cursor-not-allowed" disabled>
                  Certificate Locked
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <h2 className="font-display text-xl mt-10 mb-3">Issued certificates</h2>
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bg-800/60 text-slate-400 uppercase text-xs">
            <tr>
              <th className="text-left px-4 py-3">Internship</th>
              <th className="text-left px-4 py-3">Issued</th>
              <th className="text-right px-4 py-3">Attendance</th>
              <th className="text-center px-4 py-3">PDF</th>
            </tr>
          </thead>
          <tbody>
            {(mine.data ?? []).map((c: any) => (
              <tr key={c.id} className="border-t border-line">
                <td className="px-4 py-3">{c.internship?.title ?? '—'}</td>
                <td className="px-4 py-3 text-slate-400">{new Date(c.issuedAt).toLocaleString()}</td>
                <td className="px-4 py-3 text-right font-mono text-neon-400">{c.attendancePercentage}%</td>
                <td className="px-4 py-3 text-center">
                  <button className="btn-ghost" onClick={() => download(c.id)}>
                    <Download className="w-4 h-4" /> Download
                  </button>
                </td>
              </tr>
            ))}
            {!mine.data?.length && (
              <tr><td className="px-4 py-6 text-slate-500 text-center" colSpan={4}>No certificates yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}

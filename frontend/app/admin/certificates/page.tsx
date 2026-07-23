'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { AppShell } from '@/components/AppShell';
import { useRequireRole } from '@/hooks/use-require-role';
import { Download } from 'lucide-react';

export default function AdminCertificates() {
  const user = useRequireRole('ADMIN');
  const list = useQuery({
    queryKey: ['certs'],
    queryFn: async () => (await api.get('/certificates')).data,
    enabled: !!user,
  });

  if (!user) return null;

  async function download(id: string) {
    const res = await api.get(`/certificates/${id}/download`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `certificate_${id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell role="ADMIN">
      <h1 className="font-display text-3xl">Certificates</h1>
      <p className="text-slate-400">All issued certificates.</p>

      <div className="card mt-6 p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bg-800/60 text-slate-400 uppercase text-xs">
            <tr>
              <th className="text-left px-4 py-3">Issued</th>
              <th className="text-left px-4 py-3">Student</th>
              <th className="text-left px-4 py-3">Internship</th>
              <th className="text-right px-4 py-3">Attendance</th>
              <th className="text-center px-4 py-3">PDF</th>
            </tr>
          </thead>
          <tbody>
            {(list.data ?? []).map((c: any) => (
              <tr key={c.id} className="border-t border-line hover:bg-bg-800/40">
                <td className="px-4 py-3">{new Date(c.issuedAt).toLocaleString()}</td>
                <td className="px-4 py-3">{c.student?.profile?.firstName ?? '—'} {c.student?.profile?.lastName ?? ''}</td>
                <td className="px-4 py-3">{c.internship?.title ?? '—'}</td>
                <td className="px-4 py-3 text-right font-mono text-neon-400">{c.attendancePercentage}%</td>
                <td className="px-4 py-3 text-center">
                  <button className="btn-ghost" onClick={() => download(c.id)}>
                    <Download className="w-4 h-4" /> PDF
                  </button>
                </td>
              </tr>
            ))}
            {!list.data?.length && (
              <tr><td className="px-4 py-6 text-slate-500 text-center" colSpan={5}>No certificates issued yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}

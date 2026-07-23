'use client';

import { useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { api } from '@/lib/api-client';
import { AppShell } from '@/components/AppShell';
import { useRequireRole } from '@/hooks/use-require-role';
import { toast } from 'sonner';
import { Loader2, Upload, PlayCircle } from 'lucide-react';

export default function MentorImport() {
  const user = useRequireRole('MENTOR');
  const fileRef = useRef<HTMLInputElement>(null);
  const [internshipId, setInternshipId] = useState('');
  const [staging, setStaging] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [committing, setCommitting] = useState(false);

  const internships = useQuery({
    queryKey: ['internships'],
    queryFn: async () => (await api.get('/internships')).data,
    enabled: !!user,
  });

  async function preview(e: React.FormEvent) {
    e.preventDefault();
    if (!fileRef.current?.files?.[0]) return toast.error('Choose a file');
    if (!internshipId) return toast.error('Pick internship');
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', fileRef.current.files[0]);
      fd.append('internshipId', internshipId);
      const res = await api.post('/attendance/import/preview', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setStaging(res.data);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Preview failed');
    } finally {
      setBusy(false);
    }
  }

  async function commit() {
    if (!staging) return;
    setCommitting(true);
    try {
      const res = await api.post('/attendance/import/commit', { internshipId, staging });
      toast.success(`Imported ${res.data.inserted} rows (${res.data.skipped} skipped)`);
      setStaging(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Import failed');
    } finally {
      setCommitting(false);
    }
  }

  if (!user) return null;

  return (
    <AppShell role="MENTOR">
      <h1 className="font-display text-3xl">Attendance Import</h1>
      <p className="text-slate-400">Upload CSV or XLSX. Headers are fuzzy-matched (email, date, status, notes).</p>

      <form onSubmit={preview} className="card mt-6 grid md:grid-cols-3 gap-3">
        <div>
          <label className="label">Internship</label>
          <select className="input" value={internshipId} onChange={(e) => setInternshipId(e.target.value)}>
            <option value="">— pick one —</option>
            {(internships.data ?? []).map((i: any) => (
              <option key={i.id} value={i.id}>{i.title}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">File (.csv / .xlsx)</label>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="input" />
        </div>
        <div className="flex items-end">
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Upload className="w-4 h-4" /> Preview</>}
          </button>
        </div>
      </form>

      {staging && (
        <div className="card mt-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-display text-lg">Staging Preview</div>
              <div className="text-xs text-slate-400">
                {staging.totalRows} rows · <span className="text-amber-400">{staging.errorRows}</span> errors
              </div>
            </div>
            <button className="btn-primary" onClick={commit} disabled={committing || staging.rows.every((r: any) => r.errors.length)}>
              {committing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><PlayCircle className="w-4 h-4" /> Commit valid rows</>}
            </button>
          </div>
          <div className="mt-3 text-xs text-slate-400">
            Detected headers: {staging.headers.map((h: any) => (
              <span key={h.canonical} className="mr-3">
                <span className="text-slate-300">{h.canonical}</span> ← {h.source ?? <span className="text-amber-400">N/A</span>}
              </span>
            ))}
          </div>
          <div className="mt-4 overflow-auto max-h-[500px]">
            <table className="w-full text-xs">
              <thead className="bg-bg-800 text-slate-400 uppercase">
                <tr>
                  <th className="text-left px-2 py-2">Row</th>
                  <th className="text-left px-2 py-2">Identifier</th>
                  <th className="text-left px-2 py-2">Date</th>
                  <th className="text-left px-2 py-2">Status</th>
                  <th className="text-left px-2 py-2">Resolved</th>
                  <th className="text-left px-2 py-2">Errors</th>
                </tr>
              </thead>
              <tbody>
                {staging.rows.map((r: any) => (
                  <tr key={r.rowNumber} className={r.errors.length ? 'bg-red-500/5' : ''}>
                    <td className="px-2 py-1 font-mono">{r.rowNumber}</td>
                    <td className="px-2 py-1">{r.identifier ?? <span className="text-amber-400">N/A</span>}</td>
                    <td className="px-2 py-1">{r.date ?? <span className="text-amber-400">N/A</span>}</td>
                    <td className="px-2 py-1">{r.status ?? <span className="text-amber-400">N/A</span>}</td>
                    <td className="px-2 py-1 font-mono text-[10px]">{r.resolvedStudentId ? r.resolvedStudentId.slice(0, 8) : '—'}</td>
                    <td className="px-2 py-1 text-red-400">{r.errors.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppShell>
  );
}

// frontend/app/admin/templates/page.tsx
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { AppShell } from '@/components/AppShell';
import { useRequireRole } from '@/hooks/use-require-role';
import { toast } from 'sonner';
import { Loader2, Upload, Check, Trash2 } from 'lucide-react';

export default function AdminTemplates() {
  const user = useRequireRole('ADMIN');
  const qc = useQueryClient();
  const nameRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const list = useQuery({
    queryKey: ['templates'],
    queryFn: async () => (await api.get('/templates')).data,
    enabled: !!user,
  });

  const activate = useMutation({
    mutationFn: async (id: string) => (await api.patch(`/templates/${id}/activate`)).data,
    onSuccess: () => {
      toast.success('Template activated');
      qc.invalidateQueries({ queryKey: ['templates'] });
    },
    onError: () => toast.error('Failed to activate'),
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/templates/${id}`)).data,
    onSuccess: () => {
      toast.success('Template deleted successfully');
      qc.invalidateQueries({ queryKey: ['templates'] });
    },
    onError: (e: any) => {
      toast.error(e.response?.data?.message || 'Failed to delete template');
    },
  });

  function handleDelete(id: string) {
    if (window.confirm('Are you sure you want to delete this template?')) {
      deleteTemplate.mutate(id);
    }
  }

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!nameRef.current?.value || !fileRef.current?.files?.[0]) {
      toast.error('Name and file are required');
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('name', nameRef.current.value);
      fd.append('file', fileRef.current.files[0]);
      await api.post('/templates/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Template uploaded. Map fields to complete setup.');
      qc.invalidateQueries({ queryKey: ['templates'] });
      nameRef.current.value = '';
      fileRef.current.value = '';
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  if (!user) return null;

  return (
    <AppShell role="ADMIN">
      <h1 className="font-display text-3xl">Certificate Templates</h1>
      <p className="text-slate-400">Upload PDF / PNG / JPG templates. Only one can be active at a time.</p>

      <form onSubmit={upload} className="card mt-6 space-y-3">
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="label">Template name</label>
            <input ref={nameRef} className="input" placeholder="e.g. Standard Completion Certificate v2" />
          </div>
          <div>
            <label className="label">File (PDF / PNG / JPG)</label>
            <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg" className="input" />
          </div>
        </div>
        <button className="btn-primary" disabled={busy}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Upload className="w-4 h-4" /> Upload Template</>}
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
        {(list.data ?? []).map((t: any) => (
          <div key={t.id} className="card">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-display text-lg">{t.name}</div>
                <div className="text-xs text-slate-500 mt-1">
                  {t.format} · {t.mapping?.fields?.length ?? 0} field(s) mapped
                  {t.mapping?.ocrTried && !t.mapping?.ocrConfident && (
                    <span className="ml-2 badge-warn">OCR degraded — manual required</span>
                  )}
                </div>
              </div>
              {t.isActive ? (
                <span className="badge-active"><Check className="w-3 h-3 mr-1" /> Active</span>
              ) : (
                <button className="btn-ghost" onClick={() => activate.mutate(t.id)}>Activate</button>
              )}
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Link className="btn-ghost" href={`/admin/templates/${t.id}`}>Map Fields</Link>
              <button
                className="btn-ghost text-red-400 hover:text-red-300"
                disabled={deleteTemplate.isPending && deleteTemplate.variables === t.id}
                onClick={() => handleDelete(t.id)}
              >
                {deleteTemplate.isPending && deleteTemplate.variables === t.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <><Trash2 className="w-4 h-4" /> Delete</>
                )}
              </button>
            </div>
          </div>
        ))}
        {!list.data?.length && (
          <div className="text-slate-500 col-span-2 text-center py-10">No templates yet.</div>
        )}
      </div>
    </AppShell>
  );
}
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api-client';
import { AppShell } from '@/components/AppShell';
import { useRequireRole } from '@/hooks/use-require-role';
import { toast } from 'sonner';
import { Loader2, Plus, X, Copy, RefreshCw, Trash2, Activity, RotateCcw } from 'lucide-react';

const EVENTS = [
  'complaint.created',
  'complaint.in_review',
  'complaint.escalated',
  'complaint.resolved',
  'complaint.closed',
  'complaint.reassigned',
  'certificate.generated',
  'student.registered',
  '*',
];

export default function AdminWebhooks() {
  const user = useRequireRole('ADMIN');
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', targetUrl: '', events: ['*'] as string[] });
  const [showSecret, setShowSecret] = useState<{ id: string; secret: string } | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ['webhooks'],
    queryFn: async () => (await api.get('/webhooks')).data,
    enabled: !!user,
  });

  const deliveries = useQuery({
    queryKey: ['webhook-deliveries', activeId],
    queryFn: async () => (await api.get(`/webhooks/${activeId}/deliveries`)).data,
    enabled: !!activeId,
    refetchInterval: 5000,
  });

  const create = useMutation({
    mutationFn: async () => (await api.post('/webhooks', form)).data,
    onSuccess: (data: any) => {
      toast.success('Webhook created');
      setShowSecret({ id: data.id, secret: data.secretKey });
      qc.invalidateQueries({ queryKey: ['webhooks'] });
      setOpen(false);
      setForm({ name: '', targetUrl: '', events: ['*'] });
    },
    onError: (e: any) => {
      const m = e.response?.data?.message;
      toast.error(Array.isArray(m) ? m.join(', ') : m || 'Failed');
    },
  });

  const rotate = useMutation({
    mutationFn: async (id: string) => (await api.post(`/webhooks/${id}/rotate-secret`)).data,
    onSuccess: (data: any) => {
      setShowSecret({ id: data.id, secret: data.secretKey });
      qc.invalidateQueries({ queryKey: ['webhooks'] });
    },
    onError: () => toast.error('Failed to rotate secret'),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/webhooks/${id}`)).data,
    onSuccess: () => {
      toast.success('Webhook deleted');
      qc.invalidateQueries({ queryKey: ['webhooks'] });
      setActiveId(null);
    },
  });

  const toggle = useMutation({
    mutationFn: async (input: { id: string; isActive: boolean }) =>
      (await api.patch(`/webhooks/${input.id}`, { isActive: input.isActive })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['webhooks'] }),
  });

  const retry = useMutation({
    mutationFn: async (jobId: string) =>
      (await api.post(`/webhooks/deliveries/${jobId}/retry`)).data,
    onSuccess: () => {
      toast.success('Retry queued');
      qc.invalidateQueries({ queryKey: ['webhook-deliveries', activeId] });
    },
  });

  function toggleEvent(e: string) {
    setForm((f) => {
      if (f.events.includes(e)) return { ...f, events: f.events.filter((x) => x !== e) };
      if (e === '*') return { ...f, events: ['*'] };
      return { ...f, events: [...f.events.filter((x) => x !== '*'), e] };
    });
  }

  if (!user) return null;

  return (
    <AppShell role="ADMIN">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl">Webhooks</h1>
          <p className="text-slate-400">Broadcast events with HMAC-SHA256 signatures. Retries with exponential backoff.</p>
        </div>
        <button className="btn-primary" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4" /> New Webhook
        </button>
      </div>

      <div className="grid gap-4 mt-6">
        {(list.data ?? []).map((w: any) => (
          <div key={w.id} className="card">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="font-display text-lg">{w.name}</div>
                <div className="text-xs font-mono text-slate-500 truncate">{w.targetUrl}</div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {w.events.map((ev: string) => (
                    <span key={ev} className="badge-muted">{ev}</span>
                  ))}
                </div>
                <div className="text-xs text-slate-500 mt-3 flex items-center gap-4">
                  <span>Last success: {w.lastSuccessAt ? new Date(w.lastSuccessAt).toLocaleString() : 'never'}</span>
                  <span>Failures since: <span className={w.failureCount > 0 ? 'text-amber-400' : 'text-slate-400'}>{w.failureCount}</span></span>
                </div>
              </div>
              <div className="flex flex-col gap-2 ml-4">
                <span className={w.isActive ? 'badge-active' : 'badge-muted'}>{w.isActive ? 'Active' : 'Paused'}</span>
                <button className="btn-ghost text-xs" onClick={() => toggle.mutate({ id: w.id, isActive: !w.isActive })}>
                  {w.isActive ? 'Pause' : 'Resume'}
                </button>
                <button className="btn-ghost text-xs" onClick={() => rotate.mutate(w.id)}>
                  <RefreshCw className="w-3 h-3" /> Rotate
                </button>
                <button className="btn-ghost text-xs" onClick={() => setActiveId(activeId === w.id ? null : w.id)}>
                  <Activity className="w-3 h-3" /> Deliveries
                </button>
                <button className="btn-danger text-xs" onClick={() => confirm('Delete webhook?') && remove.mutate(w.id)}>
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            </div>

            {activeId === w.id && (
              <div className="mt-4 border-t border-line pt-4">
                <div className="text-xs uppercase tracking-widest text-slate-500 mb-2">Recent deliveries</div>
                {deliveries.isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                <div className="max-h-72 overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="text-slate-500 text-left">
                      <tr>
                        <th className="py-1">When</th>
                        <th className="py-1">Event</th>
                        <th className="py-1">Status</th>
                        <th className="py-1 text-right">Attempts</th>
                        <th className="py-1">Error</th>
                        <th className="py-1"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(deliveries.data ?? []).map((d: any) => (
                        <tr key={d.id} className="border-t border-line">
                          <td className="py-1 text-slate-400">{new Date(d.createdAt).toLocaleString()}</td>
                          <td className="py-1 font-mono">{d.event}</td>
                          <td className="py-1">
                            <span className={
                              d.status === 'COMPLETED' ? 'badge-active' :
                              d.status === 'FAILED' ? 'badge-danger' :
                              d.status === 'PROCESSING' ? 'badge-warn' : 'badge-muted'
                            }>{d.status}</span>
                          </td>
                          <td className="py-1 text-right font-mono">{d.attempts}/{d.maxAttempts}</td>
                          <td className="py-1 text-red-400 truncate max-w-xs" title={d.errorTrace ?? ''}>{d.errorTrace?.split('\n')[0] ?? '—'}</td>
                          <td className="py-1">
                            {d.status === 'FAILED' && (
                              <button className="btn-ghost text-[10px]" onClick={() => retry.mutate(d.id)}>
                                <RotateCcw className="w-3 h-3" /> Retry
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {!deliveries.data?.length && (
                        <tr><td colSpan={6} className="py-4 text-center text-slate-500">No deliveries yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ))}
        {!list.data?.length && (
          <div className="text-slate-500 text-center py-10">No webhooks configured.</div>
        )}
      </div>

      {/* CREATE MODAL */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/60 grid place-items-center p-6">
          <div className="card w-full max-w-lg relative">
            <button className="absolute top-4 right-4 text-slate-400 hover:text-white" onClick={() => setOpen(false)}>
              <X className="w-4 h-4" />
            </button>
            <h2 className="font-display text-xl">New Webhook</h2>
            <div className="space-y-3 mt-4">
              <div>
                <label className="label">Name</label>
                <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Placement cell notifier" />
              </div>
              <div>
                <label className="label">Target URL</label>
                <input className="input" value={form.targetUrl} onChange={(e) => setForm((f) => ({ ...f, targetUrl: e.target.value }))} placeholder="https://example.com/hooks/interntrack" />
              </div>
              <div>
                <label className="label">Events</label>
                <div className="flex flex-wrap gap-2">
                  {EVENTS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => toggleEvent(e)}
                      className={form.events.includes(e) ? 'badge-active cursor-pointer' : 'badge-muted cursor-pointer'}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <button className="btn-primary w-full" disabled={create.isPending} onClick={() => create.mutate()}>
                {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Webhook'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECRET REVEAL */}
      {showSecret && (
        <div className="fixed inset-0 z-50 bg-black/70 grid place-items-center p-6">
          <div className="card w-full max-w-lg">
            <h2 className="font-display text-xl text-neon-400">Copy your webhook secret</h2>
            <p className="text-slate-400 text-sm mt-1">This is shown <b>only once</b>. Use it to verify HMAC signatures on your receiver.</p>
            <div className="mt-4 rounded-md bg-bg-800/60 border border-neon-500/40 px-3 py-2 font-mono text-xs break-all">
              {showSecret.secret}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                className="btn-primary"
                onClick={() => {
                  navigator.clipboard.writeText(showSecret.secret);
                  toast.success('Copied to clipboard');
                }}
              >
                <Copy className="w-4 h-4" /> Copy
              </button>
              <button className="btn-ghost" onClick={() => setShowSecret(null)}>Done</button>
            </div>
            <div className="mt-4 rounded-md bg-bg-800/40 border border-line px-3 py-2 text-xs text-slate-400">
              Signature header: <code className="text-neon-400">X-Webhook-Signature: sha256=&lt;hex&gt;</code><br />
              Verify with: <code className="text-neon-400">HMAC_SHA256(secret, `${'{timestamp}'}.${'{body}'}`)</code>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { AppShell } from '@/components/AppShell';
import { useRequireRole } from '@/hooks/use-require-role';
import { toast } from 'sonner';
import { Loader2, Trash2, Plus, Save } from 'lucide-react';
import type { TemplateField } from '@/types';

const FIELD_KEYS = [
  'student_name',
  'internship_title',
  'organization',
  'start_date',
  'end_date',
  'issued_date',
];

export default function TemplateMapper() {
  const user = useRequireRole('ADMIN');
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [drawing, setDrawing] = useState<{ startX: number; startY: number; key: string } | null>(null);
  const [pendingBox, setPendingBox] = useState<{ x: number; y: number; width: number; height: number; key: string } | null>(null);
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);

  const template = useQuery({
    queryKey: ['template', params.id],
    queryFn: async () => (await api.get(`/templates/${params.id}`)).data,
    enabled: !!user && !!params.id,
  });

  useEffect(() => {
    if (template.data?.mapping?.fields) setFields(template.data.mapping.fields);
  }, [template.data]);

  const save = useMutation({
    mutationFn: async () =>
      (await api.patch(`/templates/${params.id}/mapping`, { fields })).data,
    onSuccess: () => {
      toast.success('Mapping saved');
      qc.invalidateQueries({ queryKey: ['templates'] });
      router.push('/admin/templates');
    },
    onError: () => toast.error('Save failed'),
  });

  // <img src="..."> is a plain browser request — it never goes through the axios
  // instance, so the Authorization header (and any refresh-retry logic) is never
  // attached, and the protected /file route always 401s. Fetch it via `api`
  // instead, as a blob, and point the <img> at the resulting object URL.
  const [fileObjectUrl, setFileObjectUrl] = useState<string>('');

  useEffect(() => {
    if (!params.id) return;
    let objectUrl = '';
    let cancelled = false;

    (async () => {
      try {
        const res = await api.get(`/templates/${params.id}/file`, {
          responseType: 'blob',
        });
        if (cancelled) return;
        objectUrl = URL.createObjectURL(res.data as Blob);
        setFileObjectUrl(objectUrl);
      } catch {
        if (!cancelled) toast.error('Failed to load template preview');
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [params.id]);

  function toLocal(e: React.MouseEvent) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function startDraw(key: string, e: React.MouseEvent) {
    const p = toLocal(e);
    setDrawing({ startX: p.x, startY: p.y, key });
    setPendingBox({ x: p.x, y: p.y, width: 0, height: 0, key });
  }

  function moveDraw(e: React.MouseEvent) {
    if (!drawing) return;
    const p = toLocal(e);
    setPendingBox({
      x: Math.min(drawing.startX, p.x),
      y: Math.min(drawing.startY, p.y),
      width: Math.abs(p.x - drawing.startX),
      height: Math.abs(p.y - drawing.startY),
      key: drawing.key,
    });
  }

  function endDraw() {
    if (!drawing || !pendingBox || !imgSize || !canvasRef.current) {
      setDrawing(null);
      setPendingBox(null);
      return;
    }
    // Convert canvas coords to native image coords.
    const rect = canvasRef.current.getBoundingClientRect();
    const sx = imgSize.w / rect.width;
    const sy = imgSize.h / rect.height;
    const newField: TemplateField = {
      key: pendingBox.key,
      page: 1,
      x: Math.round(pendingBox.x * sx),
      y: Math.round(pendingBox.y * sy),
      width: Math.round(pendingBox.width * sx),
      height: Math.round(pendingBox.height * sy),
      fontSize: 24,
      fontColor: '#000000',
      align: 'left',
    };
    // Replace existing field with same key
    setFields((prev) => [...prev.filter((f) => f.key !== newField.key), newField]);
    setDrawing(null);
    setPendingBox(null);
    toast.success(`Mapped ${newField.key}`);
  }

  function removeField(key: string) {
    setFields((prev) => prev.filter((f) => f.key !== key));
  }

  function updateField(key: string, patch: Partial<TemplateField>) {
    setFields((prev) => prev.map((f) => (f.key === key ? { ...f, ...patch } : f)));
  }

  if (!user) return null;
  if (template.isLoading) return <AppShell role="ADMIN">Loading…</AppShell>;
  if (template.isError) return <AppShell role="ADMIN">Template not found.</AppShell>;

  const isImage = template.data.format !== 'PDF';

  return (
    <AppShell role="ADMIN">
      <h1 className="font-display text-3xl">Map Fields · {template.data.name}</h1>
      <p className="text-slate-400 mt-1">
        {isImage
          ? 'Pick a field key, then drag a rectangle on the image to place it.'
          : 'PDF preview is not shown for mapping — use the field editor below to set coordinates.'}
      </p>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6 mt-6">
        <div className="card">
          {isImage ? (
            <>
              <div className="flex flex-wrap gap-2 mb-3">
                {FIELD_KEYS.map((k) => (
                  <button
                    key={k}
                    onMouseDown={(e) => e.preventDefault()}
                    className={
                      drawing?.key === k
                        ? 'btn-primary'
                        : 'btn-ghost'
                    }
                    onClick={() => setDrawing({ startX: -1, startY: -1, key: k })}
                  >
                    <Plus className="w-3 h-3" /> {k}
                  </button>
                ))}
              </div>
              <div
                ref={canvasRef}
                className="relative border border-line bg-bg-800 select-none"
                onMouseDown={(e) => drawing && startDraw(drawing.key, e)}
                onMouseMove={moveDraw}
                onMouseUp={endDraw}
                style={{ cursor: drawing ? 'crosshair' : 'default' }}
              >
                {fileObjectUrl && (
                  <img
                    src={fileObjectUrl}
                    alt="template"
                    onLoad={(e) => {
                      const el = e.currentTarget;
                      setImgSize({ w: el.naturalWidth, h: el.naturalHeight });
                    }}
                    className="w-full h-auto pointer-events-none"
                  />
                )}
                {/* existing fields overlay */}
                {imgSize && canvasRef.current && fields.map((f) => {
                  const rect = canvasRef.current!.getBoundingClientRect();
                  const sx = rect.width / imgSize.w;
                  const sy = rect.height / imgSize.h;
                  return (
                    <div
                      key={f.key}
                      className="absolute border-2 border-neon-500 bg-neon-500/10 text-xs text-neon-400 font-mono px-1"
                      style={{
                        left: f.x * sx,
                        top: f.y * sy,
                        width: f.width * sx,
                        height: f.height * sy,
                      }}
                    >
                      {f.key}
                    </div>
                  );
                })}
                {pendingBox && (
                  <div
                    className="absolute border-2 border-dashed border-cyan-glow bg-cyan-glow/10"
                    style={{
                      left: pendingBox.x,
                      top: pendingBox.y,
                      width: pendingBox.width,
                      height: pendingBox.height,
                    }}
                  />
                )}
              </div>
            </>
          ) : (
            <div className="text-slate-500">
              This is a PDF template. Use the field editor on the right to specify coordinates
              manually (origin: top-left of the page, in PDF points).
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="font-display text-lg mb-3">Fields ({fields.length})</h2>
          <div className="space-y-3 max-h-[540px] overflow-auto pr-1">
            {fields.map((f) => (
              <div key={f.key} className="rounded-lg border border-line p-3">
                <div className="flex items-center justify-between">
                  <div className="font-mono text-sm text-neon-400">{f.key}</div>
                  <button className="text-red-400 hover:text-red-300" onClick={() => removeField(f.key)}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2 mt-2 text-xs">
                  <NumField label="x" value={f.x} onChange={(v) => updateField(f.key, { x: v })} />
                  <NumField label="y" value={f.y} onChange={(v) => updateField(f.key, { y: v })} />
                  <NumField label="w" value={f.width} onChange={(v) => updateField(f.key, { width: v })} />
                  <NumField label="h" value={f.height} onChange={(v) => updateField(f.key, { height: v })} />
                  <NumField label="size" value={f.fontSize} onChange={(v) => updateField(f.key, { fontSize: v })} />
                  <div className="col-span-3">
                    <label className="label">align</label>
                    <select className="input" value={f.align} onChange={(e) => updateField(f.key, { align: e.target.value as any })}>
                      <option>left</option>
                      <option>center</option>
                      <option>right</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
            {!fields.length && <div className="text-slate-500 text-sm">No fields yet.</div>}
          </div>
          <button className="btn-primary w-full mt-4" onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save Mapping</>}
          </button>
        </div>
      </div>
    </AppShell>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        type="number"
        className="input"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value || '0', 10))}
      />
    </div>
  );
}

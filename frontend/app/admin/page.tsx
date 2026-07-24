'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { AppShell } from '@/components/AppShell';
import { useRequireRole } from '@/hooks/use-require-role';
import {
  FileText,
  Award,
  ClipboardCheck,
  Briefcase,
  Loader2,
} from 'lucide-react';

// NOTE: endpoint paths below are inferred from the areas this project already
// has (templates / certificates / attendance / internships). If your backend
// exposes different routes or a dedicated /admin/stats summary endpoint,
// swap the queryFn bodies below accordingly — the rest of the page doesn't
// need to change.

function countFrom(data: unknown): number {
  if (Array.isArray(data)) return data.length;
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (typeof obj.total === 'number') return obj.total;
    if (typeof obj.count === 'number') return obj.count;
    if (Array.isArray(obj.items)) return obj.items.length;
    if (Array.isArray(obj.data)) return obj.data.length;
    if (Array.isArray(obj.records)) return obj.records.length;
    if (Array.isArray(obj.results)) return obj.results.length;
    if (Array.isArray((obj as any).attendance)) return (obj as any).attendance.length;
    if (Array.isArray((obj as any).sessions)) return (obj as any).sessions.length;
    const meta = obj.meta as Record<string, unknown> | undefined;
    if (meta && typeof meta.total === 'number') return meta.total;
    const pagination = obj.pagination as Record<string, unknown> | undefined;
    if (pagination && typeof pagination.total === 'number') return pagination.total;
  }
  return 0;
}

// The attendance list endpoint didn't match the plain "/attendance" guess used
// for the other cards, so its query throws (stat.isError) rather than just
// returning an odd shape. Try the endpoint the Attendance admin page itself
// uses first, falling back to close variants, and stop at the first one that
// actually responds.
const ATTENDANCE_ENDPOINT_CANDIDATES = [
  '/attendance',
  '/attendance/records',
  '/attendance-records',
  '/admin/attendance',
];

async function fetchAttendanceCount(): Promise<number> {
  let lastError: unknown = null;
  for (const path of ATTENDANCE_ENDPOINT_CANDIDATES) {
    try {
      const res = await api.get(path);
      return countFrom(res.data);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError ?? new Error('No attendance endpoint responded');
}

type StatCard = {
  key: string;
  label: string;
  href: string;
  icon: typeof FileText;
  queryKey: string[];
  fetchPath: string;
};

const STAT_CARDS: StatCard[] = [
  {
    key: 'templates',
    label: 'Templates',
    href: '/admin/templates',
    icon: FileText,
    queryKey: ['admin-stats', 'templates'],
    fetchPath: '/templates',
  },
  {
    key: 'certificates',
    label: 'Certificates',
    href: '/admin/certificates',
    icon: Award,
    queryKey: ['admin-stats', 'certificates'],
    fetchPath: '/certificates',
  },
  {
    key: 'attendance',
    label: 'Attendance Records',
    href: '/admin/attendance',
    icon: ClipboardCheck,
    queryKey: ['admin-stats', 'attendance'],
    fetchPath: '/attendance',
  },
  {
    key: 'internships',
    label: 'Internships',
    href: '/admin/internships',
    icon: Briefcase,
    queryKey: ['admin-stats', 'internships'],
    fetchPath: '/internships',
  },
];

function StatTile({ card }: { card: StatCard }) {
  const Icon = card.icon;
  const isAttendance = card.key === 'attendance';
  const stat = useQuery({
    queryKey: card.queryKey,
    queryFn: async () =>
      isAttendance ? fetchAttendanceCount() : countFrom((await api.get(card.fetchPath)).data),
  });

  return (
    <Link href={card.href} className="card hover:border-neon-500 transition-colors">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-slate-400 text-sm">{card.label}</div>
          <div className="font-display text-3xl mt-1">
            {stat.isLoading ? (
              <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
            ) : stat.isError ? (
              <span className="text-slate-500">—</span>
            ) : (
              stat.data
            )}
          </div>
        </div>
        <Icon className="w-8 h-8 text-neon-400" />
      </div>
    </Link>
  );
}

export default function AdminOverview() {
  const user = useRequireRole('ADMIN');

  if (!user) return null;

  return (
    <AppShell role="ADMIN">
      <h1 className="font-display text-3xl">Admin Overview</h1>
      <p className="text-slate-400 mt-1">
        Quick summary of templates, certificates, attendance, and internships.
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {STAT_CARDS.map((card) => (
          <StatTile key={card.key} card={card} />
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <div className="card">
          <h2 className="font-display text-lg mb-3">Quick Links</h2>
          <div className="flex flex-col gap-2">
            <Link href="/admin/templates" className="btn-ghost justify-start">
              <FileText className="w-4 h-4" /> Manage Templates
            </Link>
            <Link href="/admin/certificates" className="btn-ghost justify-start">
              <Award className="w-4 h-4" /> Manage Certificates
            </Link>
            <Link href="/admin/attendance" className="btn-ghost justify-start">
              <ClipboardCheck className="w-4 h-4" /> Manage Attendance
            </Link>
            <Link href="/admin/internships" className="btn-ghost justify-start">
              <Briefcase className="w-4 h-4" /> Manage Internships
            </Link>
          </div>
        </div>

        <div className="card">
          <h2 className="font-display text-lg mb-3">System</h2>
          <p className="text-slate-500 text-sm">
            Signed in as <span className="font-mono text-neon-400">{user.email ?? user.name ?? 'admin'}</span>.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
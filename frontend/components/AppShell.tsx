'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api-client';
import {
  LayoutDashboard,
  Users,
  BookMarked,
  ClipboardList,
  FileText,
  ScrollText,
  LogOut,
  Settings,
  MessageSquareWarning,
  Webhook,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Role } from '@/types';

type NavItem = { label: string; href: string; icon: React.ReactNode };

const NAV: Record<Role, NavItem[]> = {
  ADMIN: [
    { label: 'Overview', href: '/admin', icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: 'Users', href: '/admin/users', icon: <Users className="w-4 h-4" /> },
    { label: 'Internships', href: '/admin/internships', icon: <BookMarked className="w-4 h-4" /> },
    { label: 'Attendance', href: '/admin/attendance', icon: <ClipboardList className="w-4 h-4" /> },
    { label: 'Templates', href: '/admin/templates', icon: <Settings className="w-4 h-4" /> },
    { label: 'Certificates', href: '/admin/certificates', icon: <ScrollText className="w-4 h-4" /> },
    { label: 'Complaints', href: '/admin/complaints', icon: <MessageSquareWarning className="w-4 h-4" /> },
    { label: 'Webhooks', href: '/admin/webhooks', icon: <Webhook className="w-4 h-4" /> },
  ],
  MENTOR: [
    { label: 'Overview', href: '/mentor', icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: 'Attendance', href: '/mentor/attendance', icon: <ClipboardList className="w-4 h-4" /> },
    { label: 'Import', href: '/mentor/import', icon: <FileText className="w-4 h-4" /> },
    { label: 'Complaints', href: '/mentor/complaints', icon: <MessageSquareWarning className="w-4 h-4" /> },
  ],
  STUDENT: [
    { label: 'Overview', href: '/student', icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: 'My Certificate', href: '/student/certificate', icon: <ScrollText className="w-4 h-4" /> },
    { label: 'Complaints', href: '/student/complaints', icon: <MessageSquareWarning className="w-4 h-4" /> },
  ],
};

export function AppShell({ children, role }: { children: React.ReactNode; role: Role }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clear } = useAuthStore();

  async function logout() {
    try {
      await api.post('/auth/logout');
    } catch {}
    clear();
    router.replace(role === 'ADMIN' ? '/admin/login' : '/auth/login');
  }

  const items = NAV[role];

  return (
    <div className="min-h-screen bg-bg-950 text-slate-100 grid grid-cols-[260px_1fr]">
      <aside className="border-r border-line bg-bg-900/60 backdrop-blur-xl p-4 flex flex-col gap-2 min-h-screen">
        <Link href="/" className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-neon-500 to-cyan-glow flex items-center justify-center font-bold text-bg-950 text-sm">
            iT
          </div>
          <div>
            <div className="font-display font-semibold">InternTrack</div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500">{role}</div>
          </div>
        </Link>

        {items.map((it) => {
          const active = pathname === it.href;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-neon-500/10 text-neon-400 border border-neon-500/30'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-bg-800/60 border border-transparent',
              )}
            >
              {it.icon}
              {it.label}
            </Link>
          );
        })}

        <div className="mt-auto pt-4 border-t border-line">
          <div className="px-2 py-2 text-xs">
            <div className="font-semibold text-slate-200 truncate">
              {user?.firstName} {user?.lastName}
            </div>
            <div className="text-slate-500 truncate">{user?.email}</div>
          </div>
          <button onClick={logout} className="btn-ghost w-full mt-2">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      <main className="min-h-screen">
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-bg-950/70 border-b border-line px-8 py-4">
          <div className="text-xs uppercase tracking-widest text-slate-500">
            {pathname === `/${role.toLowerCase()}` ? 'Overview' : pathname}
          </div>
        </header>
        <div className="px-8 py-8">{children}</div>
      </main>
    </div>
  );
}

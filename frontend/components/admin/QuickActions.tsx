import Link from 'next/link';
import {
  UserCog,
  BookMarked,
  ScrollText,
  ClipboardList,
  MessageSquareWarning,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';

interface QuickAction {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

const ACTIONS: QuickAction[] = [
  { label: 'Manage Users', description: 'View, edit, and manage accounts', href: '/admin/users', icon: UserCog },
  { label: 'Internships', description: 'Create and track internship programs', href: '/admin/internships', icon: BookMarked },
  { label: 'Certificates', description: 'Issue and review certificates', href: '/admin/certificates', icon: ScrollText },
  { label: 'Attendance', description: 'Review attendance records', href: '/admin/attendance', icon: ClipboardList },
  { label: 'Complaints', description: 'Resolve open student complaints', href: '/admin/complaints', icon: MessageSquareWarning },
];

export function QuickActions() {
  return (
    <div className="card">
      <h2 className="font-display text-lg text-slate-100">Quick Actions</h2>
      <nav className="mt-4 flex flex-col gap-2" aria-label="Quick actions">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className="group flex items-center gap-3 rounded-lg border border-transparent px-3 py-3 transition-all hover:-translate-y-0.5 hover:border-neon-500/40 hover:bg-neon-500/5"
            >
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-bg-800 text-neon-400 transition-colors group-hover:bg-neon-500/10">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-slate-200">{action.label}</div>
                <div className="truncate text-xs text-slate-500">{action.description}</div>
              </div>
              <ArrowRight
                className="h-4 w-4 shrink-0 text-slate-600 transition-transform group-hover:translate-x-0.5 group-hover:text-neon-400"
                aria-hidden="true"
              />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

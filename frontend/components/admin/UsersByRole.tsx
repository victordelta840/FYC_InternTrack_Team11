import { Users, ShieldCheck, GraduationCap, type LucideIcon } from 'lucide-react';
import { fmtNumber, isFiniteNumber } from '@/lib/utils/format';
import type { UsersByRoleMap } from './types';

interface UsersByRoleProps {
  usersByRole?: UsersByRoleMap;
}

type RoleKey = 'ADMIN' | 'MENTOR' | 'STUDENT';

const ROLE_META: Record<RoleKey, { label: string; icon: LucideIcon }> = {
  STUDENT: { label: 'Students', icon: GraduationCap },
  MENTOR: { label: 'Mentors', icon: Users },
  ADMIN: { label: 'Admins', icon: ShieldCheck },
};

const ROLE_ORDER: RoleKey[] = ['STUDENT', 'MENTOR', 'ADMIN'];

export function UsersByRole({ usersByRole }: UsersByRoleProps) {
  const total = ROLE_ORDER.reduce((sum, role) => {
    const v = usersByRole?.[role];
    return sum + (isFiniteNumber(v) ? v : 0);
  }, 0);

  return (
    <div className="card">
      <h2 className="font-display text-lg text-slate-100">Users by Role</h2>
      <div className="mt-4 space-y-4">
        {ROLE_ORDER.map((role) => {
          const meta = ROLE_META[role];
          const Icon = meta.icon;
          const raw = usersByRole?.[role];
          const count = isFiniteNumber(raw) ? raw : 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;

          return (
            <div key={role}>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-slate-300">
                  <Icon className="h-4 w-4 text-neon-400" aria-hidden="true" />
                  {meta.label}
                </span>
                <span className="font-mono text-slate-400">{fmtNumber(raw)}</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-bg-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-neon-500 to-cyan-glow transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

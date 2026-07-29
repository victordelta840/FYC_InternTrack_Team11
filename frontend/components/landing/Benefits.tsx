import { Building2, GraduationCap, UserCog, Check } from 'lucide-react';
import { cn } from '@/lib/cn';

const GROUPS = [
  {
    icon: Building2,
    title: 'For Colleges',
    accent: 'text-neon-400 border-neon-500/30 bg-neon-500/10',
    points: [
      'Centralized oversight across every department and batch',
      'Audit-ready attendance and certificate records',
      'Configurable certificate templates per program',
      'Webhook integration with existing campus systems',
    ],
  },
  {
    icon: GraduationCap,
    title: 'For Students',
    accent: 'text-cyan-glow border-cyan-glow/30 bg-cyan-glow/10',
    points: [
      'A live view of attendance and certificate eligibility',
      'Certificates available the moment you qualify',
      'Raise and track complaints without email back-and-forth',
      'One dashboard for your entire internship',
    ],
  },
  {
    icon: UserCog,
    title: 'For Mentors',
    accent: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    points: [
      'Bulk import attendance instead of entering it one by one',
      'A clear queue of complaints that need a response',
      'A batch-level view of every assigned student',
      'No admin-only tools cluttering your dashboard',
    ],
  },
];

export function Benefits() {
  return (
    <section id="benefits" className="border-t border-line bg-bg-900/40 px-6 py-24 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-2xl">
          <div className="label">Benefits</div>
          <h2 className="font-display text-3xl font-bold text-slate-50 sm:text-4xl">
            Built for everyone in the program, not just the admin
          </h2>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {GROUPS.map((g) => (
            <div key={g.title} className="card flex h-full flex-col">
              <div
                className={cn(
                  'mb-5 flex h-11 w-11 items-center justify-center rounded-lg border',
                  g.accent,
                )}
              >
                <g.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-xl font-semibold text-slate-100">{g.title}</h3>
              <ul className="mt-4 flex flex-1 flex-col gap-3">
                {g.points.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-sm text-slate-400">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-neon-500" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

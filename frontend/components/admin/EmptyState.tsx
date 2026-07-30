import { Sparkles } from 'lucide-react';

export function AdminDashboardEmpty() {
  return (
    <div className="card flex flex-col items-center gap-3 py-16 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-neon-500/10 text-neon-400">
        <Sparkles className="h-6 w-6" aria-hidden="true" />
      </div>
      <div>
        <h2 className="font-display text-lg text-slate-100">Nothing to show yet</h2>
        <p className="mt-1 max-w-sm text-sm text-slate-500">
          Once users, internships, and activity start flowing through InternTrack, your summary will appear
          here.
        </p>
      </div>
    </div>
  );
}

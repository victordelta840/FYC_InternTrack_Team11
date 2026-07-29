import { CalendarDays, ShieldCheck, GaugeCircle, LayoutDashboard } from 'lucide-react';

const POINTS = [
  {
    icon: CalendarDays,
    title: 'Built around academic calendars',
    description: 'Batches, mentors, and thresholds map to how internships actually run at a college — by semester, not by sprint.',
  },
  {
    icon: GaugeCircle,
    title: 'Eligibility calculated in real time',
    description: 'No spreadsheet reconciliation at the end of the term — every attendance entry updates the eligibility number instantly.',
  },
  {
    icon: LayoutDashboard,
    title: 'A dashboard for every role',
    description: 'Admins, mentors, and students see exactly what\u2019s relevant to them, so no one is digging through someone else\u2019s view.',
  },
  {
    icon: ShieldCheck,
    title: 'Audit-ready by default',
    description: 'Attendance edits, complaint resolutions, and certificate issuance are all recorded, not overwritten.',
  },
];

export function WhyInternTrack() {
  return (
    <section className="border-t border-line bg-bg-900/40 px-6 py-24 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-14 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <div className="label">Why InternTrack</div>
            <h2 className="font-display text-3xl font-bold text-slate-50 sm:text-4xl">
              Purpose-built for internship offices, not repurposed HR software
            </h2>
            <p className="mt-4 text-slate-400">
              Generic tools force your program into their workflow. InternTrack was designed around
              how colleges actually manage internships.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {POINTS.map((p) => (
              <div key={p.title} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-bg-800/60 text-neon-400">
                  <p.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-base font-semibold text-slate-100">{p.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{p.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

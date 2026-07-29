import {
  ClipboardList,
  ScrollText,
  MessageSquareWarning,
  BookMarked,
  LayoutDashboard,
  Webhook,
} from 'lucide-react';

const FEATURES = [
  {
    icon: ClipboardList,
    title: 'Attendance Tracking',
    description:
      'Log daily attendance per intern or import it in bulk. Eligibility percentages recalculate automatically as records come in.',
  },
  {
    icon: ScrollText,
    title: 'Certificate Generation',
    description:
      'Certificates are issued from configurable templates the moment an intern crosses the attendance threshold — no manual sign-off queue.',
  },
  {
    icon: MessageSquareWarning,
    title: 'Complaint Management',
    description:
      'Students raise complaints directly, mentors triage them, and admins keep a full resolution history per batch.',
  },
  {
    icon: BookMarked,
    title: 'Internship & Batch Management',
    description:
      'Organize internships by department, batch, and mentor, with a single place to see who is assigned where.',
  },
  {
    icon: LayoutDashboard,
    title: 'Role-Based Dashboards',
    description:
      'Admins, mentors, and students each get a dashboard scoped to what they need to see and act on — nothing more.',
  },
  {
    icon: Webhook,
    title: 'Webhooks & Integrations',
    description:
      'Push attendance, certificate, and complaint events to your existing campus systems as they happen.',
  },
];

export function Features() {
  return (
    <section id="features" className="border-t border-line px-6 py-24 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-2xl">
          <div className="label">Features</div>
          <h2 className="font-display text-3xl font-bold text-slate-50 sm:text-4xl">
            Everything a program office actually uses
          </h2>
          <p className="mt-4 text-slate-400">
            Not a generic project tracker — every module maps to a real step in running a college
            internship program, from onboarding to the final certificate.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-neon-500/30 bg-neon-500/10 text-neon-400">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-semibold text-slate-100">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

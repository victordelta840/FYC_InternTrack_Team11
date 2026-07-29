import { Users, ClipboardCheck, ScrollText } from 'lucide-react';

const STEPS = [
  {
    icon: Users,
    step: '01',
    title: 'Set up your program',
    description:
      'Create internships, define batches, and add mentors and students. Assign each mentor the students they are responsible for.',
  },
  {
    icon: ClipboardCheck,
    step: '02',
    title: 'Track daily activity',
    description:
      'Mentors log or import attendance and resolve complaints. Every entry updates each student\u2019s live eligibility percentage.',
  },
  {
    icon: ScrollText,
    step: '03',
    title: 'Certificates issue themselves',
    description:
      'Once a student crosses the attendance threshold, their certificate becomes available from your template automatically.',
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-t border-line px-6 py-24 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-2xl">
          <div className="label">How it works</div>
          <h2 className="font-display text-3xl font-bold text-slate-50 sm:text-4xl">
            From onboarding to certificate, in three steps
          </h2>
        </div>

        <div className="relative mt-14 grid gap-8 lg:grid-cols-3">
          <div className="absolute left-0 right-0 top-6 hidden h-px bg-line lg:block" />
          {STEPS.map((s) => (
            <div key={s.step} className="relative">
              <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border border-line bg-bg-900 text-neon-400">
                <s.icon className="h-5 w-5" />
              </div>
              <div className="mt-5 font-mono text-xs uppercase tracking-widest text-neon-500">
                Step {s.step}
              </div>
              <h3 className="mt-1 font-display text-xl font-semibold text-slate-100">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{s.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

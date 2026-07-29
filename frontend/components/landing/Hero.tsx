import Link from 'next/link';
import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { ProgressRing } from '@/components/ProgressRing';

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-grid-fade">
      <div className="mx-auto grid max-w-7xl gap-16 px-6 pb-24 pt-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-8 lg:pb-32 lg:pt-28">
        <div>
          <div className="badge-active mb-6 w-fit">
            <Sparkles className="mr-1.5 h-3 w-3" />
            Built for college internship programs
          </div>

          <h1 className="font-display text-4xl font-bold leading-[1.08] tracking-tight text-slate-50 sm:text-5xl lg:text-6xl">
            Run your internship program like an{' '}
            <span className="bg-gradient-to-r from-neon-400 to-cyan-glow bg-clip-text text-transparent">
              enterprise, not a spreadsheet
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg">
            InternTrack gives admins, mentors, and students one shared system for attendance,
            complaints, and certificate eligibility — with role-based dashboards and audit-ready
            records for every batch.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/auth/login" className="btn-primary text-base">
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/auth/login" className="btn-ghost text-base">
              Login
            </Link>
          </div>

          <div className="mt-8 flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="h-4 w-4 text-neon-400" />
            Role-based access for Admins, Mentors, and Students
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-sm">
          <div className="card relative overflow-hidden">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <div className="label mb-0">Certificate Eligibility</div>
                <div className="font-display text-sm text-slate-200">Priya Sharma · Batch 2026</div>
              </div>
              <span className="badge-active">On Track</span>
            </div>

            <div className="flex items-center justify-center py-4">
              <ProgressRing percentage="92.40" threshold="90.00" label="Attendance" />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-line bg-bg-800/60 px-3 py-2.5">
                <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
                  Threshold
                </div>
                <div className="font-display text-lg font-semibold text-slate-100">90.00%</div>
              </div>
              <div className="rounded-lg border border-line bg-bg-800/60 px-3 py-2.5">
                <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
                  Days Logged
                </div>
                <div className="font-display text-lg font-semibold text-slate-100">108 / 117</div>
              </div>
            </div>
          </div>

          <div className="card absolute -bottom-6 -left-8 hidden w-48 sm:block">
            <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
              Open Complaints
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="badge-warn">2 pending</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

'use client';

import Link from 'next/link';
import { ArrowRight, ShieldCheck, TrendingUp, FileCheck2 } from 'lucide-react';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-bg-950 text-slate-100 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-fade pointer-events-none" />
      <div className="absolute -top-24 -left-24 w-[500px] h-[500px] rounded-full bg-neon-500/10 blur-3xl" />
      <div className="absolute -bottom-32 right-0 w-[600px] h-[600px] rounded-full bg-cyan-glow/10 blur-3xl" />

      <nav className="relative z-10 flex items-center justify-between px-10 py-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-neon-500 to-cyan-glow flex items-center justify-center font-bold text-bg-950 shadow-neon">
            iT
          </div>
          <span className="font-display text-xl">InternTrack</span>
          <span className="badge-active ml-1">ENTERPRISE</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/auth/login" className="btn-ghost">Sign In</Link>
          <Link href="/auth/register" className="btn-primary">
            Get Started <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </nav>

      <section className="relative z-10 max-w-6xl mx-auto px-10 pt-20 pb-32">
        <div className="max-w-3xl">
          <span className="badge-active mb-6">v1.0 · Self-hosted · MySQL + XAMPP</span>
          <h1 className="font-display text-6xl leading-[1.05] font-bold mt-4">
            The Command Center for
            <span className="block bg-gradient-to-r from-neon-400 via-cyan-glow to-neon-500 bg-clip-text text-transparent">
              College Internships.
            </span>
          </h1>
          <p className="mt-6 text-lg text-slate-400 leading-relaxed">
            Precision attendance math, an unforgiving 90.00% certificate rule, and a completely
            offline AI mapping engine. Runs 100% on your XAMPP + MySQL stack — no cloud dependencies.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/auth/login" className="btn-primary">
              Login to Portal <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/admin/login" className="btn-ghost">Administrator Access</Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20">
          <Feature
            icon={<TrendingUp />}
            title="Precision Attendance"
            body="DECIMAL(5,2) math. HALF_DAY counts as 0.5. No float drift, ever."
          />
          <Feature
            icon={<FileCheck2 />}
            title="90.00% Absolute Rule"
            body="Certificates are auto-blocked at 89.99%. Zero exceptions, ever."
          />
          <Feature
            icon={<ShieldCheck />}
            title="Enterprise Security"
            body="RS256 JWT, Argon2id hashing, immutable audit trail. FERPA-friendly."
          />
        </div>
      </section>
    </main>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="card group hover:border-neon-500/50 transition-colors">
      <div className="w-10 h-10 rounded-lg bg-neon-500/10 text-neon-400 flex items-center justify-center mb-4 group-hover:bg-neon-500/20 transition-colors">
        {icon}
      </div>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <p className="text-sm text-slate-400 mt-2 leading-relaxed">{body}</p>
    </div>
  );
}

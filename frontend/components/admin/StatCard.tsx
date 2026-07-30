'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

/**
 * Eases a number up from 0 to `target` over `durationMs`.
 * Returns 0 (and stays there) when target is null so callers never see NaN.
 */
function useCountUp(target: number | null, durationMs = 800): number {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === null) {
      setValue(0);
      return;
    }

    const start = performance.now();

    function tick(now: number) {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round((target as number) * eased));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [target, durationMs]);

  return value;
}

export type StatTone = 'ok' | 'warn' | 'neutral';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number | null;
  hint?: string;
  tone?: StatTone;
  href?: string;
}

const TONE_DOT: Record<StatTone, string> = {
  ok: 'bg-neon-400',
  warn: 'bg-amber-400',
  neutral: 'bg-slate-500',
};

const TONE_GLOW: Record<StatTone, string> = {
  ok: 'hover:shadow-[0_0_0_1px_rgba(56,189,248,0.25),0_0_24px_-6px_rgba(56,189,248,0.35)]',
  warn: 'hover:shadow-[0_0_0_1px_rgba(245,158,11,0.25),0_0_24px_-6px_rgba(245,158,11,0.35)]',
  neutral: 'hover:shadow-[0_0_0_1px_rgba(148,163,184,0.2),0_0_24px_-6px_rgba(148,163,184,0.25)]',
};

export function StatCard({ icon: Icon, label, value, hint, tone = 'neutral', href }: StatCardProps) {
  const animated = useCountUp(value);
  const display = value === null ? 'N/A' : animated.toLocaleString();

  const body = (
    <div
      className={`card group relative overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:border-neon-500/40 ${TONE_GLOW[tone]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE_DOT[tone]}`} aria-hidden="true" />
            <span className="truncate text-sm text-slate-400">{label}</span>
          </div>
          <div className="mt-1 font-display text-3xl tabular-nums text-slate-50">{display}</div>
          {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
        </div>
        <div className="shrink-0 rounded-lg bg-neon-500/10 p-2 text-neon-400 transition-colors group-hover:bg-neon-500/15">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        aria-label={`${label}: ${display}`}
        className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-neon-500/60"
      >
        {body}
      </Link>
    );
  }

  return body;
}

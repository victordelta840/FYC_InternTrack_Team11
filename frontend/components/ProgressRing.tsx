'use client';

import { cn } from '@/lib/cn';

interface Props {
  percentage: string; // e.g. "89.99"
  threshold?: string;
  size?: number;
  label?: string;
}

export function ProgressRing({ percentage, threshold = '90.00', size = 140, label }: Props) {
  const pct = Math.max(0, Math.min(100, parseFloat(percentage)));
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const eligible = parseFloat(percentage) >= parseFloat(threshold);

  return (
    <div className="relative inline-flex flex-col items-center">
      <svg width={size} height={size} className="progress-ring -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          fill="none"
          className="stroke-line"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn(eligible ? 'stroke-neon-500' : 'stroke-amber-400')}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className={cn('font-display text-3xl font-bold', eligible ? 'text-neon-400' : 'text-amber-400')}>
          {percentage}%
        </div>
        <div className="text-[10px] uppercase tracking-widest text-slate-500 mt-1">
          {label ?? 'Attendance'}
        </div>
      </div>
    </div>
  );
}

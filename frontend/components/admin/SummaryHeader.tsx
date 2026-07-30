import { fmtNumber, fmtText } from './format';

interface SummaryChip {
  label: string;
  value: number | null;
}

interface SummaryHeaderProps {
  name: string;
  chips: SummaryChip[];
}

export function SummaryHeader({ name, chips }: SummaryHeaderProps) {
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-xs uppercase tracking-widest text-slate-500">{today}</p>
        <h1 className="mt-1 font-display text-3xl text-slate-50">
          Welcome back, {fmtText(name, 'Admin')}
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Here&apos;s what&apos;s happening across InternTrack today.
        </p>
      </div>

      <div className="flex flex-wrap gap-2" aria-label="Summary stats">
        {chips.map((chip) => (
          <div
            key={chip.label}
            className="flex items-center gap-2 rounded-full border border-line bg-bg-900/60 px-3 py-1.5 text-xs backdrop-blur-xl"
          >
            <span className="text-slate-500">{chip.label}</span>
            <span className="font-mono font-semibold text-neon-400">{fmtNumber(chip.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

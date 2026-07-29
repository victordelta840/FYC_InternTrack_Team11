const STATS = [
  { value: '3', label: 'Role-based portals', sub: 'Admin, Mentor, Student' },
  { value: '90%', label: 'Configurable threshold', sub: 'Certificate eligibility' },
  { value: 'Auto', label: 'Certificate issuance', sub: 'On threshold reached' },
  { value: 'Live', label: 'Eligibility updates', sub: 'On every attendance entry' },
];

export function Stats() {
  return (
    <section className="border-t border-line px-6 py-16 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="card text-center">
              <div className="font-display text-3xl font-bold text-neon-400 sm:text-4xl">
                {s.value}
              </div>
              <div className="mt-2 text-sm font-medium text-slate-200">{s.label}</div>
              <div className="mt-1 font-mono text-[11px] uppercase tracking-widest text-slate-500">
                {s.sub}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

import Link from 'next/link';

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'How it works', href: '#how-it-works' },
      { label: 'Benefits', href: '#benefits' },
      { label: 'FAQ', href: '#faq' },
    ],
  },
  {
    title: 'Portals',
    links: [
      { label: 'Student login', href: '/auth/login' },
      { label: 'Mentor login', href: '/auth/login' },
      { label: 'Admin login', href: '/admin/login' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-line px-6 py-14 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 sm:grid-cols-[1.3fr_1fr_1fr]">
          <div>
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-neon-500 to-cyan-glow text-sm font-bold text-bg-950">
                iT
              </div>
              <span className="font-display text-lg font-semibold text-slate-100">InternTrack</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm text-slate-500">
              Internship management built for college internship programs — attendance,
              complaints, and certificates in one system.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <div className="label">{col.title}</div>
              <ul className="mt-3 flex flex-col gap-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-slate-400 transition-colors hover:text-neon-400"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-line pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>&copy; {new Date().getFullYear()} InternTrack. All rights reserved.</span>
          <span className="font-mono uppercase tracking-widest">Enterprise Internship Management</span>
        </div>
      </div>
    </footer>
  );
}

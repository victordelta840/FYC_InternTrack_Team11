'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

const LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Benefits', href: '#benefits' },
  { label: 'FAQ', href: '#faq' },
];

export function LandingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-neon-500 to-cyan-glow text-sm font-bold text-bg-950">
            iT
          </div>
          <span className="font-display text-lg font-semibold text-slate-100">InternTrack</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-slate-400 transition-colors hover:text-neon-400"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/auth/login" className="btn-ghost">
            Login
          </Link>
          <Link href="/auth/login" className="btn-primary">
            Get Started
          </Link>
        </div>

        <button
          className="flex h-9 w-9 items-center justify-center rounded-md border border-line text-slate-300 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-line bg-bg-950 px-6 py-4 md:hidden">
          <nav className="flex flex-col gap-4">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="text-sm font-medium text-slate-400 hover:text-neon-400"
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-2">
            <Link href="/auth/login" className="btn-ghost w-full">
              Login
            </Link>
            <Link href="/auth/login" className="btn-primary w-full">
              Get Started
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

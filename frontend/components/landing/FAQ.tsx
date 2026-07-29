'use client';

import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/cn';

const FAQS = [
  {
    question: 'What is InternTrack?',
    answer:
      'InternTrack is an internship management system for colleges. It gives admins, mentors, and students a shared place to manage attendance, complaints, and certificate eligibility for every internship batch.',
  },
  {
    question: 'How is attendance eligibility calculated?',
    answer:
      'Each student\u2019s attendance percentage updates automatically as entries are logged or imported. Once it crosses your program\u2019s configured threshold, the student becomes eligible for their certificate.',
  },
  {
    question: 'Can mentors import attendance in bulk?',
    answer:
      'Yes. Mentors can import attendance records for their assigned students instead of entering each one individually, from the Import section of the mentor dashboard.',
  },
  {
    question: 'How are certificates generated?',
    answer:
      'Admins configure certificate templates per internship. Once a student crosses the eligibility threshold, their certificate is generated from that template automatically.',
  },
  {
    question: 'Is InternTrack data audit-ready?',
    answer:
      'Attendance changes, complaint resolutions, and certificate issuance are recorded rather than overwritten, so there\u2019s a traceable history for every student.',
  },
  {
    question: 'Can InternTrack connect to our existing campus systems?',
    answer:
      'Yes, through webhooks. Attendance, complaint, and certificate events can be pushed to other systems as they happen.',
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="border-t border-line px-6 py-24 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <div className="label mx-auto w-fit">FAQ</div>
          <h2 className="font-display text-3xl font-bold text-slate-50 sm:text-4xl">
            Frequently asked questions
          </h2>
        </div>

        <div className="mt-12 flex flex-col gap-3">
          {FAQS.map((f, i) => {
            const open = openIndex === i;
            return (
              <div key={f.question} className="card">
                <button
                  className="flex w-full items-center justify-between gap-4 text-left"
                  onClick={() => setOpenIndex(open ? null : i)}
                  aria-expanded={open}
                >
                  <span className="font-display text-base font-semibold text-slate-100">
                    {f.question}
                  </span>
                  <span
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-line text-slate-400 transition-colors',
                      open && 'border-neon-500/40 text-neon-400',
                    )}
                  >
                    {open ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                  </span>
                </button>
                {open && (
                  <p className="mt-3 text-sm leading-relaxed text-slate-400">{f.answer}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

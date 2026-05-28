'use client';

import { useEffect, useRef, useState } from 'react';
import { GLOSSARY } from '@/lib/glossary';

// Inline, tap-to-explain term. Shows the glossary label with a dotted underline
// and a small info marker; tapping toggles a plain-language explanation popover.
// Closes on outside click or Escape.
export function InfoTip({ term, className = '' }: { term: string; className?: string }) {
  const entry = GLOSSARY[term];
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!entry) return <span className={className}>{term}</span>;

  return (
    <span ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`inline-flex items-center gap-0.5 underline decoration-dotted decoration-1 underline-offset-2 ${className}`}
      >
        {entry.label}
        <span aria-hidden className="text-[0.9em] opacity-60">ⓘ</span>
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute left-0 top-full z-50 mt-1 block w-60 rounded-lg border border-slate-700 bg-slate-900 p-3 text-left text-xs font-normal normal-case leading-relaxed tracking-normal text-slate-200 shadow-xl"
        >
          <span className="mb-1 block font-semibold text-white">{entry.label}</span>
          {entry.text}
        </span>
      )}
    </span>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { SPORT_TIP_JOURNAL_CHANGED_EVENT, loadTipJournal } from '@/lib/sport/tip-journal';
import { computeSanityHints, type SanityHint } from '@/lib/sport/sanity-hint';

export function SanityHints() {
  const [hints, setHints] = useState<SanityHint[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setHints(computeSanityHints(loadTipJournal()));
    sync();
    setMounted(true);
    window.addEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
    return () => window.removeEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
  }, []);

  if (!mounted || hints.length === 0) return null;

  return (
    <ul className="space-y-1.5">
      {hints.map((h) => {
        const cls = h.severity === 'warn'
          ? 'border-amber-500/40 bg-amber-950/15 text-amber-100/90'
          : 'border-sky-400/30 bg-sky-950/15 text-sky-100/90';
        return (
          <li key={h.id} className={`rounded-md border px-3 py-2 text-[11px] leading-snug ${cls}`}>
            <span className="font-semibold uppercase tracking-wider opacity-70">{h.severity === 'warn' ? 'achtung' : 'hinweis'}</span>
            <span className="ml-1.5">{h.text}</span>
          </li>
        );
      })}
    </ul>
  );
}

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ROHSTOFF_WATCHLIST_CHANGED_EVENT,
  RohstoffWatchlistItem,
  loadRohstoffWatchlist,
  removeRohstoffWatch
} from '@/lib/rohstoff-watchlist';

interface GradeInfo {
  symbol: string;
  grade: string;
  score: number;
}

const GRADE_TONE: Record<string, string> = {
  A: 'border-emerald-400/50 bg-emerald-500/15 text-emerald-100',
  B: 'border-sky-400/40 bg-sky-500/10 text-sky-200',
  C: 'border-amber-400/40 bg-amber-500/10 text-amber-200',
  D: 'border-rose-500/50 bg-rose-500/15 text-rose-200'
};

// Kompakte Rohstoff-Watchlist auf der Startseite. Pro Eintrag Live-Grade-Badge
// aus dem Safety-Scan (Server-Prop), damit der Client nichts fetchen muss.
export function RohstoffWatchlistStrip({ grades = [] }: { grades?: GradeInfo[] }) {
  const [items, setItems] = useState<RohstoffWatchlistItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setItems(loadRohstoffWatchlist());
    sync();
    setMounted(true);
    window.addEventListener(ROHSTOFF_WATCHLIST_CHANGED_EVENT, sync);
    return () => window.removeEventListener(ROHSTOFF_WATCHLIST_CHANGED_EVENT, sync);
  }, []);

  if (!mounted || items.length === 0) return null;
  const gradeMap = new Map(grades.map((g) => [g.symbol, g]));

  return (
    <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Meine Rohstoff-Watchlist</h2>
        <Link href="/rohstoffe/watchlist" className="text-[10px] text-sky-300 hover:text-sky-200">verwalten →</Link>
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {items.map((w) => {
          const g = gradeMap.get(w.symbol);
          return (
            <li key={w.symbol} className="group inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950/40 pl-2 pr-1 py-1 text-[11px]">
              <Link
                href={`/rohstoffe/${encodeURIComponent(w.symbol)}`}
                className="flex items-baseline gap-1.5 text-slate-100 hover:text-emerald-300"
              >
                <span className="font-semibold">{w.name}</span>
                {g && (
                  <span className={`rounded border px-1 py-0 text-[9px] font-bold uppercase tracking-wider ${GRADE_TONE[g.grade] ?? 'border-slate-700 bg-slate-900 text-slate-400'}`}>
                    {g.grade}
                  </span>
                )}
              </Link>
              <button
                onClick={(e) => { e.preventDefault(); removeRohstoffWatch(w.symbol); }}
                className="ml-0.5 px-1 text-[11px] text-slate-500 hover:text-rose-300"
                title="Aus Watchlist entfernen"
                aria-label={`${w.name} aus Watchlist entfernen`}
              >
                ×
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { SPORT_TIP_JOURNAL_CHANGED_EVENT, loadTipJournal, type TipJournalEntry } from '@/lib/sport/tip-journal';

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'Europe/Berlin' });
}

const OUTCOME_LABEL: Record<TipJournalEntry['outcome'], string> = {
  pending: 'offen',
  win: 'Treffer',
  loss: 'daneben',
  push: 'Push'
};

// Volltext-Suche im Tipp-Tagebuch über Team-Namen, Liga, Markt. Suchet
// case-insensitive und blendet sich aus, wenn das Tagebuch leer ist.
export function TipJournalSearch() {
  const [log, setLog] = useState<TipJournalEntry[]>([]);
  const [query, setQuery] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setLog(loadTipJournal());
    sync();
    setMounted(true);
    window.addEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
    return () => window.removeEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return log
      .filter((e) =>
        e.homeTeam.toLowerCase().includes(q) ||
        e.awayTeam.toLowerCase().includes(q) ||
        e.league.toLowerCase().includes(q) ||
        e.market.toLowerCase().includes(q)
      )
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 20);
  }, [log, query]);

  if (!mounted || log.length === 0) return null;

  return (
    <details className="rounded-lg border border-slate-800 bg-slate-950/40 p-2.5">
      <summary className="cursor-pointer text-[10.5px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200">
        ▸ Im Tagebuch suchen
      </summary>
      <div className="mt-2 space-y-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Team, Liga oder Markt (min. 2 Zeichen)"
          maxLength={40}
          className="w-full rounded-md border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-[11.5px] text-slate-100 placeholder:text-slate-600 focus:border-emerald-400/60 focus:outline-none"
          aria-label="Tagebuch durchsuchen"
        />
        {query.length >= 2 && (
          results.length === 0 ? (
            <p className="text-[10.5px] text-slate-500">Keine Treffer. Versuche einen anderen Begriff.</p>
          ) : (
            <ul className="space-y-0.5 text-[10.5px]">
              {results.map((e) => (
                <li key={e.id} className="grid grid-cols-[auto_1fr_auto] gap-2">
                  <span className="font-mono text-slate-500">{fmtDate(e.date)}</span>
                  <span className="min-w-0 truncate text-slate-200">
                    <span className="font-semibold">{e.homeTeam} – {e.awayTeam}</span>
                    <span className="text-slate-500"> · {e.market}</span>
                  </span>
                  <span className={`text-[9.5px] uppercase tracking-wider ${e.outcome === 'win' ? 'text-emerald-300' : e.outcome === 'loss' ? 'text-rose-300' : 'text-slate-400'}`}>
                    {OUTCOME_LABEL[e.outcome]}
                  </span>
                </li>
              ))}
              {log.filter((e) =>
                e.homeTeam.toLowerCase().includes(query.toLowerCase()) ||
                e.awayTeam.toLowerCase().includes(query.toLowerCase()) ||
                e.league.toLowerCase().includes(query.toLowerCase()) ||
                e.market.toLowerCase().includes(query.toLowerCase())
              ).length > 20 && (
                <li className="text-[10px] text-slate-500">+ weitere Treffer (Top 20 gezeigt)</li>
              )}
            </ul>
          )
        )}
      </div>
    </details>
  );
}

'use client';

// Einfachste WM-Sicht: pro Spiel chronologisch, eine Zeile,
// Sieger und Verlierer + (sobald nachgepflegt) Endstand + Treffer/Fehl.
// Heute-Spiele werden hervorgehoben. Filter "nur kommende" vs "alle".

import { useEffect, useMemo, useState } from 'react';
import {
  buildWmSimplePicks,
  type WmSimpleStatus,
  type WmSimpleOutcome
} from '@/lib/sport/wm-simple-picks';
import { mergeResults } from '@/lib/sport/wm-results-matcher';
import {
  loadManualWmResults,
  WM_MANUAL_RESULTS_CHANGED_EVENT
} from '@/lib/sport/wm-results-store';

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

function todayIsoBerlin(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

const STATUS_TONE: Record<WmSimpleStatus, string> = {
  klar: 'text-emerald-200',
  knapp: 'text-sky-200',
  remis: 'text-amber-200',
  tbd: 'text-slate-500'
};

const OUTCOME_TONE: Record<WmSimpleOutcome, string> = {
  treffer: 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100',
  daneben: 'border-rose-400/50 bg-rose-500/15 text-rose-100',
  'remis-push': 'border-amber-400/40 bg-amber-500/10 text-amber-100',
  'remis-getroffen': 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100'
};

const OUTCOME_LABEL: Record<WmSimpleOutcome, string> = {
  treffer: '✓ getroffen',
  daneben: '✗ daneben',
  'remis-push': '= push',
  'remis-getroffen': '✓ Remis getroffen'
};

type Filter = 'kommend' | 'alle';

export function WmSimplePicksCard() {
  const [tick, setTick] = useState(0);
  const [filter, setFilter] = useState<Filter>('kommend');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const refresh = () => setTick((t) => t + 1);
    window.addEventListener(WM_MANUAL_RESULTS_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(WM_MANUAL_RESULTS_CHANGED_EVENT, refresh);
  }, []);

  const today = useMemo(() => mounted ? todayIsoBerlin() : '', [mounted]);

  const picks = useMemo(() => {
    const finished = mounted
      ? mergeResults(loadManualWmResults(), [])
      : [];
    return buildWmSimplePicks({ finished });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, tick]);

  const visiblePicks = useMemo(() => {
    if (!mounted || filter === 'alle') return picks;
    return picks.filter((p) => p.dateIso >= today);
  }, [picks, filter, mounted, today]);

  // Bilanz: getroffene vs. daneben unter allen Picks mit Ergebnis
  const stats = useMemo(() => {
    let hits = 0, miss = 0, push = 0;
    for (const p of picks) {
      if (!p.result) continue;
      if (p.result.outcome === 'treffer' || p.result.outcome === 'remis-getroffen') hits += 1;
      else if (p.result.outcome === 'daneben') miss += 1;
      else if (p.result.outcome === 'remis-push') push += 1;
    }
    return { hits, miss, push, decided: hits + miss };
  }, [picks]);

  const byDate = useMemo(() => {
    const m = new Map<string, typeof visiblePicks>();
    for (const p of visiblePicks) {
      if (!m.has(p.dateIso)) m.set(p.dateIso, []);
      m.get(p.dateIso)!.push(p);
    }
    return m;
  }, [visiblePicks]);
  const dates = Array.from(byDate.keys()).sort();

  return (
    <section className="space-y-3 rounded-2xl border border-slate-700 bg-slate-950/40 p-3" aria-label="WM Sieger und Verlierer">
      <header className="space-y-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[14px] font-bold text-slate-100">WM 2026 — Sieger &amp; Verlierer pro Spiel</h2>
          {stats.decided > 0 && (
            <span className="text-[10.5px] text-slate-400">
              {stats.hits}/{stats.decided} getroffen
              {stats.push > 0 ? ` · ${stats.push} push` : ''}
            </span>
          )}
        </div>
        <p className="text-[10.5px] leading-snug text-slate-400">
          Alle Spiele chronologisch. Pro Spiel: wer gewinnt nach Modell, wer verliert.
          Keine Garantie — Modell-Tendenz, kein Ergebnis.
        </p>
        <div className="flex items-baseline gap-1.5 pt-1">
          <span className="text-[9.5px] uppercase tracking-wider text-slate-500">Anzeigen:</span>
          {(['kommend', 'alle'] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${filter === f ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100' : 'border-slate-700 bg-slate-900/60 text-slate-400 hover:border-slate-500'}`}
            >{f === 'kommend' ? 'nur kommend' : 'alle Spiele'}</button>
          ))}
        </div>
      </header>
      <ol className="space-y-3">
        {dates.map((date) => {
          const items = byDate.get(date)!;
          const isToday = mounted && date === today;
          const isFuture = mounted && date > today;
          const dateTone = isToday
            ? 'text-emerald-300'
            : isFuture
              ? 'text-slate-400'
              : 'text-slate-500';
          return (
            <li key={date}>
              <div className={`mb-1 text-[10px] font-bold uppercase tracking-[0.18em] ${dateTone}`}>
                {fmtDate(date)} · {date}{isToday ? ' · HEUTE' : ''}
              </div>
              <ul className="space-y-0.5">
                {items.map((p) => {
                  const rowTone = isToday
                    ? 'border-emerald-500/30 bg-emerald-950/15'
                    : 'border-slate-800 bg-slate-950/50';
                  return (
                    <li
                      key={p.fixtureId}
                      className={`flex flex-wrap items-baseline gap-2 rounded border px-2 py-1.5 text-[11.5px] ${rowTone}`}
                    >
                      <span className="font-mono text-[10px] text-slate-500">{p.time ?? '--:--'}</span>
                      <span className="text-slate-300">{p.homeTeam} – {p.awayTeam}</span>
                      {p.result && (
                        <span className="rounded border border-slate-600 bg-slate-900/60 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-100">
                          {p.result.homeScore}:{p.result.awayScore}
                        </span>
                      )}
                      <span className={`ml-auto font-semibold ${STATUS_TONE[p.status]}`}>
                        {p.status === 'tbd' && 'Paarung offen'}
                        {p.status === 'remis' && 'Remis-Tipp'}
                        {(p.status === 'klar' || p.status === 'knapp') && p.winnerTeam && p.loserTeam && (
                          <>Sieger: {p.winnerTeam} · Verlierer: {p.loserTeam}</>
                        )}
                      </span>
                      {p.result && (
                        <span className={`rounded border px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider ${OUTCOME_TONE[p.result.outcome]}`}>
                          {OUTCOME_LABEL[p.result.outcome]}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ol>
      {visiblePicks.length === 0 && (
        <p className="text-[10.5px] text-slate-500">
          Keine Spiele im Filter. Wechsle auf &quot;alle Spiele&quot; um vergangene Tage zu sehen.
        </p>
      )}
    </section>
  );
}

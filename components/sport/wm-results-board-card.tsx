'use client';

// Ergebnis-Tafel WM. Zeigt die letzten 7 Tage WM-Spiele mit klarem
// Endergebnis, Sieger-Markierung und (sofern abgegeben) unserem Pick
// inkl. Treffer/Fehl-Status. Versteckt sich, wenn noch keine WM-Spiele
// im Fenster ein Endergebnis haben.

import { useEffect, useMemo, useState } from 'react';
import { WM_2026_FIXTURES } from '@/lib/sport/wm-schedule-2026';
import { buildWmResultBoard } from '@/lib/sport/wm-results-board';
import { mergeResults } from '@/lib/sport/wm-results-matcher';
import { loadManualWmResults, WM_MANUAL_RESULTS_CHANGED_EVENT } from '@/lib/sport/wm-results-store';
import { loadWmPickLog, WM_PICK_LEARNING_CHANGED_EVENT } from '@/lib/sport/wm-pick-learning-store';
import type { FinishedFixtureLite } from '@/lib/sport/wm-pick-learning';

interface Props {
  todayIso: string;
  externalFinished?: FinishedFixtureLite[];
  lookbackDays?: number;
}

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'Europe/Berlin' });
}

export function WmResultsBoardCard({ todayIso, externalFinished = [], lookbackDays = 7 }: Props) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const refresh = () => setTick((t) => t + 1);
    window.addEventListener(WM_MANUAL_RESULTS_CHANGED_EVENT, refresh);
    window.addEventListener(WM_PICK_LEARNING_CHANGED_EVENT, refresh);
    return () => {
      window.removeEventListener(WM_MANUAL_RESULTS_CHANGED_EVENT, refresh);
      window.removeEventListener(WM_PICK_LEARNING_CHANGED_EVENT, refresh);
    };
  }, []);

  const board = useMemo(() => {
    const finished = mergeResults(loadManualWmResults(), externalFinished);
    const pickLog = loadWmPickLog();
    const picks = pickLog.map((p) => ({ fixtureId: p.fixtureId, pickedSide: p.winnerSide }));
    return buildWmResultBoard({
      todayIso,
      lookbackDays,
      schedule: WM_2026_FIXTURES,
      finished,
      picks
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayIso, externalFinished, lookbackDays, tick]);

  if (board.totalGames === 0) return null;

  return (
    <section className="space-y-2 rounded-2xl border border-sky-400/30 bg-sky-950/10 p-3" aria-label="WM Ergebnis-Tafel">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-300">Klare Ergebnisse — was war</h3>
        <span className="text-[10px] text-sky-200/70">
          {board.totalGames} Spiel{board.totalGames === 1 ? '' : 'e'} • {board.totalHits} Treffer • {board.totalMiss} Fehl
        </span>
      </div>
      <ul className="space-y-1">
        {board.rows.map((r) => {
          const pickStyle =
            r.pickStatus === 'treffer' ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200' :
            r.pickStatus === 'fehl' ? 'border-rose-400/60 bg-rose-500/15 text-rose-200' :
            r.pickStatus === 'remis-push' ? 'border-amber-400/50 bg-amber-500/10 text-amber-200' :
            'border-slate-700 bg-slate-900/40 text-slate-400';
          return (
            <li key={r.fixtureId} className={`rounded border px-2 py-1.5 text-[11px] ${pickStyle}`}>
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-mono text-[10px] opacity-70">{fmtDate(r.dateIso)}</span>
                <span className="font-semibold">{r.headline}</span>
                <span className="font-mono text-[9.5px] opacity-70">{r.time}</span>
              </div>
              <p className="mt-0.5 text-[10.5px] opacity-90">{r.pickLabel}</p>
            </li>
          );
        })}
      </ul>
      <p className="text-[9.5px] leading-snug text-slate-500">
        Ergebnisse kommen aus den nachgepflegten Eintraegen und (sofern verfuegbar) externen Quellen. &quot;Push&quot; = Remis bei Sieger-Tipp.
      </p>
    </section>
  );
}

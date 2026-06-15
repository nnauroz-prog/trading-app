'use client';

// Zeigt den aktuellen dynamischen ELO-Stand der WM-Teams — abgeleitet
// aus den resolved Picks im Lern-Log + manuellen Ergebnis-Eingaben.
//
// Versteckt sich, wenn noch keine resolved Spiele vorliegen.

import { useEffect, useMemo, useState } from 'react';
import {
  applyResultsToElo,
  collectResultsForElo,
  summarizeEloDeltas,
  type EloDelta
} from '@/lib/sport/wm-dynamic-elo';
import {
  loadWmPickLog,
  WM_PICK_LEARNING_CHANGED_EVENT
} from '@/lib/sport/wm-pick-learning-store';
import {
  loadManualWmResults,
  WM_MANUAL_RESULTS_CHANGED_EVENT
} from '@/lib/sport/wm-results-store';

function deltaColor(delta: number): string {
  if (delta > 30) return 'text-emerald-200';
  if (delta > 0) return 'text-emerald-300';
  if (delta < -30) return 'text-rose-200';
  if (delta < 0) return 'text-rose-300';
  return 'text-slate-400';
}

export function WmEloDriftCard() {
  const [logTick, setLogTick] = useState(0);
  const [resultTick, setResultTick] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const sync = () => setLogTick((t) => t + 1);
    const syncRes = () => setResultTick((t) => t + 1);
    window.addEventListener(WM_PICK_LEARNING_CHANGED_EVENT, sync);
    window.addEventListener(WM_MANUAL_RESULTS_CHANGED_EVENT, syncRes);
    return () => {
      window.removeEventListener(WM_PICK_LEARNING_CHANGED_EVENT, sync);
      window.removeEventListener(WM_MANUAL_RESULTS_CHANGED_EVENT, syncRes);
    };
  }, []);

  const deltas = useMemo<EloDelta[]>(() => {
    if (!mounted) return [];
    void logTick;
    void resultTick;
    // Geteilte Pure-Logik: dieselbe Result-Sammlung wie im Pick-Ranking
    // (WmWinnerPicksWithLearning) — Anzeige und Handeln bleiben konsistent.
    const results = collectResultsForElo(loadWmPickLog(), loadManualWmResults());
    if (results.length === 0) return [];
    return summarizeEloDeltas(applyResultsToElo(results));
  }, [mounted, logTick, resultTick]);

  if (!mounted) return null;
  if (deltas.length === 0) return null;

  return (
    <section className="space-y-2 rounded-2xl border border-violet-400/30 bg-violet-950/15 p-3" aria-label="Dynamisches ELO">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-300">Dynamisches ELO · Live-Drift</h3>
        <span className="text-[10px] text-violet-200/70">{deltas.length} Teams · basiert auf {deltas.reduce((s, d) => s + d.basedOnGames, 0) / 2 | 0} Spielen</span>
      </div>
      <p className="text-[11px] leading-snug text-violet-100/80">
        Nach jedem resolved Spiel ziehen wir die ELO-Werte mit echtem Ergebnis nach (K = 30 Gruppe, K = 50 KO). Damit lernen die Picks ohne dass Du etwas tun musst.
      </p>
      <ul className="space-y-0.5">
        {deltas.map((d) => (
          <li key={d.team} className="grid grid-cols-[1fr_auto_auto_auto] items-baseline gap-2 rounded border border-slate-800 bg-slate-950/40 px-2 py-1 text-[10.5px]">
            <span className="truncate text-slate-100">{d.team}</span>
            <span className="font-mono text-[9.5px] text-slate-500">{d.basedOnGames} Spiele</span>
            <span className="font-mono text-[10px] text-slate-400">{d.startElo} → {d.newElo}</span>
            <span className={`font-mono font-bold ${deltaColor(d.delta)}`}>{d.delta >= 0 ? '+' : ''}{d.delta}</span>
          </li>
        ))}
      </ul>
      <p className="text-[9.5px] leading-snug text-slate-500">
        Sortiert nach Betrag des Drifts. Heisst nicht &bdquo;Team wird kuenftig gewinnen&ldquo; — heisst &bdquo;Modell hat seine Einschaetzung dieses Teams angepasst&ldquo;.
      </p>
    </section>
  );
}

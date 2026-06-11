'use client';

// Tagesheld + Lehrstueck der letzten 7 Tage. Zeigt den staerksten
// Treffer und (falls vorhanden) den groessten Reinfall, jeweils mit
// Endstand. Versteckt sich, solange weder Win noch Loss vorliegt.

import { useEffect, useMemo, useState } from 'react';
import { computeWmTagesheld, type TagesHeldEntry } from '@/lib/sport/wm-tagesheld';
import { loadWmPickLog, WM_PICK_LEARNING_CHANGED_EVENT } from '@/lib/sport/wm-pick-learning-store';

interface Props {
  todayIso: string;
  windowDays?: number;
}

function Row({ kind, e }: { kind: 'held' | 'lehr'; e: TagesHeldEntry }) {
  const tone = kind === 'held'
    ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100'
    : 'border-amber-400/40 bg-amber-500/10 text-amber-100';
  const label = kind === 'held' ? 'Tagesheld' : 'Lehrstueck';
  const finalLabel = e.finalHomeScore !== null && e.finalAwayScore !== null
    ? `${e.finalHomeScore}:${e.finalAwayScore}`
    : '—';
  return (
    <div className={`rounded border px-2 py-1.5 ${tone}`}>
      <div className="flex flex-wrap items-baseline gap-2 text-[11px]">
        <span className="rounded border border-current/40 bg-current/10 px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider">{label}</span>
        <span className="font-semibold">{e.winnerTeam}</span>
        <span className="opacity-80">gegen {e.opponentTeam}</span>
        <span className="ml-auto font-mono text-[10px] opacity-80">{e.dateIso}</span>
      </div>
      <div className="mt-0.5 flex flex-wrap items-baseline gap-2 text-[10px] opacity-90">
        <span className="font-mono">Modell {e.modelProbabilityPct} %</span>
        <span className="font-mono">ELO {e.eloDiff > 0 ? '+' : ''}{e.eloDiff.toFixed(0)}</span>
        <span className="font-mono">Endstand {finalLabel}</span>
      </div>
    </div>
  );
}

export function WmTagesHeldCard({ todayIso, windowDays = 7 }: Props) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const refresh = () => setTick((t) => t + 1);
    window.addEventListener(WM_PICK_LEARNING_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(WM_PICK_LEARNING_CHANGED_EVENT, refresh);
  }, []);

  const result = useMemo(() => computeWmTagesheld(loadWmPickLog(), todayIso, windowDays),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick, todayIso, windowDays]);

  if (!result.tagesheld && !result.lehrstueck) return null;

  return (
    <section className="space-y-2 rounded-2xl border border-slate-700 bg-slate-950/40 p-3" aria-label="WM Tagesheld">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300">Letzte {result.windowDays} Tage</h3>
        <span className="text-[10px] text-slate-500">{result.fromIso} → {result.toIso}</span>
      </div>
      {result.tagesheld && <Row kind="held" e={result.tagesheld} />}
      {result.lehrstueck && <Row kind="lehr" e={result.lehrstueck} />}
      <p className="text-[9.5px] leading-snug text-slate-500">
        Tagesheld = der getroffene Pick mit der hoechsten Modell-Wahrscheinlichkeit. Lehrstueck = der teure Reinfall, wo das Modell hoch ueberzeugt war und trotzdem daneben lag — wichtig fuer die ehrliche Selbsteinschaetzung.
      </p>
    </section>
  );
}

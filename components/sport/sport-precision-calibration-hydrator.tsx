'use client';

// Sport Precision Desk — Calibration-Hydrator.
//
// Liest client-seitig das Tip-Journal aus localStorage, berechnet die
// Bucket-Stats, und zeigt einen kompakten Status: pro Probability-Bucket
// Sample-Groesse, historische Trefferquote, Label (KALIBRIERT | UNKLAR |
// UEBERSCHAETZT). Damit hat der User echten Track-Record-Bezug zum oben
// gerenderten Precision Desk.
//
// Versteckt sich ehrlich, solange noch keine bewertbaren Tipps vorliegen.

import { useEffect, useMemo, useState } from 'react';
import {
  loadTipJournal,
  SPORT_TIP_JOURNAL_CHANGED_EVENT,
  type TipJournalEntry
} from '@/lib/sport/tip-journal';
import { buildCalibrationFromJournal } from '@/lib/sport/sport-precision-bridge';
import type { CalibrationLabel } from '@/lib/sport/sport-calibration';

const LABEL_TEXT: Record<CalibrationLabel, string> = {
  KALIBRIERT: 'Kalibriert',
  UNKLAR: 'Unklar',
  UEBERSCHAETZT: 'Ueberschaetzt'
};

const LABEL_CLASS: Record<CalibrationLabel, string> = {
  KALIBRIERT: 'border-emerald-500/40 bg-emerald-950/15 text-emerald-100',
  UNKLAR: 'border-slate-700 bg-slate-900/40 text-slate-300',
  UEBERSCHAETZT: 'border-rose-500/40 bg-rose-950/20 text-rose-100'
};

export function SportPrecisionCalibrationHydrator() {
  const [log, setLog] = useState<TipJournalEntry[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setLog(loadTipJournal());
    sync();
    setMounted(true);
    window.addEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
    return () => window.removeEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
  }, []);

  const { stats, total } = useMemo(() => buildCalibrationFromJournal(
    log.map((e) => ({
      outcome: e.outcome,
      modelProbabilityPct: e.modelProbabilityPct,
      market: e.market,
      league: e.league,
      qualityScore: e.qualityScore,
      dataQuality: e.dataQuality,
      resolvedAt: e.resolvedAt
    }))
  ), [log]);

  if (!mounted) return null;
  if (total === 0) return null;

  // Bucket-Zeilen — nur die mit Sample > 0 zeigen, damit es nicht ueberlaedt.
  const visible = stats.filter((s) => s.sampleSize > 0);
  if (visible.length === 0) return null;

  return (
    <section className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900/40 p-3" aria-label="Sport Precision Calibration Status">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Kalibrierungs-Status (aus Tipprunde)</h3>
        <span className="text-[10px] text-slate-500">{total} bewertet</span>
      </div>
      <ul className="space-y-0.5">
        {visible.map((s) => {
          const hit = s.historicalHitRate !== null ? `${Math.round(s.historicalHitRate * 100)} %` : '—';
          const expected = `${Math.round(s.expectedHitRate * 100)} %`;
          return (
            <li key={s.bucket} className={`grid grid-cols-[auto_auto_1fr_auto] items-center gap-2 rounded border px-2 py-1 text-[10.5px] ${LABEL_CLASS[s.label]}`}>
              <span className="font-mono text-[10px] opacity-80">Bucket {s.bucket}%</span>
              <span className="text-[9.5px] opacity-70">{s.sampleSize} Pick{s.sampleSize === 1 ? '' : 's'}</span>
              <span className="text-[10px]">
                trifft {hit} <span className="opacity-60">vs. erwartet {expected}</span>
              </span>
              <span className="rounded border border-slate-700 bg-slate-950/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">{LABEL_TEXT[s.label]}</span>
            </li>
          );
        })}
      </ul>
      <p className="text-[10px] leading-snug text-slate-500">
        Bewertete Tipps aus Deinem lokalen Tipp-Tagebuch — wenn ein Bucket historisch unter Erwartung trifft, deckelt der Precision Desk zukuenftige Picks in diesem Bucket.
      </p>
    </section>
  );
}

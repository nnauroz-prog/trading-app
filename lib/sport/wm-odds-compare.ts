// Mehrere Buchmacher-Quoten fuer denselben Pick vergleichen.
//
// User traegt fuer einen Pick die Quoten verschiedener Anbieter ein
// und sieht: welche Quote ist die beste, wie gross ist der Edge im
// Vergleich zur fairen Quote, und welcher Anbieter fuehrt.
//
// Reine Funktion. Keine I/O.

import { evaluateWmValue, type WmValueCheck } from '@/lib/sport/wm-value-check';

export interface WmOddsEntryInput {
  anbieter: string;       // freitext, vom User
  decimalOdds: number;
}

export interface WmOddsCompareRow extends WmOddsEntryInput {
  value: WmValueCheck;
  isLeader: boolean;      // beste Quote in der Liste
}

export interface WmOddsCompareResult {
  rows: WmOddsCompareRow[]; // sortiert: beste Quote zuerst
  bestEdgePct: number | null;
  // Spread = beste Quote - schlechteste Quote. null wenn < 2 gueltige.
  spread: number | null;
}

export function compareWmOdds(modelProbabilityPct: number, entries: WmOddsEntryInput[]): WmOddsCompareResult {
  const valid = entries.filter((e) => Number.isFinite(e.decimalOdds) && e.decimalOdds > 1);
  if (valid.length === 0) {
    return { rows: [], bestEdgePct: null, spread: null };
  }
  const rows: WmOddsCompareRow[] = valid.map((e) => ({
    ...e,
    value: evaluateWmValue(modelProbabilityPct, e.decimalOdds),
    isLeader: false
  }));
  rows.sort((a, b) => b.decimalOdds - a.decimalOdds);
  // Leader markieren (alle mit gleicher Top-Quote, falls Gleichstand).
  const top = rows[0].decimalOdds;
  for (const r of rows) {
    if (r.decimalOdds === top) r.isLeader = true;
  }
  const bestEdgePct = rows[0].value.edgePct;
  const spread = rows.length >= 2 ? Math.round((rows[0].decimalOdds - rows[rows.length - 1].decimalOdds) * 100) / 100 : null;
  return { rows, bestEdgePct, spread };
}

// Pure: misst, ob die User-Coin-Overrides historisch richtig lagen.
// Jeder Override hat eine implizite Richtungs-Erwartung (Veto = erwartet
// Fall, Conviction = erwartet Anstieg). Nach N Tagen vergleichen wir den
// Coin-Preis mit dem Preis zum Override-Zeitpunkt — und sehen, ob die
// Erwartung sich bewahrheitet hat. So entsteht ein User-Track-Record
// fuer das eigene Bauchgefuehl.
//
// Reine Funktion, keine I/O. Der localStorage-Wrapper liegt separat.

import type { CoinOverrideFactor } from '@/lib/agents/coin-override';

export interface CoinOverrideHistoryEntry {
  // Eindeutige ID (kann timestamp + coin sein).
  id: string;
  coinId: string;       // lowercase
  factors: CoinOverrideFactor[];
  // Preis zum Zeitpunkt des Settings.
  priceAtSet: number;
  // Unix-ms.
  setAt: number;
}

// Erwartete Richtung pro Faktor: +1 = User erwartet Anstieg, -1 = erwartet Fall.
const DIRECTION: Record<CoinOverrideFactor, number> = {
  'major-event-today': 1,
  'whale-accumulating': 1,
  'manual-conviction': 1,
  'whale-selling-visible': -1,
  'regulatory-uncertainty': -1,
  'large-unlock-today': -1,
  'manual-distrust': -1
};

// Aggregat-Erwartung des Overrides: Summe der Faktor-Richtungen, dann normalisiert.
export function expectedDirection(factors: CoinOverrideFactor[]): number {
  let sum = 0;
  for (const f of factors) sum += DIRECTION[f] ?? 0;
  if (sum > 0) return 1;
  if (sum < 0) return -1;
  return 0;
}

// Minimum-Zeit, bevor ein Override fair bewertet werden kann. Unter 12 h
// rauscht der Coin-Preis zu sehr, um irgend etwas Aussagekraeftiges zu sagen.
const MIN_AGE_MS = 12 * 60 * 60 * 1000;
// Maximum-Zeit, bevor wir den Override als „abgelaufen" abschreiben.
// 7 Tage ist genug — danach ist die Markt-Lage ohnehin anders.
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export interface OverrideOutcome {
  entry: CoinOverrideHistoryEntry;
  priceNow: number | null;
  priceChangePct: number | null;
  expectedDir: number;
  // Hat der Markt die Erwartung bestaetigt? null wenn nicht bewertbar.
  // Ein 'flat' Markt (|change| < 1 %) wird als unklar gewertet (null).
  outcome: 'correct' | 'wrong' | 'unclear' | 'too-young' | 'too-old' | 'no-direction' | 'no-price';
  ageDays: number;
}

const FLAT_THRESHOLD_PCT = 1;

export function evaluateOverrideOutcome(
  entry: CoinOverrideHistoryEntry,
  priceNow: number | null,
  now: number = Date.now()
): OverrideOutcome {
  const ageMs = now - entry.setAt;
  const ageDays = Math.round((ageMs / (24 * 60 * 60 * 1000)) * 10) / 10;
  const expectedDir = expectedDirection(entry.factors);

  if (expectedDir === 0) {
    return { entry, priceNow, priceChangePct: null, expectedDir, outcome: 'no-direction', ageDays };
  }
  if (priceNow === null || !Number.isFinite(priceNow) || priceNow <= 0) {
    return { entry, priceNow, priceChangePct: null, expectedDir, outcome: 'no-price', ageDays };
  }
  if (ageMs < MIN_AGE_MS) {
    return { entry, priceNow, priceChangePct: null, expectedDir, outcome: 'too-young', ageDays };
  }
  if (ageMs > MAX_AGE_MS) {
    return { entry, priceNow, priceChangePct: null, expectedDir, outcome: 'too-old', ageDays };
  }

  const change = ((priceNow - entry.priceAtSet) / entry.priceAtSet) * 100;
  if (Math.abs(change) < FLAT_THRESHOLD_PCT) {
    return { entry, priceNow, priceChangePct: Math.round(change * 10) / 10, expectedDir, outcome: 'unclear', ageDays };
  }
  const correct = (expectedDir > 0 && change > 0) || (expectedDir < 0 && change < 0);
  return {
    entry,
    priceNow,
    priceChangePct: Math.round(change * 10) / 10,
    expectedDir,
    outcome: correct ? 'correct' : 'wrong',
    ageDays
  };
}

export interface UserOverrideAccuracy {
  evaluable: number;     // total bewertbar (correct + wrong + unclear)
  correct: number;
  wrong: number;
  unclear: number;
  hitRatePct: number | null;
  byCoin: Array<{ coinId: string; correct: number; wrong: number; hitRatePct: number | null }>;
}

export function aggregateOutcomes(outcomes: OverrideOutcome[]): UserOverrideAccuracy {
  const evaluable = outcomes.filter((o) => o.outcome === 'correct' || o.outcome === 'wrong' || o.outcome === 'unclear');
  const correct = evaluable.filter((o) => o.outcome === 'correct').length;
  const wrong = evaluable.filter((o) => o.outcome === 'wrong').length;
  const unclear = evaluable.filter((o) => o.outcome === 'unclear').length;
  const decisive = correct + wrong;
  const hitRatePct = decisive >= 3 ? Math.round((correct / decisive) * 100) : null;

  // Per-Coin: nur correct/wrong.
  const byCoinMap = new Map<string, { correct: number; wrong: number }>();
  for (const o of evaluable) {
    if (o.outcome === 'unclear') continue;
    const c = byCoinMap.get(o.entry.coinId) ?? { correct: 0, wrong: 0 };
    if (o.outcome === 'correct') c.correct++; else c.wrong++;
    byCoinMap.set(o.entry.coinId, c);
  }
  const byCoin = [...byCoinMap.entries()].map(([coinId, c]) => ({
    coinId,
    correct: c.correct,
    wrong: c.wrong,
    hitRatePct: c.correct + c.wrong >= 2 ? Math.round((c.correct / (c.correct + c.wrong)) * 100) : null
  })).sort((a, b) => (b.hitRatePct ?? 0) - (a.hitRatePct ?? 0));

  return { evaluable: evaluable.length, correct, wrong, unclear, hitRatePct, byCoin };
}

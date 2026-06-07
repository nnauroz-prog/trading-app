// Walk-forward: berechnet für die letzten N Tage den Safety-Score und gibt
// die Zeitreihe zurück. Erlaubt die Sparkline "wie hat sich das Setup
// entwickelt" auf der Detail-Seite.

import type { PriceCandle } from '@/lib/market/yahoo-history';
import { evaluateInstrumentSafety } from '@/lib/market/instrument-safety';

export interface ScoreHistoryPoint {
  time: number;
  score: number;
  grade: 'A' | 'B' | 'C' | 'D';
}

export function computeSafetyScoreHistory(candles: PriceCandle[], days = 60): ScoreHistoryPoint[] {
  // Brauche mindestens 200 Tage Historie pro Bewertung für MA200.
  if (candles.length < 200 + days) return [];

  const out: ScoreHistoryPoint[] = [];
  const start = candles.length - days;
  for (let i = start; i < candles.length; i++) {
    const window = candles.slice(0, i + 1);
    const today = window[window.length - 1];
    const safety = evaluateInstrumentSafety({ price: today.close, candles: window });
    out.push({ time: today.time, score: safety.score, grade: safety.grade });
  }
  return out;
}

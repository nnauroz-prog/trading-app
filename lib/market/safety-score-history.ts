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

export interface SafetyStreak {
  // Aktuelle Streak: wie viele Tage in Folge hat das Setup die gleiche Note?
  currentGrade: 'A' | 'B' | 'C' | 'D';
  currentStreak: number;
  // Vor wie vielen Tagen war zuletzt Grade A? null = nie in der Fensterzeit.
  daysSinceLastA: number | null;
  // Wie viele der letzten N Tage waren Grade A?
  gradeADays: number;
  windowDays: number;
}

export function analyzeStreak(points: ScoreHistoryPoint[]): SafetyStreak | null {
  if (points.length === 0) return null;
  const latest = points[points.length - 1];
  let currentStreak = 1;
  for (let i = points.length - 2; i >= 0; i--) {
    if (points[i].grade === latest.grade) currentStreak++;
    else break;
  }
  let daysSinceLastA: number | null = null;
  for (let i = points.length - 1; i >= 0; i--) {
    if (points[i].grade === 'A') {
      daysSinceLastA = points.length - 1 - i;
      break;
    }
  }
  const gradeADays = points.filter((p) => p.grade === 'A').length;
  return {
    currentGrade: latest.grade,
    currentStreak,
    daysSinceLastA,
    gradeADays,
    windowDays: points.length
  };
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

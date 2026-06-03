// Trefferquoten-Verlauf über die letzten N Tage — rein lesend aus dem
// Tipp-Tagebuch, server- und client-fähig (kein localStorage hier).

import type { TipJournalEntry } from '@/lib/sport/tip-journal';

export interface HitRateDay {
  iso: string;
  resolved: number;
  wins: number;
  decisive: number; // resolved minus push
  hitRatePct: number | null;
  cumulativeHitRatePct: number | null;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function isoDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function computeHitRateTrend(log: TipJournalEntry[], days = 30, now: Date = new Date()): HitRateDay[] {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const out: HitRateDay[] = [];

  let cumWins = 0;
  let cumDecisive = 0;

  for (let i = days - 1; i >= 0; i--) {
    const startMs = today.getTime() - i * MS_PER_DAY;
    const endMs = startMs + MS_PER_DAY;
    const iso = isoDay(startMs);
    const dayEntries = log.filter((e) => (e.resolvedAt ?? 0) >= startMs && (e.resolvedAt ?? 0) < endMs && e.outcome !== 'pending');
    const wins = dayEntries.filter((e) => e.outcome === 'win').length;
    const decisive = dayEntries.filter((e) => e.outcome !== 'push').length;
    const hitRatePct = decisive > 0 ? Math.round((wins / decisive) * 100) : null;

    cumWins += wins;
    cumDecisive += decisive;
    const cumulativeHitRatePct = cumDecisive > 0 ? Math.round((cumWins / cumDecisive) * 100) : null;

    out.push({
      iso,
      resolved: dayEntries.length,
      wins,
      decisive,
      hitRatePct,
      cumulativeHitRatePct
    });
  }
  return out;
}

export interface TrendSummary {
  wins: number;
  resolved: number;
  decisive: number;
  hitRatePct: number | null;
  activeDays: number;
}

export function summarizeTrend(days: HitRateDay[]): TrendSummary {
  const wins = days.reduce((s, d) => s + d.wins, 0);
  const resolved = days.reduce((s, d) => s + d.resolved, 0);
  const decisive = days.reduce((s, d) => s + d.decisive, 0);
  const hitRatePct = decisive > 0 ? Math.round((wins / decisive) * 100) : null;
  const activeDays = days.filter((d) => d.resolved > 0).length;
  return { wins, resolved, decisive, hitRatePct, activeDays };
}

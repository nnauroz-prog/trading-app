// Pro abgeschlossener ISO-Woche: Trefferquote + Treffer + Gesamtzahl.
// Wird live aus dem Tipp-Tagebuch berechnet — keine eigene Persistenz.

import type { TipJournalEntry } from '@/lib/sport/tip-journal';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_WEEK = 7 * MS_PER_DAY;

export interface WeekSummary {
  weekStart: number; // ms
  isoStart: string;  // YYYY-MM-DD
  resolved: number;
  wins: number;
  decisive: number;
  hitRatePct: number | null;
}

function startOfIsoWeek(d: Date): number {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

export function weeklyHistory(log: TipJournalEntry[], weeks = 6, now: Date = new Date()): WeekSummary[] {
  const thisWeekStart = startOfIsoWeek(now);
  const summaries: WeekSummary[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = thisWeekStart - i * MS_PER_WEEK;
    const end = start + MS_PER_WEEK;
    const week = log.filter((e) => (e.resolvedAt ?? 0) >= start && (e.resolvedAt ?? 0) < end && e.outcome !== 'pending');
    const wins = week.filter((e) => e.outcome === 'win').length;
    const decisive = week.filter((e) => e.outcome !== 'push').length;
    const hitRatePct = decisive > 0 ? Math.round((wins / decisive) * 100) : null;
    summaries.push({
      weekStart: start,
      isoStart: new Date(start).toISOString().slice(0, 10),
      resolved: week.length,
      wins,
      decisive,
      hitRatePct
    });
  }
  return summaries;
}

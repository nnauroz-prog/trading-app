// Trefferquote pro Wochentag — zeigt, ob ein User Samstags besser tippt
// als Mittwochs (oder umgekehrt). Wertet das Datum des Spiels aus, nicht
// das Datum der Auflösung.

import type { TipJournalEntry } from '@/lib/sport/tip-journal';

export interface WeekdayStats {
  weekday: number; // 1 = Montag, 7 = Sonntag
  label: 'Mo' | 'Di' | 'Mi' | 'Do' | 'Fr' | 'Sa' | 'So';
  resolved: number;
  wins: number;
  decisive: number;
  hitRatePct: number | null;
}

const LABELS: WeekdayStats['label'][] = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

function weekdayOf(iso: string): number {
  const d = new Date(`${iso}T12:00:00`);
  // getDay: 0 = Sonntag → konvertieren auf 1..7 mit Mo=1
  const g = d.getDay();
  return g === 0 ? 7 : g;
}

export function tipsByWeekday(log: TipJournalEntry[]): WeekdayStats[] {
  const buckets: Map<number, { wins: number; resolved: number; decisive: number }> = new Map();
  for (let i = 1; i <= 7; i++) buckets.set(i, { wins: 0, resolved: 0, decisive: 0 });
  for (const e of log) {
    if (e.outcome === 'pending') continue;
    const wd = weekdayOf(e.date);
    const b = buckets.get(wd)!;
    b.resolved += 1;
    if (e.outcome !== 'push') {
      b.decisive += 1;
      if (e.outcome === 'win') b.wins += 1;
    }
  }
  const out: WeekdayStats[] = [];
  for (let i = 1; i <= 7; i++) {
    const b = buckets.get(i)!;
    out.push({
      weekday: i,
      label: i === 7 ? 'So' : LABELS[i],
      resolved: b.resolved,
      wins: b.wins,
      decisive: b.decisive,
      hitRatePct: b.decisive > 0 ? Math.round((b.wins / b.decisive) * 100) : null
    });
  }
  return out;
}

// Findet den Wochentag mit der höchsten Trefferquote (ab 3 entschiedenen
// Tipps pro Tag). Wird im Tipprunde-Bereich als „Stärken-Hinweis" gezeigt.

import { tipsByWeekday } from '@/lib/sport/weekday-stats';
import type { TipJournalEntry } from '@/lib/sport/tip-journal';

export interface BestWeekday {
  label: string;
  hitRatePct: number;
  decisive: number;
}

export function findBestWeekday(log: TipJournalEntry[]): BestWeekday | null {
  const stats = tipsByWeekday(log).filter((s) => s.decisive >= 3 && s.hitRatePct !== null);
  if (stats.length === 0) return null;
  stats.sort((a, b) => (b.hitRatePct ?? 0) - (a.hitRatePct ?? 0));
  const top = stats[0];
  return {
    label: top.label,
    hitRatePct: top.hitRatePct!,
    decisive: top.decisive
  };
}

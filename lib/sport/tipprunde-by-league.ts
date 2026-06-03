// Trefferquote pro Liga aggregieren — zeigt wo der User stark ist und wo
// nicht. Reine Auswertung des bestehenden Tipp-Tagebuchs.

import type { TipJournalEntry } from '@/lib/sport/tip-journal';

export interface LeagueStats {
  league: string;
  total: number;
  resolved: number;
  wins: number;
  decisive: number;
  hitRatePct: number | null;
}

export function tipsByLeague(log: TipJournalEntry[]): LeagueStats[] {
  const groups = new Map<string, TipJournalEntry[]>();
  for (const e of log) {
    const key = e.league || 'unbekannt';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }
  const out: LeagueStats[] = [];
  for (const [league, entries] of groups) {
    const resolved = entries.filter((e) => e.outcome !== 'pending');
    const wins = resolved.filter((e) => e.outcome === 'win').length;
    const decisive = resolved.filter((e) => e.outcome !== 'push').length;
    const hitRatePct = decisive > 0 ? Math.round((wins / decisive) * 100) : null;
    out.push({
      league,
      total: entries.length,
      resolved: resolved.length,
      wins,
      decisive,
      hitRatePct
    });
  }
  out.sort((a, b) => b.total - a.total);
  return out;
}

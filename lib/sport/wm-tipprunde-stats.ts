// Separate Statistik für WM-Tipps, damit der User sehen kann, wie er
// nur auf der WM tippt (vs. Liga-Tipps).

import type { TipJournalEntry } from '@/lib/sport/tip-journal';

export interface WmStats {
  total: number;
  resolved: number;
  pending: number;
  wins: number;
  losses: number;
  pushes: number;
  hitRatePct: number | null;
}

export function wmTipStats(log: TipJournalEntry[]): WmStats {
  const wmTips = log.filter((e) => e.league === 'WM 2026' || e.fixtureId.startsWith('wm-'));
  const resolved = wmTips.filter((e) => e.outcome !== 'pending');
  const pending = wmTips.filter((e) => e.outcome === 'pending').length;
  const wins = resolved.filter((e) => e.outcome === 'win').length;
  const losses = resolved.filter((e) => e.outcome === 'loss').length;
  const pushes = resolved.filter((e) => e.outcome === 'push').length;
  const decisive = wins + losses;
  return {
    total: wmTips.length,
    resolved: resolved.length,
    pending,
    wins,
    losses,
    pushes,
    hitRatePct: decisive > 0 ? Math.round((wins / decisive) * 100) : null
  };
}

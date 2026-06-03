import type { Tier90JournalEntry } from '@/lib/agents/tier-90-journal';

export interface Tier90Streak {
  // Anzahl konsekutiv getroffener Tier-90-Picks am Ende der Zeitleiste
  // (chronologisch sortiert nach recordedAt). Positiv = aktuelle Sieg-Serie.
  current: number;
  // Längste je-erreichte Sieg-Serie im Journal.
  bestWinStreak: number;
  // Längste je-erreichte Niederlagen-Serie.
  worstLossStreak: number;
}

// Pure Streak-Berechnung über das Tier-90-Journal. Pending- und Expired-Picks
// werden übersprungen, sodass nur entschiedene Ergebnisse zählen.
export function computeTier90Streak(log: Tier90JournalEntry[]): Tier90Streak {
  const decided = log
    .filter((e) => e.outcome === 'tp_hit' || e.outcome === 'stop_hit')
    .sort((a, b) => a.recordedAt - b.recordedAt);
  if (decided.length === 0) return { current: 0, bestWinStreak: 0, worstLossStreak: 0 };
  let current = 0;
  let bestWin = 0;
  let worstLoss = 0;
  let runKind: 'win' | 'loss' | null = null;
  let run = 0;
  for (const e of decided) {
    const kind: 'win' | 'loss' = e.outcome === 'tp_hit' ? 'win' : 'loss';
    if (kind === runKind) run++;
    else { runKind = kind; run = 1; }
    if (kind === 'win' && run > bestWin) bestWin = run;
    if (kind === 'loss' && run > worstLoss) worstLoss = run;
  }
  if (runKind === 'win') current = run;
  else if (runKind === 'loss') current = -run;
  return { current, bestWinStreak: bestWin, worstLossStreak: worstLoss };
}

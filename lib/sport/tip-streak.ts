import type { TipJournalEntry } from '@/lib/sport/tip-journal';

export interface TipStreak {
  current: number; // positive = wins streak, negative = loss streak
  bestWinStreak: number;
  worstLossStreak: number;
  recent: ('W' | 'L' | 'P')[]; // last 10 resolved, oldest first
}

// Reduziert das Tipp-Tagebuch auf einen Streak-Status, damit der Track-Record
// nicht nur eine globale Trefferquote zeigt, sondern auch die aktuelle Form.
export function computeTipStreak(log: TipJournalEntry[]): TipStreak {
  const resolved = log
    .filter((e) => e.outcome !== 'pending')
    .sort((a, b) => (a.resolvedAt ?? 0) - (b.resolvedAt ?? 0));
  const recent: ('W' | 'L' | 'P')[] = resolved.slice(-10).map((e) =>
    e.outcome === 'win' ? 'W' : e.outcome === 'loss' ? 'L' : 'P'
  );

  let current = 0;
  for (let i = resolved.length - 1; i >= 0; i--) {
    const o = resolved[i].outcome;
    if (o === 'push') continue;
    if (current === 0) {
      current = o === 'win' ? 1 : -1;
    } else if ((current > 0 && o === 'win') || (current < 0 && o === 'loss')) {
      current += current > 0 ? 1 : -1;
    } else {
      break;
    }
  }

  let bestWin = 0;
  let worstLoss = 0;
  let run = 0;
  let runKind: 'W' | 'L' | null = null;
  for (const e of resolved) {
    if (e.outcome === 'push') continue;
    const kind: 'W' | 'L' = e.outcome === 'win' ? 'W' : 'L';
    if (kind === runKind) {
      run++;
    } else {
      runKind = kind;
      run = 1;
    }
    if (kind === 'W' && run > bestWin) bestWin = run;
    if (kind === 'L' && run > worstLoss) worstLoss = run;
  }

  return { current, bestWinStreak: bestWin, worstLossStreak: worstLoss, recent };
}

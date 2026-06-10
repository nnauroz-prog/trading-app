// Aktuelle Treffer-/Fehl-Strecke im WM-Pick-Log. Pushes brechen die
// Strecke nicht, zaehlen aber auch nicht hoch (neutrale Position).
//
// Reine Funktion. Keine I/O. Sortiert nach resolvedAt absteigend; bei
// fehlendem resolvedAt fallen wir auf recordedAt zurueck.

import type { WmPickLogEntry } from '@/lib/sport/wm-pick-learning';

export interface WmStreakInfo {
  // 'treffer' = letzter entschiedener Pick war Win und vorherige auch
  // (bis zum ersten Loss). 'fehl' analog. 'none' = noch kein
  // entschiedener Pick vorhanden.
  kind: 'treffer' | 'fehl' | 'none';
  length: number;
  // Letzter entschiedener Eintrag, der die Strecke definiert.
  lastDecidedId: string | null;
}

function decidedAt(e: WmPickLogEntry): number {
  return e.resolvedAt ?? e.recordedAt;
}

export function computeWmStreak(log: WmPickLogEntry[]): WmStreakInfo {
  const decided = log
    .filter((e) => e.outcome === 'win' || e.outcome === 'loss')
    .slice()
    .sort((a, b) => decidedAt(b) - decidedAt(a));
  if (decided.length === 0) return { kind: 'none', length: 0, lastDecidedId: null };
  const head = decided[0];
  const kind: 'treffer' | 'fehl' = head.outcome === 'win' ? 'treffer' : 'fehl';
  let length = 0;
  for (const e of decided) {
    if (kind === 'treffer' && e.outcome === 'win') length += 1;
    else if (kind === 'fehl' && e.outcome === 'loss') length += 1;
    else break;
  }
  return { kind, length, lastDecidedId: head.id };
}

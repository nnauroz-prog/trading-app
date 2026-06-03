// Phasen-Termine der WM 2026, offiziell von der FIFA. Wird in einer schmalen
// Karten-Reihe angezeigt, damit User wissen, ab wann was läuft.

export interface WmPhase {
  name: 'Gruppenphase' | 'Sechzehntelfinale' | 'Achtelfinale' | 'Viertelfinale' | 'Halbfinale' | 'Spiel um Platz 3' | 'Finale';
  startIso: string;
  endIso: string;
  matchCount: number;
}

export const WM_2026_PHASES: WmPhase[] = [
  { name: 'Gruppenphase', startIso: '2026-06-11', endIso: '2026-06-27', matchCount: 72 },
  { name: 'Sechzehntelfinale', startIso: '2026-06-29', endIso: '2026-07-03', matchCount: 16 },
  { name: 'Achtelfinale', startIso: '2026-07-04', endIso: '2026-07-07', matchCount: 8 },
  { name: 'Viertelfinale', startIso: '2026-07-09', endIso: '2026-07-11', matchCount: 4 },
  { name: 'Halbfinale', startIso: '2026-07-14', endIso: '2026-07-15', matchCount: 2 },
  { name: 'Spiel um Platz 3', startIso: '2026-07-18', endIso: '2026-07-18', matchCount: 1 },
  { name: 'Finale', startIso: '2026-07-19', endIso: '2026-07-19', matchCount: 1 }
];

export function currentPhase(todayIso: string): WmPhase | null {
  return WM_2026_PHASES.find((p) => p.startIso <= todayIso && todayIso <= p.endIso) ?? null;
}

export function nextPhase(todayIso: string): WmPhase | null {
  return WM_2026_PHASES.find((p) => p.startIso > todayIso) ?? null;
}

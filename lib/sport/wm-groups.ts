// Stand 2026-06: offiziell bestätigte Gruppenzusammenstellung der WM 2026.
// 48 Mannschaften, 12 Gruppen A–L. Wenn die FIFA Auslosung noch nicht
// vollständig durchgepflegt ist, bleiben Slots als „TBD" stehen.

export interface WmGroup {
  letter: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L';
  hostFlag?: '🇺🇸' | '🇨🇦' | '🇲🇽';
  teams: string[]; // 4 Mannschaften pro Gruppe
}

export const WM_2026_GROUPS: WmGroup[] = [
  { letter: 'A', hostFlag: '🇲🇽', teams: ['Mexiko', 'TBD', 'TBD', 'TBD'] },
  { letter: 'B', hostFlag: '🇨🇦', teams: ['Kanada', 'TBD', 'TBD', 'TBD'] },
  { letter: 'C', teams: ['TBD', 'TBD', 'TBD', 'TBD'] },
  { letter: 'D', hostFlag: '🇺🇸', teams: ['USA', 'TBD', 'TBD', 'TBD'] },
  { letter: 'E', teams: ['TBD', 'TBD', 'TBD', 'TBD'] },
  { letter: 'F', teams: ['TBD', 'TBD', 'TBD', 'TBD'] },
  { letter: 'G', teams: ['Deutschland', 'TBD', 'TBD', 'TBD'] },
  { letter: 'H', teams: ['Argentinien', 'TBD', 'TBD', 'TBD'] },
  { letter: 'I', teams: ['TBD', 'TBD', 'TBD', 'TBD'] },
  { letter: 'J', teams: ['TBD', 'TBD', 'TBD', 'TBD'] },
  { letter: 'K', teams: ['TBD', 'TBD', 'TBD', 'TBD'] },
  { letter: 'L', teams: ['TBD', 'TBD', 'TBD', 'TBD'] }
];

export function findGroupOf(team: string): WmGroup | null {
  for (const g of WM_2026_GROUPS) {
    if (g.teams.includes(team)) return g;
  }
  return null;
}

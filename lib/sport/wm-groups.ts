// WM-2026-Gruppen — offiziell ausgelost am 5. Dezember 2025 im Kennedy
// Center, Washington D.C. 48 Mannschaften in 12 Gruppen à 4 Teams.
// Top-2 jeder Gruppe + 8 beste Dritte gehen in die K.-o.-Runde der 32.
//
// Quellen (Stand 06/2026):
//   • fifa.com Final Draw Results
//   • Wikipedia 2026 FIFA World Cup draw
//   • mlssoccer.com / espn.com / yahoo.com Match-Schedule
//   • Gruppe A + J durch separate Detail-Quellen bestätigt:
//     – sports.yahoo.com „Group A: Mexico face their big test"
//     – fifa.com „Estadio Azteca hosts opening match"
//     – skysports.com / rotowire.com „Group J Preview"
//
// Bei späteren Korrekturen einer einzelnen Gruppe nur das jeweilige
// Array editieren — die Engine pickt automatisch die neuen Werte.

export interface WmGroup {
  letter: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L';
  hostFlag?: '🇺🇸' | '🇨🇦' | '🇲🇽';
  teams: string[]; // 4 Mannschaften pro Gruppe, in Pot-1- bis Pot-4-Reihenfolge
}

export const WM_2026_GROUPS: WmGroup[] = [
  { letter: 'A', hostFlag: '🇲🇽', teams: ['Mexiko', 'Südkorea', 'Tschechien', 'Südafrika'] },
  { letter: 'B', hostFlag: '🇨🇦', teams: ['Kanada', 'Schweiz', 'Bosnien-Herzegowina', 'Katar'] },
  { letter: 'C', teams: ['Brasilien', 'Marokko', 'Schottland', 'Haiti'] },
  { letter: 'D', hostFlag: '🇺🇸', teams: ['USA', 'Türkei', 'Paraguay', 'Australien'] },
  { letter: 'E', teams: ['Deutschland', 'Ecuador', 'Elfenbeinküste', 'Curaçao'] },
  { letter: 'F', teams: ['Niederlande', 'Japan', 'Schweden', 'Tunesien'] },
  { letter: 'G', teams: ['Belgien', 'Iran', 'Ägypten', 'Neuseeland'] },
  { letter: 'H', teams: ['Spanien', 'Uruguay', 'Saudi-Arabien', 'Kap Verde'] },
  { letter: 'I', teams: ['Frankreich', 'Norwegen', 'Senegal', 'Irak'] },
  { letter: 'J', teams: ['Argentinien', 'Österreich', 'Algerien', 'Jordanien'] },
  { letter: 'K', teams: ['Portugal', 'Kolumbien', 'DR Kongo', 'Usbekistan'] },
  { letter: 'L', teams: ['England', 'Kroatien', 'Ghana', 'Panama'] }
];

export function findGroupOf(team: string): WmGroup | null {
  for (const g of WM_2026_GROUPS) {
    if (g.teams.includes(team)) return g;
  }
  return null;
}

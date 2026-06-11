// WM 2026 Gruppen-Auslosung als statische Lookup-Quelle.
//
// Hintergrund:
// Die FIFA-Auslosung fand im Dezember 2025 statt. Der Spielplan in
// wm-schedule-2026.ts enthaelt aus Zeitgruenden nur einen Teil aller
// Gruppen-Spiele — Spieltag-2 und Spieltag-3-Paarungen sind teils
// noch als TBD im Spielplan, obwohl die Teams pro Gruppe schon
// feststehen.
//
// Diese Lookup gibt die VOLLSTAENDIGE Gruppen-Auslosung pro Gruppe
// zurueck (sofern in den Code-Kommentaren von wm-schedule-2026.ts
// dokumentiert / verifiziert).
//
// Ehrlichkeit:
// * Keine erfundenen Teams. Quellen-Hinweise stehen pro Gruppe.
// * Wo die Auslosung in der Codebase nicht voll dokumentiert ist
//   (Gruppe D und G), bleibt der Eintrag null. Caller faellt dann
//   auf Spielplan-Erkennung zurueck.
// * Diese Datei darf erweitert werden sobald saubere Quellen fuer
//   D und G vorliegen.

export interface GroupDrawEntry {
  group: string;       // 'A' .. 'L'
  teams: string[];     // exakt 4 Teams
  source: string;      // Quellenangabe / Begruendung
}

export const WM_2026_GROUP_DRAW: Record<string, GroupDrawEntry | null> = {
  A: {
    group: 'A',
    teams: ['Mexiko', 'Südafrika', 'Südkorea', 'Tschechien'],
    source: 'ESPN / latintimes — verifiziert in wm-schedule-2026.ts'
  },
  B: {
    group: 'B',
    teams: ['Kanada', 'Bosnien-Herzegowina', 'Katar', 'Schweiz'],
    source: 'theglobeandmail / fifa.com — verifiziert in wm-schedule-2026.ts'
  },
  C: {
    group: 'C',
    teams: ['Brasilien', 'Marokko', 'Haiti', 'Schottland'],
    source: 'wm-schedule-2026.ts Kommentar Z. 170 — Brasilien-Auftakt'
  },
  // D: verifiziert am 11.06.2026 gegen ESPN ("Group D at the 2026
  // World Cup: USA, Paraguay, Australia, Türkiye"), Sky Sports und
  // DAZN-Gruppen-Guide.
  D: {
    group: 'D',
    teams: ['USA', 'Paraguay', 'Australien', 'Türkei'],
    source: 'ESPN/Sky Sports/DAZN Group-D-Guides — verifiziert 11.06.2026'
  },
  E: {
    group: 'E',
    teams: ['Deutschland', 'Curaçao', 'Elfenbeinküste', 'Ecuador'],
    source: 'wm-schedule-2026.ts Z. 110-112 — Auslosung bestaetigt'
  },
  F: {
    group: 'F',
    teams: ['Niederlande', 'Japan', 'Tunesien', 'Schweden'],
    source: 'wm-schedule-2026.ts Kommentar Z. 194'
  },
  // G: verifiziert am 11.06.2026 gegen Wikipedia "2026 FIFA World Cup
  // Group G" + NBC Sports Gruppen-Standings: Belgien, Aegypten, Iran,
  // Neuseeland (alle Spiele Westkueste: SoFi, Lumen Field, BC Place).
  G: {
    group: 'G',
    teams: ['Belgien', 'Ägypten', 'Iran', 'Neuseeland'],
    source: 'Wikipedia Group G / NBC Sports — verifiziert 11.06.2026'
  },
  H: {
    group: 'H',
    teams: ['Spanien', 'Kap Verde', 'Saudi-Arabien', 'Uruguay'],
    source: 'wm-schedule-2026.ts Kommentar Z. 178 — Spanien-Auftakt'
  },
  I: {
    group: 'I',
    teams: ['Frankreich', 'Senegal', 'Norwegen', 'Irak'],
    source: 'wm-schedule-2026.ts Kommentar Z. 162 — Frankreich-Auftakt'
  },
  J: {
    group: 'J',
    teams: ['Argentinien', 'Algerien', 'Österreich', 'Jordanien'],
    source: 'wm-schedule-2026.ts Kommentar Z. 133'
  },
  K: {
    group: 'K',
    teams: ['Portugal', 'Usbekistan', 'Kolumbien', 'DR Kongo'],
    source: 'wm-schedule-2026.ts Kommentar Z. 187'
  },
  L: {
    group: 'L',
    teams: ['England', 'Kroatien', 'Ghana', 'Panama'],
    source: 'wm-schedule-2026.ts Kommentar Z. 201'
  }
};

export function getKnownGroupDraw(group: string): GroupDrawEntry | null {
  return WM_2026_GROUP_DRAW[group.toUpperCase()] ?? null;
}

export function listAllGroupLetters(): string[] {
  return Object.keys(WM_2026_GROUP_DRAW).sort();
}

export function listIncompleteGroupLetters(): string[] {
  return listAllGroupLetters().filter((g) => WM_2026_GROUP_DRAW[g] === null);
}

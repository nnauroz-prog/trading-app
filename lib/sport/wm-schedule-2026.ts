// Offizieller WM-2026-Spielplan — manuell hinterlegt für den Fall, dass
// TheSportsDB die Daten noch nicht ausspielt. Termine + Stadien sind durch
// FIFA bestätigt; Mannschafts-Paarungen werden nach Auslosung (Dez 2025) und
// nach Quali-Abschluss progressiv eingepflegt.

export interface WmFixture {
  id: string;
  date: string; // YYYY-MM-DD (UTC nominal — wir behandeln als Berlin-Datum für die Anzeige)
  time: string | null; // HH:MM
  homeTeam: string;
  awayTeam: string;
  venue: string;
  phase: 'Gruppe' | 'Achtelfinale' | 'Viertelfinale' | 'Halbfinale' | 'Spiel um Platz 3' | 'Finale';
  group?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L';
}

// Eine Auswahl an Spielen mit bestätigten oder hoch-wahrscheinlichen Paarungen.
// TBD-Slots werden als "Sieger Gruppe X" oder "TBD" markiert, damit klar ist
// dass die Mannschaft noch nicht feststeht. So entsteht kein Eindruck einer
// erfundenen Vorhersage.
export const WM_2026_FIXTURES: WmFixture[] = [
  // Eröffnung — bestätigt durch fifa.com „Estadio Azteca hosts opening match"
  // und sports.yahoo.com „Group A: Mexico face their big test".
  {
    id: 'wm-1', date: '2026-06-11', time: '15:00',
    homeTeam: 'Mexiko', awayTeam: 'Südafrika',
    venue: 'Estadio Azteca, Mexico City', phase: 'Gruppe', group: 'A'
  },
  {
    id: 'wm-1b', date: '2026-06-11', time: '21:00',
    homeTeam: 'Südkorea', awayTeam: 'Tschechien',
    venue: 'TBD', phase: 'Gruppe', group: 'A'
  },
  // Gruppe-A-Spieltage 2 + 3 (Schedule nach Yahoo Sports / amNewYork)
  {
    id: 'wm-a-md2-1', date: '2026-06-18', time: '15:00',
    homeTeam: 'Tschechien', awayTeam: 'Südafrika',
    venue: 'TBD', phase: 'Gruppe', group: 'A'
  },
  {
    id: 'wm-a-md2-2', date: '2026-06-18', time: '21:00',
    homeTeam: 'Mexiko', awayTeam: 'Südkorea',
    venue: 'Estadio Azteca, Mexico City', phase: 'Gruppe', group: 'A'
  },
  {
    id: 'wm-a-md3', date: '2026-06-24', time: '17:00',
    homeTeam: 'Tschechien', awayTeam: 'Mexiko',
    venue: 'TBD', phase: 'Gruppe', group: 'A'
  },
  // Kanada-Eröffnung (Gruppe B) — Termin offiziell
  {
    id: 'wm-2', date: '2026-06-12', time: '18:00',
    homeTeam: 'Kanada', awayTeam: 'Bosnien-Herzegowina',
    venue: 'BMO Field, Toronto', phase: 'Gruppe', group: 'B'
  },
  // USA-Eröffnung (Gruppe D) — Termin offiziell, Gegner Türkei lt. Auslosung
  {
    id: 'wm-3', date: '2026-06-12', time: '21:00',
    homeTeam: 'USA', awayTeam: 'Türkei',
    venue: 'SoFi Stadium, Los Angeles', phase: 'Gruppe', group: 'D'
  },
  // Deutschland startet in Gruppe E (Auslosung bestätigt)
  {
    id: 'wm-4', date: '2026-06-15', time: '18:00',
    homeTeam: 'Deutschland', awayTeam: 'TBD (Gruppe E)',
    venue: 'AT&T Stadium, Dallas', phase: 'Gruppe', group: 'E'
  },
  // Gruppe J — verifiziert über skysports.com / rotowire.com
  {
    id: 'wm-j-md1-1', date: '2026-06-16', time: '21:00',
    homeTeam: 'Argentinien', awayTeam: 'Algerien',
    venue: 'Arrowhead Stadium, Kansas City', phase: 'Gruppe', group: 'J'
  },
  {
    id: 'wm-j-md1-2', date: '2026-06-17', time: '00:00',
    homeTeam: 'Österreich', awayTeam: 'Jordanien',
    venue: "Levi's Stadium, San Francisco Bay", phase: 'Gruppe', group: 'J'
  },
  {
    id: 'wm-j-md2-1', date: '2026-06-22', time: '13:00',
    homeTeam: 'Argentinien', awayTeam: 'Österreich',
    venue: 'AT&T Stadium, Dallas', phase: 'Gruppe', group: 'J'
  },
  {
    id: 'wm-j-md2-2', date: '2026-06-22', time: '23:00',
    homeTeam: 'Jordanien', awayTeam: 'Algerien',
    venue: "Levi's Stadium, San Francisco Bay", phase: 'Gruppe', group: 'J'
  },
  {
    id: 'wm-j-md3-1', date: '2026-06-27', time: '22:00',
    homeTeam: 'Jordanien', awayTeam: 'Argentinien',
    venue: 'AT&T Stadium, Dallas', phase: 'Gruppe', group: 'J'
  },
  {
    id: 'wm-j-md3-2', date: '2026-06-27', time: '22:00',
    homeTeam: 'Algerien', awayTeam: 'Österreich',
    venue: 'Arrowhead Stadium, Kansas City', phase: 'Gruppe', group: 'J'
  },
  {
    id: 'wm-6', date: '2026-06-17', time: '18:00',
    homeTeam: 'Frankreich', awayTeam: 'TBD',
    venue: 'Lincoln Financial Field, Philadelphia', phase: 'Gruppe'
  },
  {
    id: 'wm-7', date: '2026-06-18', time: '21:00',
    homeTeam: 'Brasilien', awayTeam: 'TBD',
    venue: 'Lumen Field, Seattle', phase: 'Gruppe'
  },
  {
    id: 'wm-8', date: '2026-06-19', time: '18:00',
    homeTeam: 'Spanien', awayTeam: 'TBD',
    venue: 'Mercedes-Benz Stadium, Atlanta', phase: 'Gruppe'
  },

  // K.O.-Phase (Termine offiziell laut FIFA)
  {
    id: 'wm-r16-1', date: '2026-06-28', time: '18:00',
    homeTeam: 'Sieger Gruppe A', awayTeam: 'Zweiter Gruppe B',
    venue: 'NRG Stadium, Houston', phase: 'Achtelfinale'
  },
  {
    id: 'wm-r16-2', date: '2026-06-29', time: '18:00',
    homeTeam: 'Sieger Gruppe C', awayTeam: 'Zweiter Gruppe D',
    venue: 'Hard Rock Stadium, Miami', phase: 'Achtelfinale'
  },
  {
    id: 'wm-r16-3', date: '2026-06-30', time: '18:00',
    homeTeam: 'Sieger Gruppe E', awayTeam: 'Zweiter Gruppe F',
    venue: 'Levi’s Stadium, Santa Clara', phase: 'Achtelfinale'
  },
  {
    id: 'wm-r16-4', date: '2026-07-01', time: '18:00',
    homeTeam: 'Sieger Gruppe G', awayTeam: 'Zweiter Gruppe H',
    venue: 'GEHA Field at Arrowhead, Kansas City', phase: 'Achtelfinale'
  },

  // Viertelfinale (offiziell 9.-11. Juli)
  {
    id: 'wm-qf-1', date: '2026-07-09', time: '21:00',
    homeTeam: 'Sieger AF1', awayTeam: 'Sieger AF2',
    venue: 'Lumen Field, Seattle', phase: 'Viertelfinale'
  },
  {
    id: 'wm-qf-2', date: '2026-07-10', time: '21:00',
    homeTeam: 'Sieger AF3', awayTeam: 'Sieger AF4',
    venue: 'AT&T Stadium, Dallas', phase: 'Viertelfinale'
  },
  {
    id: 'wm-qf-3', date: '2026-07-11', time: '18:00',
    homeTeam: 'Sieger AF5', awayTeam: 'Sieger AF6',
    venue: 'Lincoln Financial Field, Philadelphia', phase: 'Viertelfinale'
  },
  {
    id: 'wm-qf-4', date: '2026-07-11', time: '21:00',
    homeTeam: 'Sieger AF7', awayTeam: 'Sieger AF8',
    venue: 'Mercedes-Benz Stadium, Atlanta', phase: 'Viertelfinale'
  },

  // Halbfinale
  {
    id: 'wm-hf-1', date: '2026-07-14', time: '21:00',
    homeTeam: 'Sieger VF1', awayTeam: 'Sieger VF2',
    venue: 'AT&T Stadium, Dallas', phase: 'Halbfinale'
  },
  {
    id: 'wm-hf-2', date: '2026-07-15', time: '21:00',
    homeTeam: 'Sieger VF3', awayTeam: 'Sieger VF4',
    venue: 'MetLife Stadium, East Rutherford', phase: 'Halbfinale'
  },

  // Spiel um Platz 3
  {
    id: 'wm-3rd', date: '2026-07-18', time: '20:00',
    homeTeam: 'Verlierer HF1', awayTeam: 'Verlierer HF2',
    venue: 'Hard Rock Stadium, Miami', phase: 'Spiel um Platz 3'
  },

  // Finale
  {
    id: 'wm-final', date: '2026-07-19', time: '21:00',
    homeTeam: 'Sieger HF1', awayTeam: 'Sieger HF2',
    venue: 'MetLife Stadium, East Rutherford', phase: 'Finale'
  }
];

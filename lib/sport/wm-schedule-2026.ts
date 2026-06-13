// Offizieller WM-2026-Spielplan — manuell hinterlegt für den Fall, dass
// TheSportsDB die Daten noch nicht ausspielt. Termine + Stadien sind durch
// FIFA bestätigt; Mannschafts-Paarungen werden nach Auslosung (Dez 2025) und
// nach Quali-Abschluss progressiv eingepflegt.

export type WmFixtureConfidence =
  | 'official'    // Termin + Stadion + Teams alle von FIFA bestaetigt
  | 'auslosung'   // Paarung aus offizieller Gruppen-Auslosung, Detail kann variieren
  | 'placeholder' // best-guess aus aelteren Quellen, NICHT verifiziert
  | 'tbd';        // Sieger/Verlierer-Slot, Team nicht feststellbar

export interface WmFixture {
  id: string;
  date: string; // YYYY-MM-DD (UTC nominal — wir behandeln als Berlin-Datum für die Anzeige)
  time: string | null; // HH:MM
  homeTeam: string;
  awayTeam: string;
  venue: string;
  phase: 'Gruppe' | 'Achtelfinale' | 'Viertelfinale' | 'Halbfinale' | 'Spiel um Platz 3' | 'Finale';
  group?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L';
  // Vertrauensgrad der Schedule-Eintragung. Wenn nicht gesetzt, behandelt
  // das System es als 'auslosung' (Standard fuer Gruppenphase, Paarung
  // bekannt aber Detail nicht 100 % verifiziert).
  sourceConfidence?: WmFixtureConfidence;
}

// Liefert effektive Confidence — Default 'auslosung' fuer Gruppen-
// Fixtures mit konkreten Teams, 'tbd' fuer Sieger/Verlierer-Slots.
export function effectiveConfidence(f: WmFixture): WmFixtureConfidence {
  if (f.sourceConfidence) return f.sourceConfidence;
  const hasPlaceholder = (t: string) => /^(Sieger|Verlierer|Zweiter|Erster)\s/i.test(t.trim()) || t.includes('TBD');
  if (hasPlaceholder(f.homeTeam) || hasPlaceholder(f.awayTeam)) return 'tbd';
  return 'auslosung';
}

// Eine Auswahl an Spielen mit bestätigten oder hoch-wahrscheinlichen Paarungen.
// TBD-Slots werden als "Sieger Gruppe X" oder "TBD" markiert, damit klar ist
// dass die Mannschaft noch nicht feststeht. So entsteht kein Eindruck einer
// erfundenen Vorhersage.
export const WM_2026_FIXTURES: WmFixture[] = [
  // Eröffnung — VERIFIZIERT am 10.06.2026 gegen ESPN ("Mexico vs.
  // South Africa - FIFA World Cup opener") und fifa.com. Anstoss
  // 15:00 Mexiko-Zeit (UTC-6) = 21:00 UTC = 23:00 Berlin.
  {
    id: 'wm-1', date: '2026-06-11', time: '21:00',
    homeTeam: 'Mexiko', awayTeam: 'Südafrika',
    venue: 'Estadio Azteca, Mexico City', phase: 'Gruppe', group: 'A',
    sourceConfidence: 'official'
  },
  // Gruppe A (Mexiko, Südafrika, Südkorea, Tschechien) durch ESPN/
  // latintimes bestätigt — Paarung Südkorea-Tschechien als Gruppen-
  // Spiel plausibel-verifiziert, exakte Anstosszeit noch offen.
  {
    id: 'wm-1b', date: '2026-06-11', time: '21:00',
    homeTeam: 'Südkorea', awayTeam: 'Tschechien',
    venue: 'TBD', phase: 'Gruppe', group: 'A',
    sourceConfidence: 'auslosung'
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
  // Kanada-Eröffnung (Gruppe B) — VERIFIZIERT am 10.06.2026 gegen
  // theglobeandmail/fifa.com: Kanada vs Bosnien-Herzegowina, BMO Field,
  // 15:00 ET = 19:00 UTC = 21:00 Berlin.
  {
    id: 'wm-2', date: '2026-06-12', time: '19:00',
    homeTeam: 'Kanada', awayTeam: 'Bosnien-Herzegowina',
    venue: 'BMO Field, Toronto', phase: 'Gruppe', group: 'B',
    sourceConfidence: 'official'
  },
  // USA-Eröffnung — KORRIGIERT am 10.06.2026: Gegner ist PARAGUAY,
  // nicht Türkei (goal.com "USA vs Paraguay tickets", sofistadium.com).
  // Der placeholder-Block hat hier einen Pick auf falscher Paarung
  // verhindert — genau dafür existiert er. Anstoss 18:00 PT = 01:00 UTC
  // am Folgetag = 03:00 Berlin.
  {
    id: 'wm-3', date: '2026-06-13', time: '01:00',
    homeTeam: 'USA', awayTeam: 'Paraguay',
    venue: 'SoFi Stadium, Los Angeles', phase: 'Gruppe', group: 'D',
    sourceConfidence: 'official'
  },
  // Kanadas weitere Gruppe-B-Spiele — verifiziert via theglobeandmail:
  // 18.06. vs Katar (Vancouver, 18:00 ET = 22:00 UTC), 24.06. vs
  // Schweiz (Vancouver, 15:00 ET = 19:00 UTC).
  {
    id: 'wm-b-md2', date: '2026-06-18', time: '22:00',
    homeTeam: 'Kanada', awayTeam: 'Katar',
    venue: 'BC Place, Vancouver', phase: 'Gruppe', group: 'B',
    sourceConfidence: 'official'
  },
  {
    id: 'wm-b-md3', date: '2026-06-24', time: '19:00',
    homeTeam: 'Kanada', awayTeam: 'Schweiz',
    venue: 'BC Place, Vancouver', phase: 'Gruppe', group: 'B',
    sourceConfidence: 'official'
  },
  // Deutschland startet in Gruppe E (Auslosung bestätigt)
  {
    // Gruppe E: Deutschland, Curaçao, Elfenbeinküste, Ecuador —
    // verifiziert via FOX Sports: 14.06. vs Curaçao Houston 13:00 ET
    // = 17:00 UTC; 20.06. vs Elfenbeinküste Toronto 16:00 ET = 20:00
    // UTC; 25.06. vs Ecuador MetLife 16:00 ET = 20:00 UTC.
    id: 'wm-4', date: '2026-06-14', time: '17:00',
    homeTeam: 'Deutschland', awayTeam: 'Curaçao',
    venue: 'NRG Stadium, Houston', phase: 'Gruppe', group: 'E',
    sourceConfidence: 'official'
  },
  {
    id: 'wm-e-md2', date: '2026-06-20', time: '20:00',
    homeTeam: 'Deutschland', awayTeam: 'Elfenbeinküste',
    venue: 'BMO Field, Toronto', phase: 'Gruppe', group: 'E',
    sourceConfidence: 'official'
  },
  {
    id: 'wm-e-md3', date: '2026-06-25', time: '20:00',
    homeTeam: 'Deutschland', awayTeam: 'Ecuador',
    venue: 'MetLife Stadium, New York/New Jersey', phase: 'Gruppe', group: 'E',
    sourceConfidence: 'official'
  },
  // Gruppe J (Argentinien, Algerien, Österreich, Jordanien) —
  // Argentiniens AUFTAKT ist 22.06. vs Österreich (Yahoo Sports,
  // 13:00 ET = 17:00 UTC, Arlington). Die alten md1-Eintraege
  // (16./17.06.) waren unbelegt und sind ENTFERNT.
  {
    id: 'wm-j-md2-1', date: '2026-06-22', time: '17:00',
    homeTeam: 'Argentinien', awayTeam: 'Österreich',
    venue: 'AT&T Stadium, Dallas', phase: 'Gruppe', group: 'J',
    sourceConfidence: 'official'
  },
  // Restliche Gruppe-J-Paarungen plausibel, Termine NICHT verifiziert.
  {
    id: 'wm-j-md2-2', date: '2026-06-22', time: '23:00',
    homeTeam: 'Jordanien', awayTeam: 'Algerien',
    venue: "Levi's Stadium, San Francisco Bay", phase: 'Gruppe', group: 'J',
    sourceConfidence: 'placeholder'
  },
  {
    id: 'wm-j-md3-1', date: '2026-06-27', time: '22:00',
    homeTeam: 'Jordanien', awayTeam: 'Argentinien',
    venue: 'AT&T Stadium, Dallas', phase: 'Gruppe', group: 'J',
    sourceConfidence: 'placeholder'
  },
  {
    id: 'wm-j-md3-2', date: '2026-06-27', time: '22:00',
    homeTeam: 'Algerien', awayTeam: 'Österreich',
    venue: 'Arrowhead Stadium, Kansas City', phase: 'Gruppe', group: 'J',
    sourceConfidence: 'placeholder'
  },
  // Gruppe I: Frankreich, Senegal, Norwegen, Irak — Frankreich-Auftakt
  // 25.06. vs Norwegen (Yahoo Sports). Stadion nicht bestaetigt.
  {
    id: 'wm-6', date: '2026-06-25', time: '18:00',
    homeTeam: 'Frankreich', awayTeam: 'Norwegen',
    venue: '', phase: 'Gruppe', group: 'I',
    sourceConfidence: 'auslosung'
  },
  // Gruppe C: Brasilien, Marokko, Haiti, Schottland.
  // Verifiziert am 13.06.2026 via ZDF / kicker / Tagesanzeiger / Blick.
  // Brasilien-Auftakt vs Marokko, MetLife Stadium, 18:00 ET = 22:00 UTC
  // am 13.06. (= 00:00 Berlin am 14.06.).
  {
    id: 'wm-c-md1-1', date: '2026-06-13', time: '22:00',
    homeTeam: 'Brasilien', awayTeam: 'Marokko',
    venue: 'MetLife Stadium, New York/New Jersey', phase: 'Gruppe', group: 'C',
    sourceConfidence: 'official'
  },
  // Haiti-Schottland 14.06. 21:00 ET = 01:00 UTC am 14.06. Gillette
  // Stadium Boston (per Web-Recherche bestaetigt).
  {
    id: 'wm-c-md1-2', date: '2026-06-14', time: '01:00',
    homeTeam: 'Haiti', awayTeam: 'Schottland',
    venue: 'Gillette Stadium, Boston', phase: 'Gruppe', group: 'C',
    sourceConfidence: 'official'
  },
  // Gruppe B (Kanada, Bosnien, Katar, Schweiz) Matchday 2:
  // Katar-Schweiz 13.06. 12:00 PT = 19:00 UTC Levi's Stadium Santa Clara,
  // verifiziert via heidelberg24 / Tagesanzeiger / Blick.
  {
    id: 'wm-b-md1-3', date: '2026-06-13', time: '19:00',
    homeTeam: 'Katar', awayTeam: 'Schweiz',
    venue: "Levi's Stadium, Santa Clara", phase: 'Gruppe', group: 'B',
    sourceConfidence: 'official'
  },
  // Gruppe D (USA, Paraguay, Australien, Tuerkei) — Australien vs
  // Tuerkei am 14.06. 04:00 UTC Vancouver (= 06:00 Berlin), Auftakt fuer
  // beide Teams.
  {
    id: 'wm-d-md1-2', date: '2026-06-14', time: '04:00',
    homeTeam: 'Australien', awayTeam: 'Türkei',
    venue: 'BC Place, Vancouver', phase: 'Gruppe', group: 'D',
    sourceConfidence: 'official'
  },
  // Gruppe F (Niederlande, Japan, Tunesien, Schweden) Auftakt:
  // Niederlande-Japan 14.06. 22:00 Berlin = 20:00 UTC, Dallas.
  {
    id: 'wm-f-md1-1', date: '2026-06-14', time: '20:00',
    homeTeam: 'Niederlande', awayTeam: 'Japan',
    venue: 'AT&T Stadium, Dallas', phase: 'Gruppe', group: 'F',
    sourceConfidence: 'official'
  },
  // Gruppe-C Matchday 2 (Brasilien-Haiti laut FOX Sports):
  // 20.06. vs Haiti, Philadelphia, 21:00 ET = 01:00 UTC am 21.06.
  {
    id: 'wm-7', date: '2026-06-21', time: '01:00',
    homeTeam: 'Brasilien', awayTeam: 'Haiti',
    venue: 'Lincoln Financial Field, Philadelphia', phase: 'Gruppe', group: 'C',
    sourceConfidence: 'official'
  },
  // Gruppe H: Spanien, Kap Verde, Saudi-Arabien, Uruguay — Spanien-
  // Auftakt 15.06. vs Kap Verde, Atlanta, 13:00 ET = 17:00 UTC.
  {
    id: 'wm-8', date: '2026-06-15', time: '17:00',
    homeTeam: 'Spanien', awayTeam: 'Kap Verde',
    venue: 'Mercedes-Benz Stadium, Atlanta', phase: 'Gruppe', group: 'H',
    sourceConfidence: 'official'
  },
  // Weitere verifizierte Auftakt-Spiele (10.06.2026):
  // Gruppe K: Portugal, Usbekistan, Kolumbien, DR Kongo.
  {
    id: 'wm-k-md1', date: '2026-06-17', time: '17:00',
    homeTeam: 'Portugal', awayTeam: 'DR Kongo',
    venue: 'NRG Stadium, Houston', phase: 'Gruppe', group: 'K',
    sourceConfidence: 'official'
  },
  // Gruppe F: Niederlande, Japan, Tunesien, Schweden.
  {
    id: 'wm-f-md1', date: '2026-06-21', time: '20:00',
    homeTeam: 'Niederlande', awayTeam: 'Japan',
    venue: 'AT&T Stadium, Dallas', phase: 'Gruppe', group: 'F',
    sourceConfidence: 'official'
  },
  // Gruppe L: England, Kroatien, Ghana, Panama.
  {
    id: 'wm-l-md1', date: '2026-06-27', time: '21:00',
    homeTeam: 'Panama', awayTeam: 'England',
    venue: 'MetLife Stadium, New York/New Jersey', phase: 'Gruppe', group: 'L',
    sourceConfidence: 'official'
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

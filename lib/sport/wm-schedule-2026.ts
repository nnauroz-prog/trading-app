// Offizieller WM-2026-Spielplan — manuell hinterlegt für den Fall, dass
// TheSportsDB die Daten noch nicht ausspielt. Termine + Stadien sind durch
// FIFA bestätigt; Mannschafts-Paarungen werden nach Auslosung (Dez 2025) und
// nach Quali-Abschluss progressiv eingepflegt.
//
// Stand 14.06.2026 — alle Gruppenspiele (MD1-MD3) verifiziert gegen
// Sky Sports, Yahoo Sports, ESPN, FIFA, NBC Sports und kicker.
// Anstoss-Zeiten sind in UTC; Anzeige rechnet pro Zeile auf Europe/Berlin
// (CEST = UTC+2) um.

export type WmFixtureConfidence =
  | 'official'    // Termin + Stadion + Teams alle von FIFA bestaetigt
  | 'auslosung'   // Paarung aus offizieller Gruppen-Auslosung, Detail kann variieren
  | 'placeholder' // best-guess aus aelteren Quellen, NICHT verifiziert
  | 'tbd';        // Sieger/Verlierer-Slot, Team nicht feststellbar

// Zentrale Phasen-Liste — als Tuple exportiert, damit andere Module
// (z.B. wm-backtest-runner, wm-live-schedule) keine eigenen Listen
// inline hardcoden muessen.
export const WM_PHASES = [
  'Gruppe',
  'Achtelfinale',
  'Viertelfinale',
  'Halbfinale',
  'Spiel um Platz 3',
  'Finale'
] as const;
export type WmPhase = (typeof WM_PHASES)[number];

export const WM_GROUP_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'] as const;
export type WmGroupLetter = (typeof WM_GROUP_LETTERS)[number];

export function parseWmPhase(s: string | null | undefined): WmPhase | null {
  if (!s) return null;
  const phases: readonly string[] = WM_PHASES;
  return phases.includes(s) ? (s as WmPhase) : null;
}

export function parseWmGroup(s: string | null | undefined): WmGroupLetter | null {
  if (!s) return null;
  const letters: readonly string[] = WM_GROUP_LETTERS;
  return letters.includes(s.toUpperCase()) ? (s.toUpperCase() as WmGroupLetter) : null;
}

export interface WmFixture {
  id: string;
  date: string; // YYYY-MM-DD (UTC nominal — wir behandeln als Berlin-Datum für die Anzeige)
  time: string | null; // HH:MM
  homeTeam: string;
  awayTeam: string;
  venue: string;
  phase: WmPhase;
  group?: WmGroupLetter;
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

export const WM_2026_FIXTURES: WmFixture[] = [
  // ============================================================
  // GRUPPE A — Mexiko, Südafrika, Südkorea, Tschechien
  // Quelle: Yahoo Sports, Sky, NBC, FIFA Group A in Focus
  // ============================================================
  {
    id: 'wm-1', date: '2026-06-11', time: '21:00',
    homeTeam: 'Mexiko', awayTeam: 'Südafrika',
    venue: 'Estadio Azteca, Mexico City', phase: 'Gruppe', group: 'A',
    sourceConfidence: 'official'
  },
  // MD1: Südkorea-Tschechien 10pm ET 11.06 = 02:00 UTC 12.06
  {
    id: 'wm-1b', date: '2026-06-12', time: '02:00',
    homeTeam: 'Südkorea', awayTeam: 'Tschechien',
    venue: 'Estadio Akron, Guadalajara', phase: 'Gruppe', group: 'A',
    sourceConfidence: 'official'
  },
  // MD2: Tschechien-Südafrika 12pm ET 18.06 = 16:00 UTC, Atlanta
  {
    id: 'wm-a-md2-1', date: '2026-06-18', time: '16:00',
    homeTeam: 'Tschechien', awayTeam: 'Südafrika',
    venue: 'Mercedes-Benz Stadium, Atlanta', phase: 'Gruppe', group: 'A',
    sourceConfidence: 'official'
  },
  // MD2: Mexiko-Südkorea 9pm local Mexico / 11pm ET 18.06 = 03:00 UTC 19.06,
  // Guadalajara (Estadio Akron). Quelle: ESPN Group-A-in-Focus.
  {
    id: 'wm-a-md2-2', date: '2026-06-19', time: '03:00',
    homeTeam: 'Mexiko', awayTeam: 'Südkorea',
    venue: 'Estadio Akron, Guadalajara', phase: 'Gruppe', group: 'A',
    sourceConfidence: 'official'
  },
  // MD3: Tschechien-Mexiko 9pm ET 24.06 = 01:00 UTC 25.06, Mexico City.
  // Quelle: ESPN, Sky Sports Group A Guide.
  {
    id: 'wm-a-md3', date: '2026-06-25', time: '01:00',
    homeTeam: 'Tschechien', awayTeam: 'Mexiko',
    venue: 'Estadio Azteca, Mexico City', phase: 'Gruppe', group: 'A',
    sourceConfidence: 'official'
  },
  // MD3: Südafrika-Südkorea 9pm ET 24.06 = 01:00 UTC 25.06, Estadio
  // BBVA Monterrey/Guadalupe. Quelle: ESPN, Sky.
  {
    id: 'wm-a-md3-2', date: '2026-06-25', time: '01:00',
    homeTeam: 'Südafrika', awayTeam: 'Südkorea',
    venue: 'Estadio BBVA, Monterrey', phase: 'Gruppe', group: 'A',
    sourceConfidence: 'official'
  },

  // ============================================================
  // GRUPPE B — Kanada, Bosnien-Herzegowina, Katar, Schweiz
  // Quelle: Sky, FIFA, theglobeandmail
  // ============================================================
  // MD1: Kanada-BIH 3pm ET 12.06 = 19:00 UTC, BMO Toronto
  {
    id: 'wm-2', date: '2026-06-12', time: '19:00',
    homeTeam: 'Kanada', awayTeam: 'Bosnien-Herzegowina',
    venue: 'BMO Field, Toronto', phase: 'Gruppe', group: 'B',
    sourceConfidence: 'official'
  },
  // MD1: Katar-Schweiz 12pm PT 13.06 = 19:00 UTC, Levi's Santa Clara
  {
    id: 'wm-b-md1-3', date: '2026-06-13', time: '19:00',
    homeTeam: 'Katar', awayTeam: 'Schweiz',
    venue: "Levi's Stadium, Santa Clara", phase: 'Gruppe', group: 'B',
    sourceConfidence: 'official'
  },
  // MD2: Schweiz-BIH 3pm ET 18.06 = 19:00 UTC, SoFi LA
  {
    id: 'wm-b-md2-2', date: '2026-06-18', time: '19:00',
    homeTeam: 'Schweiz', awayTeam: 'Bosnien-Herzegowina',
    venue: 'SoFi Stadium, Los Angeles', phase: 'Gruppe', group: 'B',
    sourceConfidence: 'official'
  },
  // MD2: Kanada-Katar 6pm ET 18.06 = 22:00 UTC, BC Place Vancouver
  {
    id: 'wm-b-md2', date: '2026-06-18', time: '22:00',
    homeTeam: 'Kanada', awayTeam: 'Katar',
    venue: 'BC Place, Vancouver', phase: 'Gruppe', group: 'B',
    sourceConfidence: 'official'
  },
  // MD3: Kanada-Schweiz 3pm ET 24.06 = 19:00 UTC, BC Place Vancouver.
  // Quelle: Sky Sports Group B Guide, theglobeandmail.
  {
    id: 'wm-b-md3', date: '2026-06-24', time: '19:00',
    homeTeam: 'Kanada', awayTeam: 'Schweiz',
    venue: 'BC Place, Vancouver', phase: 'Gruppe', group: 'B',
    sourceConfidence: 'official'
  },
  // MD3: BIH-Katar 3pm ET 24.06 = 19:00 UTC, Lumen Seattle.
  // Quelle: Sky Sports Group B Guide, ESPN, FIFA.
  {
    id: 'wm-b-md3-2', date: '2026-06-24', time: '19:00',
    homeTeam: 'Bosnien-Herzegowina', awayTeam: 'Katar',
    venue: 'Lumen Field, Seattle', phase: 'Gruppe', group: 'B',
    sourceConfidence: 'official'
  },

  // ============================================================
  // GRUPPE C — Brasilien, Marokko, Schottland, Haiti
  // Quelle: ZDF, kicker, ESPN, Sky, FIFA Group C in Focus
  // ============================================================
  // MD1: Brasilien-Marokko 6pm ET 13.06 = 22:00 UTC, MetLife
  {
    id: 'wm-c-md1-1', date: '2026-06-13', time: '22:00',
    homeTeam: 'Brasilien', awayTeam: 'Marokko',
    venue: 'MetLife Stadium, New York/New Jersey', phase: 'Gruppe', group: 'C',
    sourceConfidence: 'official'
  },
  // MD1: Haiti-Schottland 9pm ET 13.06 = 01:00 UTC 14.06, Gillette
  {
    id: 'wm-c-md1-2', date: '2026-06-14', time: '01:00',
    homeTeam: 'Haiti', awayTeam: 'Schottland',
    venue: 'Gillette Stadium, Boston', phase: 'Gruppe', group: 'C',
    sourceConfidence: 'official'
  },
  // MD2: Schottland-Marokko 6pm ET 19.06 = 22:00 UTC, Gillette Foxborough
  {
    id: 'wm-c-md2-1', date: '2026-06-19', time: '22:00',
    homeTeam: 'Schottland', awayTeam: 'Marokko',
    venue: 'Gillette Stadium, Boston', phase: 'Gruppe', group: 'C',
    sourceConfidence: 'official'
  },
  // MD2: Brasilien-Haiti 9pm ET 19.06 = 01:00 UTC 20.06, Lincoln Phila
  {
    id: 'wm-7', date: '2026-06-20', time: '01:00',
    homeTeam: 'Brasilien', awayTeam: 'Haiti',
    venue: 'Lincoln Financial Field, Philadelphia', phase: 'Gruppe', group: 'C',
    sourceConfidence: 'official'
  },
  // MD3: Schottland-Brasilien 24.06 — Stadion Hard Rock Miami;
  // Anstosszeit nicht 100% verifiziert, vermutet 8pm ET = 00:00 UTC 25.06.
  {
    id: 'wm-c-md3-1', date: '2026-06-25', time: '00:00',
    homeTeam: 'Schottland', awayTeam: 'Brasilien',
    venue: 'Hard Rock Stadium, Miami', phase: 'Gruppe', group: 'C',
    sourceConfidence: 'auslosung'
  },
  // MD3: Marokko-Haiti 24.06 — Mercedes Atlanta; Anstoss parallel.
  {
    id: 'wm-c-md3-2', date: '2026-06-25', time: '00:00',
    homeTeam: 'Marokko', awayTeam: 'Haiti',
    venue: 'Mercedes-Benz Stadium, Atlanta', phase: 'Gruppe', group: 'C',
    sourceConfidence: 'auslosung'
  },

  // ============================================================
  // GRUPPE D — USA, Paraguay, Australien, Türkei
  // Quelle: ESPN Group D in Focus, Sky Sports Group D Guide, FIFA.
  // ============================================================
  // MD1: USA-Paraguay 6pm PT 12.06 = 01:00 UTC 13.06, SoFi LA.
  // Quelle: ESPN, Sky.
  {
    id: 'wm-3', date: '2026-06-13', time: '01:00',
    homeTeam: 'USA', awayTeam: 'Paraguay',
    venue: 'SoFi Stadium, Los Angeles', phase: 'Gruppe', group: 'D',
    sourceConfidence: 'official'
  },
  // MD1: Australien-Türkei 9pm local PT 12.06 / 12am ET 13.06 = 04:00 UTC
  // 13.06, BC Place. Quelle: ESPN, Sky.
  {
    id: 'wm-d-md1-2', date: '2026-06-13', time: '04:00',
    homeTeam: 'Australien', awayTeam: 'Türkei',
    venue: 'BC Place, Vancouver', phase: 'Gruppe', group: 'D',
    sourceConfidence: 'official'
  },
  // MD2: USA-Australien 12pm local PT 19.06 = 3pm ET = 19:00 UTC,
  // Lumen Field Seattle. Quelle: ESPN, Sky Sports Group D Guide
  // (revidiert von Welle 32701 — vorher faelschlich AT&T Dallas
  // 20.06 01:00 UTC).
  {
    id: 'wm-d-md2-1', date: '2026-06-19', time: '19:00',
    homeTeam: 'USA', awayTeam: 'Australien',
    venue: 'Lumen Field, Seattle', phase: 'Gruppe', group: 'D',
    sourceConfidence: 'official'
  },
  // MD2: Türkei-Paraguay 9pm local PT 19.06 = 12am ET 20.06 = 04:00 UTC
  // 20.06, Levi's Stadium Santa Clara. Quelle: ESPN, Sky (revidiert —
  // war vorher faelschlich auf 19.06 04:00 UTC datiert, ein Tag zu
  // frueh, weil Tier-2-Quelle "06:00 MESZ 19.06" nicht auf den lokalen
  // Spieltag bezog).
  {
    id: 'wm-d-md2-2', date: '2026-06-20', time: '04:00',
    homeTeam: 'Türkei', awayTeam: 'Paraguay',
    venue: "Levi's Stadium, Santa Clara", phase: 'Gruppe', group: 'D',
    sourceConfidence: 'official'
  },
  // MD3: Türkei-USA 7pm local PT 25.06 = 10pm ET = 02:00 UTC 26.06,
  // SoFi Stadium LA. Quelle: ESPN, Sky.
  {
    id: 'wm-d-md3-1', date: '2026-06-26', time: '02:00',
    homeTeam: 'Türkei', awayTeam: 'USA',
    venue: 'SoFi Stadium, Los Angeles', phase: 'Gruppe', group: 'D',
    sourceConfidence: 'official'
  },
  // MD3: Paraguay-Australien 7pm local PT 25.06 = 10pm ET = 02:00 UTC
  // 26.06, Levi's Stadium Santa Clara (parallel). Quelle: ESPN, Sky.
  {
    id: 'wm-d-md3-2', date: '2026-06-26', time: '02:00',
    homeTeam: 'Paraguay', awayTeam: 'Australien',
    venue: "Levi's Stadium, Santa Clara", phase: 'Gruppe', group: 'D',
    sourceConfidence: 'official'
  },

  // ============================================================
  // GRUPPE E — Deutschland, Curaçao, Elfenbeinküste, Ecuador
  // Quelle: FOX Sports, wettfreunde, Sky
  // ============================================================
  // MD1: Deutschland-Curaçao 1pm ET 14.06 = 17:00 UTC, NRG Houston
  {
    id: 'wm-4', date: '2026-06-14', time: '17:00',
    homeTeam: 'Deutschland', awayTeam: 'Curaçao',
    venue: 'NRG Stadium, Houston', phase: 'Gruppe', group: 'E',
    sourceConfidence: 'official'
  },
  // MD1: Elfenbein-Ecuador 7pm ET 14.06 = 23:00 UTC, Lincoln Phila
  {
    id: 'wm-e-md1-2', date: '2026-06-14', time: '23:00',
    homeTeam: 'Elfenbeinküste', awayTeam: 'Ecuador',
    venue: 'Lincoln Financial Field, Philadelphia', phase: 'Gruppe', group: 'E',
    sourceConfidence: 'official'
  },
  // MD2: Deutschland-Elfenbein 4pm ET 20.06 = 20:00 UTC, BMO Toronto
  {
    id: 'wm-e-md2', date: '2026-06-20', time: '20:00',
    homeTeam: 'Deutschland', awayTeam: 'Elfenbeinküste',
    venue: 'BMO Field, Toronto', phase: 'Gruppe', group: 'E',
    sourceConfidence: 'official'
  },
  // MD2: Ecuador-Curaçao 8pm ET 20.06 = 00:00 UTC 21.06, Arrowhead KC
  {
    id: 'wm-e-md2-2', date: '2026-06-21', time: '00:00',
    homeTeam: 'Ecuador', awayTeam: 'Curaçao',
    venue: 'GEHA Field at Arrowhead, Kansas City', phase: 'Gruppe', group: 'E',
    sourceConfidence: 'official'
  },
  // MD3: Curaçao-Elfenbein 4pm ET 25.06 = 20:00 UTC, Lincoln Phila.
  // Quelle: ESPN, Sky Group E Guide.
  {
    id: 'wm-e-md3-2', date: '2026-06-25', time: '20:00',
    homeTeam: 'Curaçao', awayTeam: 'Elfenbeinküste',
    venue: 'Lincoln Financial Field, Philadelphia', phase: 'Gruppe', group: 'E',
    sourceConfidence: 'official'
  },
  // MD3: Ecuador-Deutschland 4pm ET 25.06 = 20:00 UTC, MetLife.
  // Quelle: ESPN, Sky, FIFA.
  {
    id: 'wm-e-md3', date: '2026-06-25', time: '20:00',
    homeTeam: 'Deutschland', awayTeam: 'Ecuador',
    venue: 'MetLife Stadium, New York/New Jersey', phase: 'Gruppe', group: 'E',
    sourceConfidence: 'official'
  },

  // ============================================================
  // GRUPPE F — Niederlande, Japan, Schweden, Tunesien
  // Quelle: Sky, Mappr, NBC, FIFA
  // ============================================================
  // MD1: Niederlande-Japan 4pm ET 14.06 = 20:00 UTC, AT&T Dallas
  {
    id: 'wm-f-md1-1', date: '2026-06-14', time: '20:00',
    homeTeam: 'Niederlande', awayTeam: 'Japan',
    venue: 'AT&T Stadium, Dallas', phase: 'Gruppe', group: 'F',
    sourceConfidence: 'official'
  },
  // MD1: Schweden-Tunesien 10pm ET 14.06 = 02:00 UTC 15.06, Monterrey
  {
    id: 'wm-f-md1-2', date: '2026-06-15', time: '02:00',
    homeTeam: 'Schweden', awayTeam: 'Tunesien',
    venue: 'Estadio BBVA, Monterrey', phase: 'Gruppe', group: 'F',
    sourceConfidence: 'official'
  },
  // MD2: NL-Schweden 1pm ET 20.06 = 17:00 UTC, NRG Houston
  {
    id: 'wm-f-md2-1', date: '2026-06-20', time: '17:00',
    homeTeam: 'Niederlande', awayTeam: 'Schweden',
    venue: 'NRG Stadium, Houston', phase: 'Gruppe', group: 'F',
    sourceConfidence: 'official'
  },
  // MD2: Tunesien-Japan 12am ET 21.06 = 04:00 UTC 21.06, Monterrey
  {
    id: 'wm-f-md2-2', date: '2026-06-21', time: '04:00',
    homeTeam: 'Tunesien', awayTeam: 'Japan',
    venue: 'Estadio BBVA, Monterrey', phase: 'Gruppe', group: 'F',
    sourceConfidence: 'official'
  },
  // MD3: Japan-Schweden 7pm ET 25.06 = 23:00 UTC, AT&T Dallas.
  // Quelle: Sky Sports Group F Guide, ESPN.
  {
    id: 'wm-f-md3-1', date: '2026-06-25', time: '23:00',
    homeTeam: 'Japan', awayTeam: 'Schweden',
    venue: 'AT&T Stadium, Dallas', phase: 'Gruppe', group: 'F',
    sourceConfidence: 'official'
  },
  // MD3: Tunesien-NL 7pm ET 25.06 = 23:00 UTC, Arrowhead Kansas City.
  // Quelle: Sky Sports Group F Guide, ESPN.
  {
    id: 'wm-f-md3-2', date: '2026-06-25', time: '23:00',
    homeTeam: 'Tunesien', awayTeam: 'Niederlande',
    venue: 'GEHA Field at Arrowhead, Kansas City', phase: 'Gruppe', group: 'F',
    sourceConfidence: 'official'
  },

  // ============================================================
  // GRUPPE G — Belgien, Ägypten, Iran, Neuseeland
  // Quelle: Sky, FIFA Group G in Focus, MLSSoccer
  // ============================================================
  // MD1: Belgien-Ägypten 3pm local PT Seattle / 6pm ET 15.06 = 22:00 UTC,
  // Lumen Field Seattle. Quelle: ESPN Group G in Focus (revidiert von
  // Welle 32701 — Tier-2-Yahoo hatte 3pm "ET" angegeben, korrekt
  // sind 3pm local Pacific).
  {
    id: 'wm-g-md1-1', date: '2026-06-15', time: '22:00',
    homeTeam: 'Belgien', awayTeam: 'Ägypten',
    venue: 'Lumen Field, Seattle', phase: 'Gruppe', group: 'G',
    sourceConfidence: 'official'
  },
  // MD1: Iran-NZ 9pm ET 15.06 = 01:00 UTC 16.06, SoFi LA
  {
    id: 'wm-g-md1-2', date: '2026-06-16', time: '01:00',
    homeTeam: 'Iran', awayTeam: 'Neuseeland',
    venue: 'SoFi Stadium, Los Angeles', phase: 'Gruppe', group: 'G',
    sourceConfidence: 'official'
  },
  // MD2: Belgien-Iran 3pm ET 21.06 = 19:00 UTC, SoFi LA
  {
    id: 'wm-g-md2-1', date: '2026-06-21', time: '19:00',
    homeTeam: 'Belgien', awayTeam: 'Iran',
    venue: 'SoFi Stadium, Los Angeles', phase: 'Gruppe', group: 'G',
    sourceConfidence: 'official'
  },
  // MD2: NZ-Ägypten 9pm ET 21.06 = 01:00 UTC 22.06, BC Place Vancouver
  {
    id: 'wm-g-md2-2', date: '2026-06-22', time: '01:00',
    homeTeam: 'Neuseeland', awayTeam: 'Ägypten',
    venue: 'BC Place, Vancouver', phase: 'Gruppe', group: 'G',
    sourceConfidence: 'official'
  },
  // MD3: Ägypten-Iran 11pm ET 26.06 = 03:00 UTC 27.06, Lumen Seattle.
  // Quelle: ESPN Group G in Focus, Sky.
  {
    id: 'wm-g-md3-1', date: '2026-06-27', time: '03:00',
    homeTeam: 'Ägypten', awayTeam: 'Iran',
    venue: 'Lumen Field, Seattle', phase: 'Gruppe', group: 'G',
    sourceConfidence: 'official'
  },
  // MD3: NZ-Belgien 11pm ET 26.06 = 03:00 UTC 27.06, BC Place Vancouver.
  // Quelle: ESPN Group G in Focus, Sky.
  {
    id: 'wm-g-md3-2', date: '2026-06-27', time: '03:00',
    homeTeam: 'Neuseeland', awayTeam: 'Belgien',
    venue: 'BC Place, Vancouver', phase: 'Gruppe', group: 'G',
    sourceConfidence: 'official'
  },

  // ============================================================
  // GRUPPE H — Spanien, Kap Verde, Saudi-Arabien, Uruguay
  // Quelle: Yahoo, Sky, FIFA Group H in Focus
  // ============================================================
  // MD1: Spanien-Kap Verde 1pm ET 15.06 = 17:00 UTC, Mercedes Atlanta.
  // Quelle: ESPN Group H, Sky Sports (revidiert von Welle 32701 —
  // Tier-2-Yahoo hatte 12pm ET, Tier-1 ESPN/Sky bestaetigen 1pm ET).
  {
    id: 'wm-8', date: '2026-06-15', time: '17:00',
    homeTeam: 'Spanien', awayTeam: 'Kap Verde',
    venue: 'Mercedes-Benz Stadium, Atlanta', phase: 'Gruppe', group: 'H',
    sourceConfidence: 'official'
  },
  // MD1: Saudi-Uruguay 6pm ET 15.06 = 22:00 UTC, Hard Rock Miami
  {
    id: 'wm-h-md1-2', date: '2026-06-15', time: '22:00',
    homeTeam: 'Saudi-Arabien', awayTeam: 'Uruguay',
    venue: 'Hard Rock Stadium, Miami', phase: 'Gruppe', group: 'H',
    sourceConfidence: 'official'
  },
  // MD2: Spanien-Saudi 12pm ET 21.06 = 16:00 UTC, Mercedes Atlanta
  {
    id: 'wm-h-md2-1', date: '2026-06-21', time: '16:00',
    homeTeam: 'Spanien', awayTeam: 'Saudi-Arabien',
    venue: 'Mercedes-Benz Stadium, Atlanta', phase: 'Gruppe', group: 'H',
    sourceConfidence: 'official'
  },
  // MD2: Uruguay-Kap Verde 6pm ET 21.06 = 22:00 UTC, Hard Rock Miami
  {
    id: 'wm-h-md2-2', date: '2026-06-21', time: '22:00',
    homeTeam: 'Uruguay', awayTeam: 'Kap Verde',
    venue: 'Hard Rock Stadium, Miami', phase: 'Gruppe', group: 'H',
    sourceConfidence: 'official'
  },
  // MD3: Kap Verde-Saudi 8pm ET 26.06 = 00:00 UTC 27.06, NRG Houston
  {
    id: 'wm-h-md3-1', date: '2026-06-27', time: '00:00',
    homeTeam: 'Kap Verde', awayTeam: 'Saudi-Arabien',
    venue: 'NRG Stadium, Houston', phase: 'Gruppe', group: 'H',
    sourceConfidence: 'official'
  },
  // MD3: Uruguay-Spanien 8pm ET 26.06 = 00:00 UTC 27.06, Estadio Akron Guadalajara
  {
    id: 'wm-h-md3-2', date: '2026-06-27', time: '00:00',
    homeTeam: 'Uruguay', awayTeam: 'Spanien',
    venue: 'Estadio Akron, Guadalajara', phase: 'Gruppe', group: 'H',
    sourceConfidence: 'official'
  },

  // ============================================================
  // GRUPPE I — Frankreich, Senegal, Norwegen, Irak
  // Quelle: Sky, Yahoo, Mappr
  // ============================================================
  // MD1: Frankreich-Senegal 3pm ET 16.06 = 19:00 UTC, MetLife
  {
    id: 'wm-i-md1-1', date: '2026-06-16', time: '19:00',
    homeTeam: 'Frankreich', awayTeam: 'Senegal',
    venue: 'MetLife Stadium, New York/New Jersey', phase: 'Gruppe', group: 'I',
    sourceConfidence: 'official'
  },
  // MD1: Irak-Norwegen 6pm ET 16.06 = 22:00 UTC, Gillette Boston
  {
    id: 'wm-i-md1-2', date: '2026-06-16', time: '22:00',
    homeTeam: 'Irak', awayTeam: 'Norwegen',
    venue: 'Gillette Stadium, Boston', phase: 'Gruppe', group: 'I',
    sourceConfidence: 'official'
  },
  // MD2: Frankreich-Irak 5pm ET 22.06 = 21:00 UTC, Lincoln Phila
  {
    id: 'wm-i-md2-1', date: '2026-06-22', time: '21:00',
    homeTeam: 'Frankreich', awayTeam: 'Irak',
    venue: 'Lincoln Financial Field, Philadelphia', phase: 'Gruppe', group: 'I',
    sourceConfidence: 'official'
  },
  // MD2: Norwegen-Senegal 8pm ET 22.06 = 00:00 UTC 23.06, MetLife
  {
    id: 'wm-i-md2-2', date: '2026-06-23', time: '00:00',
    homeTeam: 'Norwegen', awayTeam: 'Senegal',
    venue: 'MetLife Stadium, New York/New Jersey', phase: 'Gruppe', group: 'I',
    sourceConfidence: 'official'
  },
  // MD3: Norwegen-Frankreich 3pm ET 26.06 = 19:00 UTC, Gillette Boston.
  // Quelle: Sky Group I Guide, ESPN.
  {
    id: 'wm-6', date: '2026-06-26', time: '19:00',
    homeTeam: 'Norwegen', awayTeam: 'Frankreich',
    venue: 'Gillette Stadium, Boston', phase: 'Gruppe', group: 'I',
    sourceConfidence: 'official'
  },
  // MD3: Senegal-Irak 3pm ET 26.06 = 19:00 UTC, BMO Toronto.
  // Quelle: Sky Group I Guide, ESPN.
  {
    id: 'wm-i-md3', date: '2026-06-26', time: '19:00',
    homeTeam: 'Senegal', awayTeam: 'Irak',
    venue: 'BMO Field, Toronto', phase: 'Gruppe', group: 'I',
    sourceConfidence: 'official'
  },

  // ============================================================
  // GRUPPE J — Argentinien, Algerien, Österreich, Jordanien
  // Quelle: Outlook, Sky, Mappr, gulfnews
  // ============================================================
  // MD1: Argentinien-Algerien 9pm ET 16.06 = 01:00 UTC 17.06, Arrowhead KC
  {
    id: 'wm-j-md1-1', date: '2026-06-17', time: '01:00',
    homeTeam: 'Argentinien', awayTeam: 'Algerien',
    venue: 'GEHA Field at Arrowhead, Kansas City', phase: 'Gruppe', group: 'J',
    sourceConfidence: 'official'
  },
  // MD1: Österreich-Jordanien 12am ET 17.06 = 04:00 UTC 17.06, Levi's SF Bay
  {
    id: 'wm-j-md1-2', date: '2026-06-17', time: '04:00',
    homeTeam: 'Österreich', awayTeam: 'Jordanien',
    venue: "Levi's Stadium, Santa Clara", phase: 'Gruppe', group: 'J',
    sourceConfidence: 'official'
  },
  // MD2: Argentinien-Österreich 1pm ET 22.06 = 17:00 UTC, AT&T Dallas
  {
    id: 'wm-j-md2-1', date: '2026-06-22', time: '17:00',
    homeTeam: 'Argentinien', awayTeam: 'Österreich',
    venue: 'AT&T Stadium, Dallas', phase: 'Gruppe', group: 'J',
    sourceConfidence: 'official'
  },
  // MD2: Jordanien-Algerien 11pm ET 22.06 = 03:00 UTC 23.06, Levi's SF Bay
  {
    id: 'wm-j-md2-2', date: '2026-06-23', time: '03:00',
    homeTeam: 'Jordanien', awayTeam: 'Algerien',
    venue: "Levi's Stadium, Santa Clara", phase: 'Gruppe', group: 'J',
    sourceConfidence: 'official'
  },
  // MD3: Jordanien-Argentinien 10pm ET 27.06 = 02:00 UTC 28.06, AT&T Dallas.
  // Quelle: ESPN, Sky Group J Guide.
  {
    id: 'wm-j-md3-1', date: '2026-06-28', time: '02:00',
    homeTeam: 'Jordanien', awayTeam: 'Argentinien',
    venue: 'AT&T Stadium, Dallas', phase: 'Gruppe', group: 'J',
    sourceConfidence: 'official'
  },
  // MD3: Algerien-Österreich 10pm ET 27.06 = 02:00 UTC 28.06, Arrowhead KC.
  // Quelle: ESPN, Sky Group J Guide.
  {
    id: 'wm-j-md3-2', date: '2026-06-28', time: '02:00',
    homeTeam: 'Algerien', awayTeam: 'Österreich',
    venue: 'GEHA Field at Arrowhead, Kansas City', phase: 'Gruppe', group: 'J',
    sourceConfidence: 'official'
  },

  // ============================================================
  // GRUPPE K — Portugal, Usbekistan, Kolumbien, DR Kongo
  // Quelle: FOX, Sky, FIFA Group K in Focus, MLSSoccer
  // ============================================================
  // MD1: Portugal-DR Kongo 1pm ET 17.06 = 17:00 UTC, NRG Houston
  {
    id: 'wm-k-md1', date: '2026-06-17', time: '17:00',
    homeTeam: 'Portugal', awayTeam: 'DR Kongo',
    venue: 'NRG Stadium, Houston', phase: 'Gruppe', group: 'K',
    sourceConfidence: 'official'
  },
  // MD1: Usbekistan-Kolumbien 10pm ET 17.06 = 02:00 UTC 18.06, Mexico City
  {
    id: 'wm-k-md1-2', date: '2026-06-18', time: '02:00',
    homeTeam: 'Usbekistan', awayTeam: 'Kolumbien',
    venue: 'Estadio Azteca, Mexico City', phase: 'Gruppe', group: 'K',
    sourceConfidence: 'official'
  },
  // MD2: Portugal-Usbekistan 1pm ET 23.06 = 17:00 UTC, NRG Houston
  {
    id: 'wm-k-md2-1', date: '2026-06-23', time: '17:00',
    homeTeam: 'Portugal', awayTeam: 'Usbekistan',
    venue: 'NRG Stadium, Houston', phase: 'Gruppe', group: 'K',
    sourceConfidence: 'official'
  },
  // MD2: Kolumbien-DR Kongo 10pm ET 23.06 = 02:00 UTC 24.06, Guadalajara
  {
    id: 'wm-k-md2-2', date: '2026-06-24', time: '02:00',
    homeTeam: 'Kolumbien', awayTeam: 'DR Kongo',
    venue: 'Estadio Akron, Guadalajara', phase: 'Gruppe', group: 'K',
    sourceConfidence: 'official'
  },
  // MD3: Kolumbien-Portugal 7:30pm ET 27.06 = 23:30 UTC, Hard Rock Miami
  {
    id: 'wm-k-md3-1', date: '2026-06-27', time: '23:30',
    homeTeam: 'Kolumbien', awayTeam: 'Portugal',
    venue: 'Hard Rock Stadium, Miami', phase: 'Gruppe', group: 'K',
    sourceConfidence: 'official'
  },
  // MD3: DR Kongo-Usbekistan 7:30pm ET 27.06 = 23:30 UTC, Mercedes Atlanta
  {
    id: 'wm-k-md3-2', date: '2026-06-27', time: '23:30',
    homeTeam: 'DR Kongo', awayTeam: 'Usbekistan',
    venue: 'Mercedes-Benz Stadium, Atlanta', phase: 'Gruppe', group: 'K',
    sourceConfidence: 'official'
  },

  // ============================================================
  // GRUPPE L — England, Kroatien, Ghana, Panama
  // Quelle: ESPN, Sky, FIFA Group L in Focus, Wikipedia
  // ============================================================
  // MD1: England-Kroatien 4pm ET 17.06 = 20:00 UTC, AT&T Dallas
  {
    id: 'wm-l-md1-1', date: '2026-06-17', time: '20:00',
    homeTeam: 'England', awayTeam: 'Kroatien',
    venue: 'AT&T Stadium, Dallas', phase: 'Gruppe', group: 'L',
    sourceConfidence: 'official'
  },
  // MD1: Ghana-Panama 7pm ET 17.06 = 23:00 UTC, BMO Toronto
  {
    id: 'wm-l-md1-2', date: '2026-06-17', time: '23:00',
    homeTeam: 'Ghana', awayTeam: 'Panama',
    venue: 'BMO Field, Toronto', phase: 'Gruppe', group: 'L',
    sourceConfidence: 'official'
  },
  // MD2: England-Ghana 4pm ET 23.06 = 20:00 UTC, Gillette Boston
  {
    id: 'wm-l-md2-1', date: '2026-06-23', time: '20:00',
    homeTeam: 'England', awayTeam: 'Ghana',
    venue: 'Gillette Stadium, Boston', phase: 'Gruppe', group: 'L',
    sourceConfidence: 'official'
  },
  // MD2: Panama-Kroatien 7pm ET 23.06 = 23:00 UTC, BMO Toronto
  {
    id: 'wm-l-md2-2', date: '2026-06-23', time: '23:00',
    homeTeam: 'Panama', awayTeam: 'Kroatien',
    venue: 'BMO Field, Toronto', phase: 'Gruppe', group: 'L',
    sourceConfidence: 'official'
  },
  // MD3: Panama-England 5pm ET 27.06 = 21:00 UTC, MetLife.
  // Quelle: ESPN, Sky Group L Guide, FIFA.
  {
    id: 'wm-l-md3-1', date: '2026-06-27', time: '21:00',
    homeTeam: 'Panama', awayTeam: 'England',
    venue: 'MetLife Stadium, New York/New Jersey', phase: 'Gruppe', group: 'L',
    sourceConfidence: 'official'
  },
  // MD3: Kroatien-Ghana 5pm ET 27.06 = 21:00 UTC, Lincoln Phila.
  // Quelle: ESPN, Sky Group L Guide, FIFA.
  {
    id: 'wm-l-md3-2', date: '2026-06-27', time: '21:00',
    homeTeam: 'Kroatien', awayTeam: 'Ghana',
    venue: 'Lincoln Financial Field, Philadelphia', phase: 'Gruppe', group: 'L',
    sourceConfidence: 'official'
  },

  // ============================================================
  // K.O.-PHASE (Termine offiziell laut FIFA — Teams TBD bis nach
  // Gruppenphase)
  // ============================================================
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
    venue: "Levi's Stadium, Santa Clara", phase: 'Achtelfinale'
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
    venue: 'MetLife Stadium, New York/New Jersey', phase: 'Halbfinale'
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
    venue: 'MetLife Stadium, New York/New Jersey', phase: 'Finale'
  }
];

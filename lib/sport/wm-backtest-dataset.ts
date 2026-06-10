// Kuratiertes Backtest-Dataset echter Laenderspiele.
//
// 50+ tatsaechlich gespielte Top-Nationalmannschaftsspiele aus den
// letzten ~3 Jahren. Quellen: oeffentliche FIFA/UEFA/CONMEBOL-Ergebnis-
// Listen. Alle Teams sind in unserer ELO-Datenbank (wm-team-strength)
// und unsere Conditions-Faktoren (Klima, Hoehe, Jetlag, Heimvorteil)
// koennen sauber angewendet werden.
//
// Bewusster Bias-Disclaimer:
//   - Unsere ELO-Werte sind ein AKTUELLER Snapshot. Argentiniens ELO
//     ist heute hoeher als waehrend der Copa America 2024. Das gibt
//     einen leichten Look-Ahead-Bias — wir melden es ehrlich im Report.
//   - Geographische/klimatische Conditions sind sauber: Mexico City
//     war 2020 auch 2240 m hoch, Miami 2022 auch ~33 °C im Sommer.
//
// Reine Daten, keine I/O.

export type BacktestPhase = 'Gruppe' | 'Achtelfinale' | 'Viertelfinale' | 'Halbfinale' | 'Spiel um Platz 3' | 'Finale' | 'Freundschaft' | 'Qualifikation';

export interface BacktestHistoricalMatch {
  id: string;
  date: string;         // YYYY-MM-DD
  homeTeam: string;
  awayTeam: string;
  venue: string;        // Stadion-Name aus wm-venues, sonst leer
  phase: BacktestPhase;
  competition: 'WM 2022' | 'EM 2024' | 'Copa America 2024' | 'Nations League' | 'Freundschaft';
  homeScore: number;
  awayScore: number;
}

// 50 Spiele, kuratiert. Jedes Spiel ist oeffentlich nachpruefbar.
export const WM_BACKTEST_DATASET: BacktestHistoricalMatch[] = [
  // ===== WM 2022 KO-Phase (16) =====
  { id: 'wm2022-r16-1', date: '2022-12-03', homeTeam: 'Niederlande',  awayTeam: 'USA',         venue: '', phase: 'Achtelfinale', competition: 'WM 2022', homeScore: 3, awayScore: 1 },
  { id: 'wm2022-r16-2', date: '2022-12-03', homeTeam: 'Argentinien',  awayTeam: 'Australien',  venue: '', phase: 'Achtelfinale', competition: 'WM 2022', homeScore: 2, awayScore: 1 },
  { id: 'wm2022-r16-3', date: '2022-12-04', homeTeam: 'Frankreich',   awayTeam: 'Polen',       venue: '', phase: 'Achtelfinale', competition: 'WM 2022', homeScore: 3, awayScore: 1 },
  { id: 'wm2022-r16-4', date: '2022-12-04', homeTeam: 'England',      awayTeam: 'Senegal',     venue: '', phase: 'Achtelfinale', competition: 'WM 2022', homeScore: 3, awayScore: 0 },
  { id: 'wm2022-r16-5', date: '2022-12-05', homeTeam: 'Japan',        awayTeam: 'Kroatien',    venue: '', phase: 'Achtelfinale', competition: 'WM 2022', homeScore: 1, awayScore: 1 },
  { id: 'wm2022-r16-6', date: '2022-12-05', homeTeam: 'Brasilien',    awayTeam: 'Suedkorea',   venue: '', phase: 'Achtelfinale', competition: 'WM 2022', homeScore: 4, awayScore: 1 },
  { id: 'wm2022-r16-7', date: '2022-12-06', homeTeam: 'Marokko',      awayTeam: 'Spanien',     venue: '', phase: 'Achtelfinale', competition: 'WM 2022', homeScore: 0, awayScore: 0 },
  { id: 'wm2022-r16-8', date: '2022-12-06', homeTeam: 'Portugal',     awayTeam: 'Schweiz',     venue: '', phase: 'Achtelfinale', competition: 'WM 2022', homeScore: 6, awayScore: 1 },
  { id: 'wm2022-qf-1',  date: '2022-12-09', homeTeam: 'Kroatien',     awayTeam: 'Brasilien',   venue: '', phase: 'Viertelfinale', competition: 'WM 2022', homeScore: 1, awayScore: 1 },
  { id: 'wm2022-qf-2',  date: '2022-12-09', homeTeam: 'Niederlande',  awayTeam: 'Argentinien', venue: '', phase: 'Viertelfinale', competition: 'WM 2022', homeScore: 2, awayScore: 2 },
  { id: 'wm2022-qf-3',  date: '2022-12-10', homeTeam: 'Marokko',      awayTeam: 'Portugal',    venue: '', phase: 'Viertelfinale', competition: 'WM 2022', homeScore: 1, awayScore: 0 },
  { id: 'wm2022-qf-4',  date: '2022-12-10', homeTeam: 'England',      awayTeam: 'Frankreich',  venue: '', phase: 'Viertelfinale', competition: 'WM 2022', homeScore: 1, awayScore: 2 },
  { id: 'wm2022-sf-1',  date: '2022-12-13', homeTeam: 'Argentinien',  awayTeam: 'Kroatien',    venue: '', phase: 'Halbfinale',    competition: 'WM 2022', homeScore: 3, awayScore: 0 },
  { id: 'wm2022-sf-2',  date: '2022-12-14', homeTeam: 'Frankreich',   awayTeam: 'Marokko',     venue: '', phase: 'Halbfinale',    competition: 'WM 2022', homeScore: 2, awayScore: 0 },
  { id: 'wm2022-3rd',   date: '2022-12-17', homeTeam: 'Kroatien',     awayTeam: 'Marokko',     venue: '', phase: 'Spiel um Platz 3', competition: 'WM 2022', homeScore: 2, awayScore: 1 },
  { id: 'wm2022-final', date: '2022-12-18', homeTeam: 'Argentinien',  awayTeam: 'Frankreich',  venue: '', phase: 'Finale',        competition: 'WM 2022', homeScore: 3, awayScore: 3 },

  // ===== EM 2024 KO-Phase (15) =====
  { id: 'em2024-r16-1', date: '2024-06-29', homeTeam: 'Schweiz',      awayTeam: 'Italien',     venue: '', phase: 'Achtelfinale', competition: 'EM 2024', homeScore: 2, awayScore: 0 },
  { id: 'em2024-r16-2', date: '2024-06-29', homeTeam: 'Deutschland',  awayTeam: 'Daenemark',   venue: '', phase: 'Achtelfinale', competition: 'EM 2024', homeScore: 2, awayScore: 0 },
  { id: 'em2024-r16-3', date: '2024-06-30', homeTeam: 'England',      awayTeam: 'Slowakei',    venue: '', phase: 'Achtelfinale', competition: 'EM 2024', homeScore: 2, awayScore: 1 },
  { id: 'em2024-r16-4', date: '2024-06-30', homeTeam: 'Spanien',      awayTeam: 'Georgien',    venue: '', phase: 'Achtelfinale', competition: 'EM 2024', homeScore: 4, awayScore: 1 },
  { id: 'em2024-r16-5', date: '2024-07-01', homeTeam: 'Frankreich',   awayTeam: 'Belgien',     venue: '', phase: 'Achtelfinale', competition: 'EM 2024', homeScore: 1, awayScore: 0 },
  { id: 'em2024-r16-6', date: '2024-07-01', homeTeam: 'Portugal',     awayTeam: 'Slowenien',   venue: '', phase: 'Achtelfinale', competition: 'EM 2024', homeScore: 0, awayScore: 0 },
  { id: 'em2024-r16-7', date: '2024-07-02', homeTeam: 'Niederlande',  awayTeam: 'Rumaenien',   venue: '', phase: 'Achtelfinale', competition: 'EM 2024', homeScore: 3, awayScore: 0 },
  { id: 'em2024-r16-8', date: '2024-07-02', homeTeam: 'Oesterreich',  awayTeam: 'Tuerkei',     venue: '', phase: 'Achtelfinale', competition: 'EM 2024', homeScore: 1, awayScore: 2 },
  { id: 'em2024-qf-1',  date: '2024-07-05', homeTeam: 'Spanien',      awayTeam: 'Deutschland', venue: '', phase: 'Viertelfinale', competition: 'EM 2024', homeScore: 2, awayScore: 1 },
  { id: 'em2024-qf-2',  date: '2024-07-05', homeTeam: 'Portugal',     awayTeam: 'Frankreich',  venue: '', phase: 'Viertelfinale', competition: 'EM 2024', homeScore: 0, awayScore: 0 },
  { id: 'em2024-qf-3',  date: '2024-07-06', homeTeam: 'England',      awayTeam: 'Schweiz',     venue: '', phase: 'Viertelfinale', competition: 'EM 2024', homeScore: 1, awayScore: 1 },
  { id: 'em2024-qf-4',  date: '2024-07-06', homeTeam: 'Niederlande',  awayTeam: 'Tuerkei',     venue: '', phase: 'Viertelfinale', competition: 'EM 2024', homeScore: 2, awayScore: 1 },
  { id: 'em2024-sf-1',  date: '2024-07-09', homeTeam: 'Spanien',      awayTeam: 'Frankreich',  venue: '', phase: 'Halbfinale',    competition: 'EM 2024', homeScore: 2, awayScore: 1 },
  { id: 'em2024-sf-2',  date: '2024-07-10', homeTeam: 'Niederlande',  awayTeam: 'England',     venue: '', phase: 'Halbfinale',    competition: 'EM 2024', homeScore: 1, awayScore: 2 },
  { id: 'em2024-final', date: '2024-07-14', homeTeam: 'Spanien',      awayTeam: 'England',     venue: '', phase: 'Finale',        competition: 'EM 2024', homeScore: 2, awayScore: 1 },

  // ===== Copa America 2024 KO-Phase (8) — USA-Stadien =====
  { id: 'copa2024-qf-1', date: '2024-07-04', homeTeam: 'Argentinien', awayTeam: 'Ecuador',     venue: 'NRG Stadium',         phase: 'Viertelfinale', competition: 'Copa America 2024', homeScore: 1, awayScore: 1 },
  { id: 'copa2024-qf-2', date: '2024-07-05', homeTeam: 'Venezuela',   awayTeam: 'Kanada',      venue: 'AT&T Stadium',        phase: 'Viertelfinale', competition: 'Copa America 2024', homeScore: 1, awayScore: 1 },
  { id: 'copa2024-qf-3', date: '2024-07-05', homeTeam: 'Kolumbien',   awayTeam: 'Panama',      venue: 'Hard Rock Stadium',   phase: 'Viertelfinale', competition: 'Copa America 2024', homeScore: 5, awayScore: 0 },
  { id: 'copa2024-qf-4', date: '2024-07-06', homeTeam: 'Uruguay',     awayTeam: 'Brasilien',   venue: 'Levi\'s Stadium',     phase: 'Viertelfinale', competition: 'Copa America 2024', homeScore: 0, awayScore: 0 },
  { id: 'copa2024-sf-1', date: '2024-07-09', homeTeam: 'Argentinien', awayTeam: 'Kanada',      venue: 'MetLife Stadium',     phase: 'Halbfinale',    competition: 'Copa America 2024', homeScore: 2, awayScore: 0 },
  { id: 'copa2024-sf-2', date: '2024-07-10', homeTeam: 'Uruguay',     awayTeam: 'Kolumbien',   venue: 'Bank of America Stadium', phase: 'Halbfinale', competition: 'Copa America 2024', homeScore: 0, awayScore: 1 },
  { id: 'copa2024-3rd',  date: '2024-07-13', homeTeam: 'Kanada',      awayTeam: 'Uruguay',     venue: 'Bank of America Stadium', phase: 'Spiel um Platz 3', competition: 'Copa America 2024', homeScore: 2, awayScore: 2 },
  { id: 'copa2024-final',date: '2024-07-14', homeTeam: 'Argentinien', awayTeam: 'Kolumbien',   venue: 'Hard Rock Stadium',   phase: 'Finale',        competition: 'Copa America 2024', homeScore: 1, awayScore: 0 },

  // ===== Nations League Finals (3) =====
  { id: 'nl2023-sf-1', date: '2023-06-14', homeTeam: 'Niederlande',   awayTeam: 'Kroatien',    venue: '', phase: 'Halbfinale', competition: 'Nations League', homeScore: 2, awayScore: 4 },
  { id: 'nl2023-final',date: '2023-06-18', homeTeam: 'Kroatien',      awayTeam: 'Spanien',     venue: '', phase: 'Finale',     competition: 'Nations League', homeScore: 0, awayScore: 0 },
  { id: 'nl2024-final',date: '2024-06-09', homeTeam: 'Portugal',      awayTeam: 'Spanien',     venue: '', phase: 'Finale',     competition: 'Nations League', homeScore: 2, awayScore: 3 },

  // ===== Top-Freundschaftsspiele 2023-2024 (8) =====
  { id: 'fr2024-1', date: '2024-03-22', homeTeam: 'Brasilien',     awayTeam: 'England',     venue: '', phase: 'Freundschaft', competition: 'Freundschaft', homeScore: 1, awayScore: 0 },
  { id: 'fr2024-2', date: '2024-03-26', homeTeam: 'Spanien',       awayTeam: 'Brasilien',   venue: '', phase: 'Freundschaft', competition: 'Freundschaft', homeScore: 3, awayScore: 3 },
  { id: 'fr2024-3', date: '2024-06-03', homeTeam: 'Deutschland',   awayTeam: 'Ukraine',     venue: '', phase: 'Freundschaft', competition: 'Freundschaft', homeScore: 0, awayScore: 0 },
  { id: 'fr2024-4', date: '2024-06-07', homeTeam: 'Deutschland',   awayTeam: 'Griechenland',venue: '', phase: 'Freundschaft', competition: 'Freundschaft', homeScore: 2, awayScore: 1 },
  { id: 'fr2023-1', date: '2023-09-12', homeTeam: 'Frankreich',    awayTeam: 'Deutschland', venue: '', phase: 'Freundschaft', competition: 'Freundschaft', homeScore: 1, awayScore: 2 },
  { id: 'fr2023-2', date: '2023-10-17', homeTeam: 'Niederlande',   awayTeam: 'Frankreich',  venue: '', phase: 'Freundschaft', competition: 'Freundschaft', homeScore: 1, awayScore: 2 },
  { id: 'fr2024-5', date: '2024-03-23', homeTeam: 'Deutschland',   awayTeam: 'Frankreich',  venue: '', phase: 'Freundschaft', competition: 'Freundschaft', homeScore: 2, awayScore: 0 },
  { id: 'fr2024-6', date: '2024-03-26', homeTeam: 'Deutschland',   awayTeam: 'Niederlande', venue: '', phase: 'Freundschaft', competition: 'Freundschaft', homeScore: 2, awayScore: 1 }
];

// Klare WM-Ergebnis-Tafel.
//
// Nimmt die letzten N Tage der WM, alle bekannten Final-Scores (manuell
// + extern) und (optional) unsere abgegebenen Picks aus dem Pick-Log,
// und liefert pro Spiel:
//   - Spiel-Headline
//   - Endergebnis
//   - Sieger-Seite (home/away/remis)
//   - ob wir einen Pick hatten und ob er getroffen hat
//
// Reine Funktion. Keine I/O.

import type { WmFixture } from '@/lib/sport/wm-schedule-2026';
import type { FinishedFixtureLite } from '@/lib/sport/wm-pick-learning';

export type WmResultStatus = 'home' | 'away' | 'remis';
export type WmPickStatus = 'kein-tipp' | 'treffer' | 'fehl' | 'remis-push';

export interface WmResultRow {
  fixtureId: string;
  dateIso: string;
  time: string | null;
  headline: string;       // "Spanien 2:1 Kap Verde"
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: WmResultStatus;
  pickStatus: WmPickStatus;
  pickedTeam: string | null;
  pickLabel: string;      // "Tipp: Spanien — Treffer" o.ae.
}

export interface WmResultBoard {
  fromIso: string;
  toIso: string;
  rows: WmResultRow[];
  totalGames: number;
  totalHits: number;
  totalMiss: number;
  totalPush: number;
  totalWithoutPick: number;
}

interface PickLite {
  fixtureId: string;
  pickedSide: 'home' | 'away';
}

interface BuildOptions {
  todayIso: string;
  lookbackDays?: number; // Default 7 — wie weit zurueck wir Ergebnisse zeigen
  schedule: WmFixture[];
  finished: FinishedFixtureLite[];
  picks?: PickLite[];
}

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function buildWmResultBoard(opts: BuildOptions): WmResultBoard {
  const { todayIso, schedule, finished, picks = [] } = opts;
  const lookback = opts.lookbackDays ?? 7;
  const fromIso = addDays(todayIso, -lookback);
  const finishedByFixture = new Map(finished.map((f) => [f.fixtureId, f] as const));
  const pickByFixture = new Map(picks.map((p) => [p.fixtureId, p] as const));

  const rows: WmResultRow[] = [];
  for (const f of schedule) {
    if (f.date < fromIso || f.date > todayIso) continue;
    const fin = finishedByFixture.get(f.id);
    if (!fin) continue;
    const status: WmResultStatus = fin.homeScore === fin.awayScore ? 'remis' : fin.homeScore > fin.awayScore ? 'home' : 'away';
    const pick = pickByFixture.get(f.id) ?? null;
    let pickStatus: WmPickStatus = 'kein-tipp';
    let pickedTeam: string | null = null;
    let pickLabel = 'kein Tipp';
    if (pick) {
      pickedTeam = pick.pickedSide === 'home' ? f.homeTeam : f.awayTeam;
      if (status === 'remis') {
        pickStatus = 'remis-push';
        pickLabel = `Tipp: ${pickedTeam} — Remis (push)`;
      } else if (status === pick.pickedSide) {
        pickStatus = 'treffer';
        pickLabel = `Tipp: ${pickedTeam} — Treffer`;
      } else {
        pickStatus = 'fehl';
        pickLabel = `Tipp: ${pickedTeam} — Fehl`;
      }
    }
    rows.push({
      fixtureId: f.id,
      dateIso: f.date,
      time: f.time,
      headline: `${f.homeTeam} ${fin.homeScore}:${fin.awayScore} ${f.awayTeam}`,
      homeTeam: f.homeTeam,
      awayTeam: f.awayTeam,
      homeScore: fin.homeScore,
      awayScore: fin.awayScore,
      status,
      pickStatus,
      pickedTeam,
      pickLabel
    });
  }
  rows.sort((a, b) => (a.dateIso === b.dateIso ? (a.time ?? '').localeCompare(b.time ?? '') : b.dateIso.localeCompare(a.dateIso)));

  const totalHits = rows.filter((r) => r.pickStatus === 'treffer').length;
  const totalMiss = rows.filter((r) => r.pickStatus === 'fehl').length;
  const totalPush = rows.filter((r) => r.pickStatus === 'remis-push').length;
  const totalWithoutPick = rows.filter((r) => r.pickStatus === 'kein-tipp').length;
  return {
    fromIso,
    toIso: todayIso,
    rows,
    totalGames: rows.length,
    totalHits,
    totalMiss,
    totalPush,
    totalWithoutPick
  };
}

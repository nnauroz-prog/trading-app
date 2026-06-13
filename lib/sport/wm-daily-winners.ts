// Taegliche Gewinner-Liste: jedes WM-Spiel chronologisch (Datum + Zeit),
// pro Spiel nur der Modell-Gewinner. KO-Spiele werden ueber den
// Turnier-Forecast aufgeloest (projizierte Paarungen), Gruppenspiele
// direkt aus dem Spielplan. Optional: Endstand mit Treffer/Fehl.
//
// Reine Funktion.

import { WM_2026_FIXTURES, type WmFixture } from '@/lib/sport/wm-schedule-2026';
import { buildWmSimplePicks } from '@/lib/sport/wm-simple-picks';
import { buildWmTournamentForecast } from '@/lib/sport/wm-tournament-forecast';
import { utcToBerlin } from '@/lib/sport/wm-utc-to-berlin';
import type { FinishedFixtureLite } from '@/lib/sport/wm-pick-learning';

export type WmDailyOutcome = 'treffer' | 'daneben' | 'remis-push';

export interface WmDailyResult {
  homeScore: number;
  awayScore: number;
  outcome: WmDailyOutcome;
}

export interface WmDailyWinnerRow {
  fixtureId: string;
  dateIso: string;
  time: string | null;
  phase: WmFixture['phase'];
  group?: string;
  homeTeam: string;
  awayTeam: string;
  winner: string;
  loser: string;
  // true wenn die Paarung selbst eine Modell-Projektion ist (KO-Spiele,
  // deren Teilnehmer aus dem prognostizierten Gruppen-Endstand kommen).
  isProjectedPairing: boolean;
  // Modell-Wahrscheinlichkeit fuer die Pick-Seite in Prozent (0..100).
  // null falls keine Engine-Ausgabe vorliegt.
  confidencePct: number | null;
  // Endstand falls bereits eingetragen.
  result: WmDailyResult | null;
}

export interface WmDailyWinners {
  rows: WmDailyWinnerRow[];
  championPick: string | null;
}

interface BuildOptions {
  schedule?: WmFixture[];
  finished?: FinishedFixtureLite[];
}

function classifyOutcome(homeScore: number, awayScore: number, predictedWinner: string, homeTeam: string, awayTeam: string): WmDailyOutcome {
  if (homeScore === awayScore) return 'remis-push';
  const actualWinner = homeScore > awayScore ? homeTeam : awayTeam;
  return actualWinner === predictedWinner ? 'treffer' : 'daneben';
}

export function buildWmDailyWinners(opts: BuildOptions = {}): WmDailyWinners {
  const schedule = opts.schedule ?? WM_2026_FIXTURES;
  const finishedById = new Map<string, FinishedFixtureLite>(
    (opts.finished ?? []).map((f) => [f.fixtureId, f] as const)
  );
  const rows: WmDailyWinnerRow[] = [];

  // 1) Gruppenspiele aus den Simple-Picks (konkrete Paarungen, kein TBD).
  const simple = buildWmSimplePicks({ schedule });
  const scheduleById = new Map(schedule.map((f) => [f.id, f] as const));
  for (const p of simple) {
    if (p.status === 'tbd') continue;
    if (p.winnerTeam === null || p.loserTeam === null) continue;
    const fix = scheduleById.get(p.fixtureId);
    if (!fix || fix.phase !== 'Gruppe') continue;
    const fin = finishedById.get(p.fixtureId);
    let result: WmDailyResult | null = null;
    if (fin) {
      result = {
        homeScore: fin.homeScore,
        awayScore: fin.awayScore,
        outcome: classifyOutcome(fin.homeScore, fin.awayScore, p.winnerTeam, fix.homeTeam, fix.awayTeam)
      };
    }
    rows.push({
      fixtureId: p.fixtureId,
      dateIso: p.dateIso,
      time: p.time,
      phase: 'Gruppe',
      group: fix.group,
      homeTeam: fix.homeTeam,
      awayTeam: fix.awayTeam,
      winner: p.winnerTeam,
      loser: p.loserTeam,
      isProjectedPairing: false,
      confidencePct: p.confidencePct,
      result
    });
  }

  // 2) KO-Spiele aus dem Turnier-Forecast.
  const forecast = opts.schedule
    ? buildWmTournamentForecast({ schedule })
    : buildWmTournamentForecast();
  for (const k of forecast.ko) {
    if (!k.predictedWinner || !k.predictedLoser) continue;
    const fin = finishedById.get(k.fixtureId);
    let result: WmDailyResult | null = null;
    if (fin && k.homeTeam && k.awayTeam) {
      result = {
        homeScore: fin.homeScore,
        awayScore: fin.awayScore,
        outcome: classifyOutcome(fin.homeScore, fin.awayScore, k.predictedWinner, k.homeTeam, k.awayTeam)
      };
    }
    // KO-Sieg-Wahrscheinlichkeit: anteil der Heim- bzw. Auswaertsseite
    // an der Pick-Seite. homeWinPct + awayWinPct + drawPct = 100; im
    // KO zaehlt der Wert der Pick-Seite (Remis wird im KO durch
    // Verlaengerungs-Logik aufgeloest).
    let confidencePct: number | null = null;
    if (k.predictedWinner && k.homeTeam && k.awayTeam) {
      if (k.predictedWinner === k.homeTeam && k.homeWinPct !== null) {
        confidencePct = Math.round(k.homeWinPct);
      } else if (k.predictedWinner === k.awayTeam && k.awayWinPct !== null) {
        confidencePct = Math.round(k.awayWinPct);
      }
    }
    rows.push({
      fixtureId: k.fixtureId,
      dateIso: k.dateIso,
      time: k.time,
      phase: k.phase,
      homeTeam: k.homeTeam ?? k.homeLabel,
      awayTeam: k.awayTeam ?? k.awayLabel,
      winner: k.predictedWinner,
      loser: k.predictedLoser,
      isProjectedPairing: true,
      confidencePct,
      result
    });
  }

  // UTC -> Berlin pro Row. Das verschiebt einzelne Spiele eventuell auf
  // den naechsten Berliner Tag (Spaet-UTC-Anstoesse) — danach neu sortieren.
  const rowsBerlin = rows.map((r) => {
    const { dateIso, time } = utcToBerlin(r.dateIso, r.time);
    return { ...r, dateIso, time };
  });
  rowsBerlin.sort((a, b) => {
    if (a.dateIso !== b.dateIso) return a.dateIso.localeCompare(b.dateIso);
    return (a.time ?? '99:99').localeCompare(b.time ?? '99:99');
  });

  return { rows: rowsBerlin, championPick: forecast.championPick };
}

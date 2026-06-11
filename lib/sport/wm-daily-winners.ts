// Taegliche Gewinner-Liste: jedes WM-Spiel chronologisch (Datum + Zeit),
// pro Spiel nur der Modell-Gewinner. KO-Spiele werden ueber den
// Turnier-Forecast aufgeloest (projizierte Paarungen), Gruppenspiele
// direkt aus dem Spielplan.
//
// Reine Funktion.

import { WM_2026_FIXTURES, type WmFixture } from '@/lib/sport/wm-schedule-2026';
import { buildWmSimplePicks } from '@/lib/sport/wm-simple-picks';
import { buildWmTournamentForecast } from '@/lib/sport/wm-tournament-forecast';

export interface WmDailyWinnerRow {
  fixtureId: string;
  dateIso: string;
  time: string | null;
  phase: WmFixture['phase'];
  group?: string;
  winner: string;
  loser: string;
  // true wenn die Paarung selbst eine Modell-Projektion ist (KO-Spiele,
  // deren Teilnehmer aus dem prognostizierten Gruppen-Endstand kommen).
  isProjectedPairing: boolean;
}

export interface WmDailyWinners {
  rows: WmDailyWinnerRow[];
  championPick: string | null;
}

interface BuildOptions {
  schedule?: WmFixture[];
}

export function buildWmDailyWinners(opts: BuildOptions = {}): WmDailyWinners {
  const schedule = opts.schedule ?? WM_2026_FIXTURES;
  const rows: WmDailyWinnerRow[] = [];

  // 1) Gruppenspiele aus den Simple-Picks (konkrete Paarungen, kein TBD).
  const simple = buildWmSimplePicks({ schedule });
  const scheduleById = new Map(schedule.map((f) => [f.id, f] as const));
  for (const p of simple) {
    if (p.status === 'tbd') continue;          // KO-Platzhalter — kommt aus dem Forecast
    if (p.winnerTeam === null || p.loserTeam === null) continue; // Remis-Tipp ueberspringen wir nicht: aber ohne Gewinner keine Zeile
    const fix = scheduleById.get(p.fixtureId);
    if (!fix || fix.phase !== 'Gruppe') continue; // KO mit konkreten Teams kommt ebenfalls aus dem Forecast
    rows.push({
      fixtureId: p.fixtureId,
      dateIso: p.dateIso,
      time: p.time,
      phase: 'Gruppe',
      group: fix.group,
      winner: p.winnerTeam,
      loser: p.loserTeam,
      isProjectedPairing: false
    });
  }

  // 2) KO-Spiele aus dem Turnier-Forecast (loest Platzhalter auf,
  //    inkl. Modell-Bracket AF5-AF8).
  const forecast = opts.schedule
    ? buildWmTournamentForecast({ schedule })
    : buildWmTournamentForecast();
  for (const k of forecast.ko) {
    if (!k.predictedWinner || !k.predictedLoser) continue;
    rows.push({
      fixtureId: k.fixtureId,
      dateIso: k.dateIso,
      time: k.time,
      phase: k.phase,
      winner: k.predictedWinner,
      loser: k.predictedLoser,
      isProjectedPairing: true
    });
  }

  rows.sort((a, b) => {
    if (a.dateIso !== b.dateIso) return a.dateIso.localeCompare(b.dateIso);
    return (a.time ?? '99:99').localeCompare(b.time ?? '99:99');
  });

  return { rows, championPick: forecast.championPick };
}

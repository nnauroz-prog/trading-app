// Dynamisches ELO-Update aus echten WM-Resultaten.
//
// Standard-ELO-Formel:
//   expectedHome = 1 / (1 + 10^((awayElo - homeElo - homeAdv) / 400))
//   actualHome   = homeWon ? 1 : draw ? 0.5 : 0
//   newHomeElo   = homeElo + K * (actualHome - expectedHome)
//
// K-Faktor: 30 fuer WM-Pflichtspiele, 50 fuer KO-Phase (haerter
// gewichtet weil die Stichprobe pro Team begrenzt ist).
//
// Wir starten von den statischen ELO-Werten aus wm-team-strength und
// applizieren alle resolved-Picks bzw. matched Final-Scores.
// Reine Funktion. Der localStorage-Wrapper liegt im Caller.

import { WM_2026_TEAMS, findTeamStrength } from '@/lib/sport/wm-team-strength';
import { WM_2026_FIXTURES } from '@/lib/sport/wm-schedule-2026';
import type { FinishedFixtureLite } from '@/lib/sport/wm-pick-learning';

export interface EloDelta {
  team: string;
  startElo: number;
  newElo: number;
  delta: number;
  basedOnGames: number;
}

function kFactor(phase: string): number {
  if (phase === 'Gruppe') return 30;
  return 50;
}

function actualScore(home: number, away: number): { home: number; away: number } {
  if (home > away) return { home: 1, away: 0 };
  if (home < away) return { home: 0, away: 1 };
  return { home: 0.5, away: 0.5 };
}

export interface EloMap {
  // Team-Name → aktueller ELO-Wert.
  values: Record<string, number>;
  // Pro Team: Anzahl bewerteter Spiele.
  games: Record<string, number>;
}

function baseElo(team: string): number {
  const t = findTeamStrength(team);
  // findTeamStrength faellt auf FALLBACK_TEAM zurueck — kein Null-Risiko.
  return t?.elo ?? 1500;
}

// Wendet eine Liste von WM-Final-Scores chronologisch an und liefert
// die neuen ELO-Werte.
export function applyResultsToElo(results: FinishedFixtureLite[]): EloMap {
  const values: Record<string, number> = {};
  const games: Record<string, number> = {};
  // Sortieren nach Spieldatum (via Fixtures-Index).
  const fixtureById = new Map(WM_2026_FIXTURES.map((f) => [f.id, f]));
  const ordered = results.slice().sort((a, b) => {
    const fa = fixtureById.get(a.fixtureId);
    const fb = fixtureById.get(b.fixtureId);
    if (!fa || !fb) return 0;
    return fa.date.localeCompare(fb.date);
  });
  for (const r of ordered) {
    const f = fixtureById.get(r.fixtureId);
    if (!f) continue;
    const homeElo = values[f.homeTeam] ?? baseElo(f.homeTeam);
    const awayElo = values[f.awayTeam] ?? baseElo(f.awayTeam);
    const expectedHome = 1 / (1 + Math.pow(10, (awayElo - homeElo) / 400));
    const expectedAway = 1 - expectedHome;
    const act = actualScore(r.homeScore, r.awayScore);
    const k = kFactor(f.phase);
    values[f.homeTeam] = Math.round(homeElo + k * (act.home - expectedHome));
    values[f.awayTeam] = Math.round(awayElo + k * (act.away - expectedAway));
    games[f.homeTeam] = (games[f.homeTeam] ?? 0) + 1;
    games[f.awayTeam] = (games[f.awayTeam] ?? 0) + 1;
  }
  return { values, games };
}

// Liefert pro Team das Delta zum statischen Basis-ELO — fuer UI-Anzeige.
export function summarizeEloDeltas(map: EloMap): EloDelta[] {
  const out: EloDelta[] = [];
  for (const [team, newElo] of Object.entries(map.values)) {
    const baseStrength = WM_2026_TEAMS.find((t) => t.name === team || t.aliases?.includes(team));
    const startElo = baseStrength?.elo ?? newElo;
    out.push({
      team,
      startElo,
      newElo,
      delta: newElo - startElo,
      basedOnGames: map.games[team] ?? 0
    });
  }
  out.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  return out;
}

// Sammelt Final-Scores aus dem Pick-Lern-Log + manuellen Eintraegen.
// Manuelle Eintraege sind authoritativ; Log-Scores ergaenzen; Fixtures
// ohne Pick-Log aber mit manuellem Ergebnis zaehlen ebenfalls.
// Pure — wird vom ELO-Drift-Display UND vom Pick-Ranking benutzt.
export interface MinimalResolvedPick {
  fixtureId: string;
  outcome: 'pending' | 'win' | 'loss' | 'push';
  finalHomeScore?: number;
  finalAwayScore?: number;
}

export interface MinimalManualResult {
  fixtureId: string;
  homeScore: number;
  awayScore: number;
}

export function collectResultsForElo(
  log: MinimalResolvedPick[],
  manual: MinimalManualResult[]
): FinishedFixtureLite[] {
  const manualMap = new Map(manual.map((m) => [m.fixtureId, m]));
  const results: FinishedFixtureLite[] = [];
  for (const e of log) {
    if (e.outcome === 'pending') continue;
    const m = manualMap.get(e.fixtureId);
    if (m) {
      results.push({ fixtureId: e.fixtureId, homeScore: m.homeScore, awayScore: m.awayScore });
      continue;
    }
    if (typeof e.finalHomeScore === 'number' && typeof e.finalAwayScore === 'number') {
      results.push({ fixtureId: e.fixtureId, homeScore: e.finalHomeScore, awayScore: e.finalAwayScore });
    }
  }
  for (const m of manual) {
    if (!results.find((r) => r.fixtureId === m.fixtureId)) {
      results.push({ fixtureId: m.fixtureId, homeScore: m.homeScore, awayScore: m.awayScore });
    }
  }
  return results;
}

// Liefert pro Team das gelernte ELO-Delta als Map — Eingabe fuer das
// Pick-Ranking (dynamic-elo Conditions-Faktor).
export function eloDeltaByTeam(map: EloMap): Record<string, number> {
  const out: Record<string, number> = {};
  for (const d of summarizeEloDeltas(map)) {
    if (d.delta !== 0) out[d.team] = d.delta;
  }
  return out;
}

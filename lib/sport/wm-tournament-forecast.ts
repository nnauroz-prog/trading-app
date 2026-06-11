// Turnier-Forecast: Gruppen-Endstand + Turnierbaum bis zum
// Weltmeister-Tipp. Reine Funktion. Nutzt die bestehende
// predictWmMatch-Engine, also dieselbe Modell-Logik wie alle anderen
// WM-Karten.
//
// Vorgehen:
//  1. Aus dem Spielplan jede Gruppe identifizieren (4 Teams).
//  2. Pro Gruppe alle 6 Paarungen mit predictWmMatch simulieren:
//     - Erwartete Punkte aus 1X2-Verteilung (3*Win + 1*Draw)
//     - Erwartete Tor-Differenz aus xG-Modell
//  3. Tabelle nach erwarteten Punkten -> Tor-Differenz -> Tore sortieren.
//  4. KO-Platzhalter ("Sieger Gruppe A", "Zweiter Gruppe B", ...)
//     gegen die Gruppen-Tabelle aufloesen und durch den Bracket
//     iterieren bis der Schedule endet.
//  5. Letzter aufgeloester Pick = Turniersieger-Tipp.

import { WM_2026_FIXTURES, type WmFixture } from '@/lib/sport/wm-schedule-2026';
import { predictWmMatch } from '@/lib/sport/wm-match-engine';
import { WM_2026_GROUP_DRAW, listAllGroupLetters } from '@/lib/sport/wm-group-draw';

function isTbd(team: string): boolean {
  if (!team || team.includes('TBD')) return true;
  return /^(Sieger|Verlierer|Zweiter|Erster|Gruppenerster|Gruppenzweiter|Bester|Gewinner|Drittplatzierter)\s/i.test(team.trim());
}

export interface GroupTableRow {
  team: string;
  expectedPoints: number;     // 0..9
  expectedGoalDiff: number;
  expectedGoalsFor: number;
  position: 1 | 2 | 3 | 4;
}

export interface GroupForecast {
  group: string;              // 'A' .. 'L'
  teams: string[];            // 4 Teams in Reihenfolge der Tabelle
  table: GroupTableRow[];
  // Tipps fuers Weiterkommen (Top 2 standard).
  advancing: string[];
}

export interface KoPrediction {
  fixtureId: string;
  phase: WmFixture['phase'];
  dateIso: string;
  time: string | null;
  homeLabel: string;          // raw schedule label, z. B. "Sieger Gruppe A"
  awayLabel: string;
  homeTeam: string | null;    // aufgeloest, null wenn nicht resolvbar
  awayTeam: string | null;
  predictedWinner: string | null;
  predictedLoser: string | null;
  homeWinPct: number | null;
  awayWinPct: number | null;
  drawPct: number | null;
}

export interface WmTournamentForecast {
  groups: GroupForecast[];
  ko: KoPrediction[];
  championPick: string | null;       // Sieger des letzten resolvbaren Spiels (Finale)
  thirdPlacePick: string | null;     // wenn Spiel um Platz 3 resolvable
  // Gruppen-Buchstaben fuer die keine vollstaendige Vier-Team-Liste
  // verfuegbar ist (weder Auslosung-Lookup noch Spielplan reichen aus).
  incompleteGroups: string[];
}

// --- Helpers ---

function uniqueTeamsPerGroupFromScheduleOnly(schedule: WmFixture[]): Map<string, string[]> {
  const byGroup = new Map<string, Set<string>>();
  for (const f of schedule) {
    if (f.phase !== 'Gruppe' || !f.group) continue;
    if (isTbd(f.homeTeam) || isTbd(f.awayTeam)) continue;
    if (!byGroup.has(f.group)) byGroup.set(f.group, new Set());
    byGroup.get(f.group)!.add(f.homeTeam);
    byGroup.get(f.group)!.add(f.awayTeam);
  }
  const out = new Map<string, string[]>();
  for (const [g, set] of byGroup) {
    if (set.size === 4) out.set(g, Array.from(set).sort());
  }
  return out;
}

function uniqueTeamsPerGroup(schedule: WmFixture[]): Map<string, string[]> {
  // 1. Bevorzugt: vollstaendige FIFA-Auslosung aus der Lookup.
  // 2. Fallback: Teams die im Spielplan vorkommen (nicht-TBD).
  const fromSchedule = new Map<string, Set<string>>();
  for (const f of schedule) {
    if (f.phase !== 'Gruppe' || !f.group) continue;
    if (isTbd(f.homeTeam) || isTbd(f.awayTeam)) continue;
    if (!fromSchedule.has(f.group)) fromSchedule.set(f.group, new Set());
    fromSchedule.get(f.group)!.add(f.homeTeam);
    fromSchedule.get(f.group)!.add(f.awayTeam);
  }
  const out = new Map<string, string[]>();
  for (const g of listAllGroupLetters()) {
    const known = WM_2026_GROUP_DRAW[g];
    if (known && known.teams.length === 4) {
      out.set(g, [...known.teams]);
      continue;
    }
    const sched = fromSchedule.get(g);
    if (sched && sched.size === 4) {
      out.set(g, Array.from(sched).sort());
    }
  }
  return out;
}

function simulateGroupPairing(home: string, away: string, venue: string): { homePts: number; awayPts: number; homeGd: number; awayGd: number; homeGf: number; awayGf: number; } {
  const pred = predictWmMatch({ homeTeam: home, awayTeam: away, venue });
  const homePts = pred.regular.homePct * 3 + pred.regular.drawPct * 1;
  const awayPts = pred.regular.awayPct * 3 + pred.regular.drawPct * 1;
  const homeGd = pred.expectedGoals.home - pred.expectedGoals.away;
  const awayGd = -homeGd;
  return {
    homePts,
    awayPts,
    homeGd,
    awayGd,
    homeGf: pred.expectedGoals.home,
    awayGf: pred.expectedGoals.away
  };
}

function buildGroupForecast(group: string, teams: string[]): GroupForecast | null {
  if (teams.length !== 4) return null;
  type Agg = { expectedPoints: number; expectedGoalDiff: number; expectedGoalsFor: number };
  const agg = new Map<string, Agg>(teams.map((t) => [t, { expectedPoints: 0, expectedGoalDiff: 0, expectedGoalsFor: 0 }]));
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const a = teams[i], b = teams[j];
      const s = simulateGroupPairing(a, b, '');
      const ra = agg.get(a)!;
      const rb = agg.get(b)!;
      ra.expectedPoints += s.homePts;
      ra.expectedGoalDiff += s.homeGd;
      ra.expectedGoalsFor += s.homeGf;
      rb.expectedPoints += s.awayPts;
      rb.expectedGoalDiff += s.awayGd;
      rb.expectedGoalsFor += s.awayGf;
    }
  }
  const ranked = teams
    .map((t) => ({ team: t, ...agg.get(t)! }))
    .sort((x, y) => {
      if (Math.abs(y.expectedPoints - x.expectedPoints) > 0.001) return y.expectedPoints - x.expectedPoints;
      if (Math.abs(y.expectedGoalDiff - x.expectedGoalDiff) > 0.001) return y.expectedGoalDiff - x.expectedGoalDiff;
      return y.expectedGoalsFor - x.expectedGoalsFor;
    })
    .map((r, i) => ({
      team: r.team,
      expectedPoints: Math.round(r.expectedPoints * 100) / 100,
      expectedGoalDiff: Math.round(r.expectedGoalDiff * 100) / 100,
      expectedGoalsFor: Math.round(r.expectedGoalsFor * 100) / 100,
      position: (i + 1) as 1 | 2 | 3 | 4
    }));
  return {
    group,
    teams: ranked.map((r) => r.team),
    table: ranked,
    advancing: [ranked[0].team, ranked[1].team]
  };
}

// --- KO-Platzhalter aufloesen ---

const SIEGER_GROUP_RE = /^Sieger\s+Gruppe\s+([A-L])$/i;
const ZWEITER_GROUP_RE = /^Zweiter\s+Gruppe\s+([A-L])$/i;
const SIEGER_AF_RE = /^Sieger\s+AF(\d+)$/i;
const SIEGER_VF_RE = /^Sieger\s+VF(\d+)$/i;
const SIEGER_HF_RE = /^Sieger\s+HF(\d+)$/i;
const VERLIERER_HF_RE = /^Verlierer\s+HF(\d+)$/i;

function resolveLabel(
  label: string,
  groups: GroupForecast[],
  koResults: Map<string, { winner: string; loser: string }>
): string | null {
  const sg = SIEGER_GROUP_RE.exec(label);
  if (sg) {
    const g = groups.find((x) => x.group === sg[1].toUpperCase());
    return g?.table[0]?.team ?? null;
  }
  const zg = ZWEITER_GROUP_RE.exec(label);
  if (zg) {
    const g = groups.find((x) => x.group === zg[1].toUpperCase());
    return g?.table[1]?.team ?? null;
  }
  const af = SIEGER_AF_RE.exec(label);
  if (af) {
    return koResults.get(`wm-r16-${af[1]}`)?.winner ?? null;
  }
  const vf = SIEGER_VF_RE.exec(label);
  if (vf) {
    return koResults.get(`wm-qf-${vf[1]}`)?.winner ?? null;
  }
  const hf = SIEGER_HF_RE.exec(label);
  if (hf) {
    return koResults.get(`wm-hf-${hf[1]}`)?.winner ?? null;
  }
  const vhf = VERLIERER_HF_RE.exec(label);
  if (vhf) {
    return koResults.get(`wm-hf-${vhf[1]}`)?.loser ?? null;
  }
  return null;
}

function predictKoMatch(home: string, away: string, venue: string): { winner: string; loser: string; homePct: number; awayPct: number; drawPct: number } {
  const pred = predictWmMatch({ homeTeam: home, awayTeam: away, venue });
  // KO-Modus: kein Remis im Ergebnis, also waehlen wir den Sieger anhand
  // withExtraTime (Verlaengerung beruecksichtigt).
  if (pred.withExtraTime.homePct >= pred.withExtraTime.awayPct) {
    return {
      winner: home,
      loser: away,
      homePct: pred.regular.homePct,
      awayPct: pred.regular.awayPct,
      drawPct: pred.regular.drawPct
    };
  }
  return {
    winner: away,
    loser: home,
    homePct: pred.regular.homePct,
    awayPct: pred.regular.awayPct,
    drawPct: pred.regular.drawPct
  };
}

interface BuildOptions {
  schedule?: WmFixture[];
  // Wenn false, wird die statische Auslosungs-Lookup ignoriert und nur
  // der Schedule selbst durchsucht. Default true (Lookup bevorzugt).
  useGroupDrawLookup?: boolean;
}

export function buildWmTournamentForecast(opts: BuildOptions = {}): WmTournamentForecast {
  const schedule = opts.schedule ?? WM_2026_FIXTURES;
  const useLookup = opts.useGroupDrawLookup ?? true;
  const teamsPerGroup = useLookup ? uniqueTeamsPerGroup(schedule) : uniqueTeamsPerGroupFromScheduleOnly(schedule);
  const groups: GroupForecast[] = [];
  for (const [g, teams] of teamsPerGroup) {
    const fc = buildGroupForecast(g, teams);
    if (fc) groups.push(fc);
  }
  groups.sort((a, b) => a.group.localeCompare(b.group));

  // KO-Phase iterativ aufloesen: Achtelfinale -> Viertel -> Halbfinale ->
  // (Spiel um Platz 3 / Finale).
  const koResults = new Map<string, { winner: string; loser: string }>();
  const koOrder: WmFixture['phase'][] = ['Achtelfinale', 'Viertelfinale', 'Halbfinale', 'Spiel um Platz 3', 'Finale'];
  const koMatches: KoPrediction[] = [];
  for (const phase of koOrder) {
    const phaseFixtures = schedule.filter((f) => f.phase === phase).sort((a, b) => a.id.localeCompare(b.id));
    for (const fix of phaseFixtures) {
      const homeTeam = resolveLabel(fix.homeTeam, groups, koResults);
      const awayTeam = resolveLabel(fix.awayTeam, groups, koResults);
      let predictedWinner: string | null = null;
      let predictedLoser: string | null = null;
      let homePct: number | null = null;
      let awayPct: number | null = null;
      let drawPct: number | null = null;
      if (homeTeam && awayTeam) {
        const r = predictKoMatch(homeTeam, awayTeam, fix.venue);
        predictedWinner = r.winner;
        predictedLoser = r.loser;
        homePct = Math.round(r.homePct * 1000) / 10;
        awayPct = Math.round(r.awayPct * 1000) / 10;
        drawPct = Math.round(r.drawPct * 1000) / 10;
        koResults.set(fix.id, { winner: r.winner, loser: r.loser });
      }
      koMatches.push({
        fixtureId: fix.id,
        phase: fix.phase,
        dateIso: fix.date,
        time: fix.time,
        homeLabel: fix.homeTeam,
        awayLabel: fix.awayTeam,
        homeTeam,
        awayTeam,
        predictedWinner,
        predictedLoser,
        homeWinPct: homePct,
        awayWinPct: awayPct,
        drawPct
      });
    }
  }

  const finale = koMatches.find((k) => k.phase === 'Finale');
  const thirdPlace = koMatches.find((k) => k.phase === 'Spiel um Platz 3');

  const presentGroups = new Set(groups.map((g) => g.group));
  const incompleteGroups = listAllGroupLetters().filter((g) => !presentGroups.has(g));

  return {
    groups,
    ko: koMatches,
    championPick: finale?.predictedWinner ?? null,
    thirdPlacePick: thirdPlace?.predictedWinner ?? null,
    incompleteGroups
  };
}

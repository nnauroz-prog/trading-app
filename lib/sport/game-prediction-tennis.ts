import type { ScoreForecast } from './game-prediction-math';

type Row = Record<string, unknown>;
const row = (value: unknown): Row => value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
const list = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const text = (value: unknown): string => typeof value === 'string' ? value : '';

export interface TennisEvidence { matches: number; setsWon: number; setsLost: number }
export interface TennisTournamentForecast {
  forecast: ScoreForecast;
  homeEvidence: TennisEvidence;
  awayEvidence: TennisEvidence;
  assumptions: string[];
}

interface CompletedMatch { ids: [string, string]; sets: [number, number] }

function participants(competition: Row): [Row, Row] | null {
  const competitors = list(competition.competitors).map(row);
  if (competitors.length !== 2) return null;
  const home = competitors.find(competitor => competitor.homeAway === 'home') ?? competitors[0];
  const away = competitors.find(competitor => competitor.homeAway === 'away') ?? competitors.find(competitor => competitor !== home);
  if (!away || !text(home.id) || !text(away.id) || home.id === away.id) return null;
  return [home, away];
}

/** Count only internally consistent, completed singles sets; no retirements or walkovers. */
function completedMatch(competition: Row): CompletedMatch | null {
  const status = row(row(competition.status).type);
  if (status.name !== 'STATUS_FINAL' || status.state !== 'post') return null;
  const players = participants(competition);
  if (!players) return null;
  const scores = players.map(player => list(player.linescores).map(row));
  if (scores[0].length < 2 || scores[0].length > 5 || scores[0].length !== scores[1].length) return null;
  const won: [number, number] = [0, 0];
  for (let index = 0; index < scores[0].length; index++) {
    const home = scores[0][index];
    const away = scores[1][index];
    const h = home.value;
    const a = away.value;
    if (typeof h !== 'number' || typeof a !== 'number' || !Number.isInteger(h) || !Number.isInteger(a)
      || h < 0 || a < 0 || h > 30 || a > 30 || h === a) return null;
    const winner = h > a ? 0 : 1;
    const high = Math.max(h, a);
    const low = Math.min(h, a);
    if (!((high === 6 && low <= 4) || (high >= 7 && high - low === 2) || (high === 7 && low === 6))
      || home.winner !== (winner === 0) || away.winner !== (winner === 1)) return null;
    won[winner]++;
  }
  const winner = won[0] > won[1] ? 0 : 1;
  if (won[0] === won[1] || players[winner].winner !== true || players[1 - winner].winner !== false) return null;
  // A finished best-of-three/five match cannot continue after the deciding set.
  if (won[winner] !== 2 && won[winner] !== 3) return null;
  let winnerSets = 0;
  for (let index = 0; index < scores[winner].length - 1; index++) {
    if (scores[winner][index].winner === true) winnerSets++;
    if (winnerSets === won[winner]) return null;
  }
  return { ids: [text(players[0].id), text(players[1].id)], sets: won };
}

/**
 * Small-sample tournament form model, deliberately unavailable without sufficient
 * completed results for both players. ESPN's tennis periods field is unreliable;
 * normal same-event finals must instead establish a two-set winning format.
 */
export function tennisTournamentForecast(rawEvent: unknown, rawTarget: unknown, now = Date.now()): TennisTournamentForecast | null {
  const event = row(rawEvent);
  const target = row(rawTarget);
  const targetId = text(target.id);
  const targetDate = Date.parse(text(target.date));
  const type = text(row(target.type).slug);
  if (!targetId || !Number.isFinite(targetDate) || row(row(target.status).type).state !== 'pre'
    || !['mens-singles', 'womens-singles'].includes(type) || (type === 'mens-singles' && event.major === true)) return null;
  const players = participants(target);
  if (!players) return null;
  const competitions = [...list(event.competitions), ...list(event.groupings).flatMap(group => list(row(group).competitions))].map(row);
  const byId = new Map(competitions.filter(competition => text(competition.id)).map(competition => [text(competition.id), competition]));
  const sourceTarget = byId.get(targetId);
  const sourcePlayers = sourceTarget ? participants(sourceTarget) : null;
  if (!sourceTarget || !sourcePlayers || sourcePlayers[0].id !== players[0].id || sourcePlayers[1].id !== players[1].id
    || text(sourceTarget.date) !== text(target.date) || text(row(sourceTarget.type).slug) !== type
    || row(row(sourceTarget.status).type).state !== 'pre') return null;
  const evidence: [TennisEvidence, TennisEvidence] = [
    { matches: 0, setsWon: 0, setsLost: 0 }, { matches: 0, setsWon: 0, setsLost: 0 }
  ];
  for (const competition of byId.values()) {
    const date = Date.parse(text(competition.date));
    if (text(row(competition.type).slug) !== type || !Number.isFinite(date) || date > now || date >= targetDate) continue;
    const completed = completedMatch(competition);
    if (!completed) continue;
    if (Math.max(...completed.sets) !== 2) return null;
    for (const side of [0, 1] as const) {
      const playerIndex = completed.ids.indexOf(text(players[side].id));
      if (playerIndex < 0) continue;
      evidence[side].matches++;
      evidence[side].setsWon += completed.sets[playerIndex];
      evidence[side].setsLost += completed.sets[1 - playerIndex];
    }
  }
  if (evidence.some(player => player.matches < 3)) return null;
  // Beta(1,1) smoothing: add one won and one lost set to each player's form.
  const rate = evidence.map(player => (player.setsWon + 1) / (player.setsWon + player.setsLost + 2));
  const homeWeight = rate[0] * (1 - rate[1]);
  const awayWeight = rate[1] * (1 - rate[0]);
  const p = homeWeight / (homeWeight + awayWeight); // log5 on set-win rates
  const q = 1 - p;
  const outcomes = [
    { home: 2, away: 0, probability: p * p },
    { home: 2, away: 1, probability: 2 * p * p * q },
    { home: 0, away: 2, probability: q * q },
    { home: 1, away: 2, probability: 2 * q * q * p }
  ];
  const best = outcomes.reduce((current, outcome) => outcome.probability > current.probability ? outcome : current);
  return {
    forecast: { ...best, probabilities: { home: p * p + 2 * p * p * q, draw: 0, away: q * q + 2 * q * q * p } },
    homeEvidence: evidence[0], awayEvidence: evidence[1],
    assumptions: [
      'Nur abgeschlossene Einzel dieses Turniers vor dem angesetzten Match; mindestens drei Matches je Spieler.',
      'Die Grundlage sind wenige Spiele: Die Stärke der bisherigen Gegner und frühere Turniere werden nicht berücksichtigt.',
      'Damit wenige Ergebnisse nicht zu einer sicheren Aussage führen, wird für die Rechnung bei beiden Spielern ein gewonnener und ein verlorener Satz zusätzlich angenommen.',
      'Bisherige abgeschlossene Spiele dieses Turniers wurden mit zwei gewonnenen Sätzen entschieden. Für jeden weiteren Satz wird dieselbe Gewinnchance angenommen; der bisherige Spielverlauf verändert sie nicht.',
      'Diese Schätzung wurde nicht anhand früherer Prognosen geprüft; die Prozentwerte sind keine belegte Trefferquote.'
    ]
  };
}

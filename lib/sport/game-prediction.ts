import { LIVE_SPORTS, parseLiveScoreboard, type LiveSport } from '@/lib/sport/live-scoreboard';
import { basketballScoreForecast, footballScoreForecast, type ScoreForecast, type ScoringResult } from '@/lib/sport/game-prediction-math';
import { tennisTournamentForecast } from '@/lib/sport/game-prediction-tennis';

export interface GamePrediction {
  sport: LiveSport;
  id: string;
  home: string;
  away: string;
  state: 'pre' | 'in' | 'post';
  kind: 'forecast' | 'actual' | 'unavailable';
  fetchedAt: string;
  sourceUpdatedAt: string | null;
  sourceScore: { home: string | null; away: string | null };
  score: { available: boolean; home?: number; away?: number; probability?: number; label: string; reason?: string };
  winner: { available: boolean; side?: 'home' | 'draw' | 'away'; name?: string; probability?: number; probabilities?: { home: number; draw?: number; away: number }; reason?: string };
  goalscorers: { available: boolean; players: { name: string; team: string; seasonGoals: number; appearances: number; lineupStatus: string; probability?: number }[]; reason?: string };
  analysis: string[];
  assumptions: string[];
  sources: { label: string; url: string; accessedAt: string; updatedAt?: string | null }[];
}

type Row = Record<string, unknown>;
const row = (value: unknown): Row => value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
const list = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const str = (value: unknown): string => typeof value === 'string' ? value : '';
const numeric = (value: unknown): number | null => (typeof value === 'number' || typeof value === 'string' && value.trim() !== '') && Number.isFinite(Number(value)) ? Number(value) : null;
const integer = (value: unknown): number | null => { const n = numeric(value); return n !== null && Number.isInteger(n) && n >= 0 ? n : null; };
const validDate = (value: unknown): string | null => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : null;
const API = 'https://site.api.espn.com/apis/site/v2/sports/';
const MAX_CACHE = 160;
const forecasts = new Map<string, { until: number; value: GamePrediction }>();
const pending = new Map<string, Promise<GamePrediction>>();
const providerCache = new Map<string, { until: number; value: unknown }>();
const providerPending = new Map<string, Promise<unknown>>();
const providerFetchedAt = new Map<string, string>();

export class GamePredictionError extends Error {
  constructor(public code: 'invalid_game' | 'provider_unavailable', public status: number, message: string) { super(message); }
}

export function parsePredictionRequest(sport: string, id: string): { sport: LiveSport; feed: string; eventId: string } | null {
  if (!Object.hasOwn(LIVE_SPORTS, sport)) return null;
  const match = /^([a-z]+\/[a-z0-9.]+):([1-9]\d{0,11})$/.exec(id);
  if (!match || !(LIVE_SPORTS[sport as LiveSport].feeds as readonly string[]).includes(match[1])) return null;
  return { sport: sport as LiveSport, feed: match[1], eventId: match[2] };
}

async function providerJson(url: string, ttl = 0): Promise<unknown> {
  const cached = providerCache.get(url);
  if (cached && cached.until > Date.now()) return cached.value;
  const running = providerPending.get(url);
  if (running) return running;
  const work = (async () => {
    const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(6500) });
    if (!response.ok) throw new GamePredictionError('provider_unavailable', 503, 'Die Sportdatenquelle ist gerade nicht erreichbar. Bitte erneut laden.');
    const value: unknown = await response.json();
    if (!value || typeof value !== 'object') throw new Error('invalid_provider_data');
    if (providerFetchedAt.size >= MAX_CACHE) providerFetchedAt.delete(providerFetchedAt.keys().next().value!);
    providerFetchedAt.set(url, new Date().toISOString());
    if (ttl > 0) {
      if (providerCache.size >= MAX_CACHE) providerCache.delete(providerCache.keys().next().value!);
      providerCache.set(url, { until: Date.now() + ttl, value });
    }
    return value;
  })();
  providerPending.set(url, work);
  try { return await work; } finally { providerPending.delete(url); }
}

/** Uses explicit home/away scores, never the provider's winner-first display score. */
export function parseRecentScoring(payload: unknown, teamId: string, eventId: string, startsAt: string, sport: LiveSport, now = Date.now()): ScoringResult[] {
  const group = list(row(payload).lastFiveGames).map(row).find(g => str(row(g.team).id) === teamId);
  const seen = new Set<string>();
  return list(group?.events).map(row).filter(e => {
    const date = validDate(e.gameDate);
    const id = str(e.id);
    if (!id || seen.has(id) || id === eventId || !date || Date.parse(date) > now || Date.parse(date) >= Date.parse(startsAt) || Date.parse(startsAt) - Date.parse(date) > 120 * 86400_000 || !['W', 'D', 'L'].includes(str(e.gameResult))) return false;
    seen.add(id);
    return true;
  }).sort((a, b) => str(b.gameDate).localeCompare(str(a.gameDate))).slice(0, 5).flatMap(e => {
    let home = integer(e.homeTeamScore); let away = integer(e.awayTeamScore);
    if (home === null || away === null || ![str(e.homeTeamId), str(e.awayTeamId)].includes(teamId)) return [];
    if (sport === 'hockey' && /\b(?:OT|SO)\b/i.test(str(e.score))) {
      // NHL overtime/shootout adds one decisive goal to a tied regulation score.
      if (Math.abs(home - away) !== 1) return [];
      if (home > away) home--; else away--;
    }
    const limit = sport === 'basketball' ? 200 : 15;
    if (home > limit || away > limit) return [];
    return str(e.homeTeamId) === teamId ? [{ for: home, against: away }] : [{ for: away, against: home }];
  });
}

/** A live forecast requires a supported regulation clock and fresh source data. */
export function remainingRegulationFraction(statusValue: unknown, sport: LiveSport): number | null {
  const status = row(statusValue); const type = row(status.type);
  const period = integer(status.period);
  const name = str(type.name);
  if (/DELAY|SUSPEND|POSTPON|CANCEL|PENALTY|SHOOTOUT|EXTRA_TIME|OVERTIME/i.test(name)) return null;
  if (sport === 'football') {
    if (period === null || period < 1 || period > 2) return null;
    if (/HALFTIME/i.test(name)) return .5;
    const clock = str(status.displayClock) || str(type.shortDetail);
    const match = /^(\d{1,2})(?:['′])?(?:\s*\+\s*(\d{1,2})(?:['′])?)?$/.exec(clock.trim());
    const seconds = numeric(status.clock);
    const minute = match ? Number(match[1]) + Number(match[2] || 0) : seconds !== null ? seconds / 60 : null;
    if (minute === null || minute < 0 || minute >= 90 || (period === 2 && minute < 45) || (period === 1 && minute > 60)) return null;
    return (90 - Math.min(minute, period === 1 ? 45 : 90)) / 90;
  }
  if (sport === 'basketball' || sport === 'hockey') {
    const periods = sport === 'basketball' ? 4 : 3; const minutes = sport === 'basketball' ? 12 : 20;
    if (period === null || period < 1 || period > periods) return null;
    const match = /^(\d{1,2}):(\d{2})(?:\.\d+)?$/.exec(str(status.displayClock));
    const seconds = match ? Number(match[1]) * 60 + Number(match[2]) : numeric(status.clock);
    if (seconds === null || seconds < 0 || seconds > minutes * 60 || match && Number(match[2]) > 59) return null;
    const remaining = ((periods - period) * minutes * 60 + seconds) / (periods * minutes * 60);
    return remaining > 0 ? remaining : null;
  }
  return null;
}

function setForecast(result: GamePrediction, forecast: ScoreForecast, label: string) {
  result.kind = 'forecast';
  result.assumptions.push('Die Prozentwerte sind Modellschätzungen; eine belegte Trefferquote liegt nicht vor.');
  result.score = { available: true, home: forecast.home, away: forecast.away, probability: forecast.probability, label };
  const probabilities = forecast.probabilities;
  const side = probabilities.home >= probabilities.draw && probabilities.home >= probabilities.away ? 'home' : probabilities.away >= probabilities.draw ? 'away' : 'draw';
  result.winner = { available: true, side, name: side === 'home' ? result.home : side === 'away' ? result.away : 'Unentschieden', probability: probabilities[side], probabilities };
}

function seasonStat(athlete: Row, name: string): number | null {
  const stats = list(row(row(athlete.statistics).splits).categories).flatMap(category => list(row(category).stats)).map(row);
  return integer(stats.find(stat => stat.name === name)?.value);
}

export function parseScorerCandidates(rosterValue: unknown, summaryValue: unknown, teamId: string, teamName: string, state: 'pre' | 'in' | 'post'): GamePrediction['goalscorers']['players'] {
  const roster = row(rosterValue); const summary = row(summaryValue); const season = row(row(summary.header).season);
  if (numeric(row(roster.season).year) !== numeric(season.year) || numeric(row(roster.season).type) !== numeric(season.type) || numeric(season.year) === null || numeric(season.type) === null) return [];
  const matchRoster = list(list(summary.rosters).map(row).find(r => str(row(r.team).id) === teamId)?.roster).map(row);
  const reported = matchRoster.some(player => player.starter === true);
  if (state === 'in' && !reported) return [];
  return list(roster.athletes).map(row).flatMap(athlete => {
    const id = str(athlete.id); const name = str(athlete.displayName);
    const goals = seasonStat(athlete, 'totalGoals'); const appearances = seasonStat(athlete, 'appearances');
    if (!id || !name || goals === null || goals < 1 || appearances === null || appearances < 1 || str(row(athlete.status).type) !== 'active' || list(athlete.injuries).length) return [];
    const lineup = matchRoster.find(player => str(row(player.athlete).id) === id);
    if (reported && (!lineup || lineup.active === false || lineup.subbedOut === true || (state === 'pre' ? lineup.starter !== true : lineup.starter !== true && lineup.subbedIn !== true))) return [];
    if (lineup && list(lineup.stats).map(row).some(stat => stat.name === 'redCards' && (numeric(stat.value) ?? 0) > 0)) return [];
    return [{ name, team: teamName, seasonGoals: goals, appearances, lineupStatus: reported ? state === 'in' ? 'Auf dem Platz gemeldet' : 'Startelf gemeldet' : 'Aufstellung offen' }];
  }).sort((a, b) => b.seasonGoals - a.seasonGoals || b.seasonGoals / b.appearances - a.seasonGoals / a.appearances).slice(0, 2);
}

async function getSummary(sport: LiveSport, feed: string, eventId: string): Promise<{ data: unknown; url: string }> {
  if (sport !== 'tennis') {
    const url = `${API}${feed}/summary?event=${eventId}`;
    return { data: await providerJson(url), url };
  }
  // ESPN tennis scoreboard IDs belong to individual matches; its summary API expects tournaments.
  const url = `${API}${feed}/scoreboard?limit=100`;
  const data = await providerJson(url, 20_000);
  const game = parseLiveScoreboard(data, feed).find(g => g.id === `${feed}:${eventId}`);
  for (const e of list(row(data).events).map(row)) {
    const competition = [...list(e.competitions), ...list(e.groupings).flatMap(g => list(row(g).competitions))].map(row).find(c => str(c.id) === eventId);
    if (competition && game) return { url, data: { header: { id: eventId, competitions: [{ ...competition, status: competition.status ?? e.status }] }, parsedTennis: game, tennisTournament: e } };
  }
  throw new GamePredictionError('provider_unavailable', 503, 'Für dieses Tennismatch liefert die Quelle gerade keine überprüfbaren Daten.');
}

async function createPrediction(sport: LiveSport, feed: string, eventId: string, id: string): Promise<GamePrediction> {
  const { data: value, url } = await getSummary(sport, feed, eventId);
  const data = row(value); const header = row(data.header);
  const competition = list(header.competitions).map(row).find(c => str(c.id) === eventId);
  if (!competition || str(header.id) !== eventId) throw new GamePredictionError('provider_unavailable', 503, 'Die Quelle konnte dieses Spiel nicht eindeutig bestätigen.');
  const expectedTopic = `gp-${feed.replace('/', '-')}-${eventId}`;
  const topic = str(row(data.meta).gp_topic);
  const leagueSlug = str(row(header.league).slug);
  if (topic && topic !== expectedTopic || leagueSlug && leagueSlug !== feed.split('/')[1]) throw new GamePredictionError('invalid_game', 400, 'Spiel und Liga passen nicht zusammen.');
  const status = row(competition.status); const type = row(status.type);
  const competitors = list(competition.competitors).map(row);
  const home = competitors.find(c => c.homeAway === 'home') ?? competitors[0]; const away = competitors.find(c => c.homeAway === 'away') ?? competitors[1];
  const name = (c: Row) => str(row(c.team).displayName) || str(row(c.athlete).displayName);
  const state = str(type.state);
  const startsAt = validDate(competition.date);
  if (!home || !away || !name(home) || !name(away) || !['pre', 'in', 'post'].includes(state) || !startsAt) throw new GamePredictionError('provider_unavailable', 503, 'Die Quelle liefert unvollständige Spieldaten.');
  const fetchedAt = new Date().toISOString();
  const tennisGame = row(data.parsedTennis);
  const scoreOf = (c: Row) => integer(c.score) ?? integer(row(c.score).displayValue);
  const homeScore = sport === 'tennis' ? integer(tennisGame.homeScore) : scoreOf(home);
  const awayScore = sport === 'tennis' ? integer(tennisGame.awayScore) : scoreOf(away);
  const result: GamePrediction = {
    sport, id, home: name(home), away: name(away), state: state as GamePrediction['state'], kind: 'unavailable', fetchedAt,
    sourceUpdatedAt: validDate(row(data.meta).lastUpdatedAt),
    sourceScore: { home: state === 'pre' || homeScore === null ? null : String(homeScore), away: state === 'pre' || awayScore === null ? null : String(awayScore) },
    score: { available: false, label: 'Mögliches Endergebnis', reason: 'Es fehlen genügend überprüfbare Ergebnisse für eine genaue Ergebnisprognose.' },
    winner: { available: false, reason: 'Aus den verfügbaren Daten lässt sich kein belastbarer Favorit ableiten.' },
    goalscorers: { available: false, players: [], reason: sport === 'football' ? 'Keine bestätigten Saisontore mit passender Spielerliste verfügbar.' : 'Torschützen werden nur für Fußball ausgewertet.' },
    analysis: [], assumptions: [], sources: [{ label: 'ESPN · Spieldaten und letzte Ergebnisse', url, accessedAt: providerFetchedAt.get(url) ?? fetchedAt, updatedAt: validDate(row(data.meta).lastUpdatedAt) }]
  };
  if (state === 'post') {
    if (type.completed !== true && !/FINAL|FULL_TIME/i.test(str(type.name))) {
      result.score.reason = 'Das Spiel ist unterbrochen, abgesagt oder nicht als beendet bestätigt.';
      result.winner.reason = result.score.reason;
      result.analysis.push(result.score.reason);
      return result;
    }
    if (homeScore !== null && awayScore !== null) {
      result.kind = 'actual';
      result.score = { available: true, home: homeScore, away: awayScore, label: sport === 'tennis' ? 'Endergebnis in Sätzen' : 'Endergebnis' };
      const side = home.winner === true ? 'home' : away.winner === true ? 'away' : homeScore > awayScore ? 'home' : awayScore > homeScore ? 'away' : 'draw';
      result.winner = { available: true, side, name: side === 'home' ? result.home : side === 'away' ? result.away : 'Unentschieden' };
      result.analysis.push('Das Spiel ist beendet. Angezeigt wird das von ESPN gemeldete Ergebnis.');
      result.goalscorers.reason = sport === 'football' ? 'Eine geprüfte Liste der tatsächlichen Torschützen liegt für dieses Spiel nicht vor.' : result.goalscorers.reason;
    }
    return result;
  }
  const sourceTime = result.sourceUpdatedAt ? Date.parse(result.sourceUpdatedAt) : null;
  const remaining = state === 'in' ? remainingRegulationFraction(status, sport) : 1;
  // Football's lastUpdatedAt can remain at the last reported play while its
  // clock advances. Keep a bounded window covering those observed update gaps.
  const maxSourceAge = sport === 'football' ? 5 * 60_000 : 2 * 60_000;
  const freshLive = sourceTime !== null && Date.now() - sourceTime <= maxSourceAge && sourceTime - Date.now() <= 60_000;
  const liveValid = state !== 'in' || remaining !== null && homeScore !== null && awayScore !== null && freshLive;
  if (!liveValid) {
    const reason = !freshLive ? `Für eine Liveprognose fehlt ein ausreichend aktueller Zeitstempel der Quelle (höchstens ${sport === 'football' ? 'fünf' : 'zwei'} Minuten alt).` : 'Für diese Spielphase fehlt eine verlässliche Restspielzeit oder ein bestätigter Spielstand.';
    result.score.reason = reason; result.winner.reason = reason; result.goalscorers.reason = reason; result.analysis.push(reason);
    return result;
  }
  if (state === 'in' && sourceTime !== null && Date.now() - sourceTime > 120_000) result.analysis.push('Der letzte von ESPN gemeldete Datenstand liegt mehr als zwei Minuten zurück. Zwischenzeitliche Änderungen sind möglich; der genaue Zeitpunkt steht unter dieser Einschätzung.');
  if (sport === 'tennis') {
    const evidence = tennisTournamentForecast(data.tennisTournament, competition);
    if (evidence) {
      setForecast(result, evidence.forecast, 'Mögliches Endergebnis in Sätzen');
      if (Math.abs(evidence.forecast.probabilities.home - evidence.forecast.probabilities.away) < .001) result.winner.name = 'Offen – beide Spieler gleichauf';
      result.analysis.push(`${result.home}: ${evidence.homeEvidence.matches} abgeschlossene Einzel in diesem Turnier, ${evidence.homeEvidence.setsWon}:${evidence.homeEvidence.setsLost} Sätze.`, `${result.away}: ${evidence.awayEvidence.matches} abgeschlossene Einzel in diesem Turnier, ${evidence.awayEvidence.setsWon}:${evidence.awayEvidence.setsLost} Sätze.`);
      result.assumptions.push(...evidence.assumptions);
    } else {
      result.score.reason = 'Es fehlen mindestens drei vollständig beendete Einzel je Spieler und ein überprüfbares Satzformat im selben Turnier.';
      result.winner.reason = 'Die Turnierdaten reichen für eine vergleichbare Siegprognose nicht aus.';
      result.analysis.push('Aktuelle Spielergebnisse sind verfügbar; die Datengrundlage reicht für eine Tennisprognose nicht aus.');
    }
    const rankingUrl = `${API}${feed}/rankings`;
    try {
      const rankings = row(list(row(await providerJson(rankingUrl, 6 * 60 * 60_000)).rankings)[0]);
      const updatedAt = validDate(rankings.update);
      if (updatedAt && Date.now() - Date.parse(updatedAt) <= 21 * 86400_000 && Date.parse(updatedAt) <= Date.now() + 60_000) {
        const ranks = list(rankings.ranks).map(row);
        const rankOf = (c: Row) => integer(ranks.find(rank => str(row(rank.athlete).id) === (str(c.id) || str(row(c.athlete).id)))?.current);
        const homeRank = rankOf(home); const awayRank = rankOf(away);
        if (homeRank && awayRank) {
          result.analysis.push(`Weltrangliste (${new Date(updatedAt).toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin' })}): ${result.home} Nr. ${homeRank}, ${result.away} Nr. ${awayRank}. Der Rang dient zur Einordnung und verändert die berechneten Satzchancen nicht.`);
          result.sources.push({ label: `ESPN · ${feed.endsWith('atp') ? 'ATP' : 'WTA'}-Weltrangliste`, url: rankingUrl, accessedAt: providerFetchedAt.get(rankingUrl) ?? fetchedAt, updatedAt });
        }
      }
    } catch { /* Rankings are optional context; do not discard verified tournament results. */ }
    result.fetchedAt = new Date().toISOString();
    return result;
  }
  const homeId = str(home.id) || str(row(home.team).id); const awayId = str(away.id) || str(row(away.team).id);
  const homeRecent = parseRecentScoring(data, homeId, eventId, startsAt, sport); const awayRecent = parseRecentScoring(data, awayId, eventId, startsAt, sport);
  const mean = (games: ScoringResult[], key: 'for' | 'against') => games.reduce((sum, game) => sum + game[key], 0) / games.length;
  const liveRedCard = state === 'in' && sport === 'football' && (list(competition.details).some(detail => row(detail).redCard === true) || list(data.rosters).flatMap(roster => list(row(roster).roster)).some(player => list(row(player).stats).some(stat => row(stat).name === 'redCards' && (numeric(row(stat).value) ?? 0) > 0)));
  if (liveRedCard) {
    result.score.reason = 'Es wurde ein Platzverweis gemeldet. Für die veränderte Spielsituation reichen die bisherigen Torquoten nicht aus.';
    result.winner.reason = result.score.reason;
    result.analysis.push('Wegen des gemeldeten Platzverweises wird keine Liveprognose für Ergebnis oder Sieger berechnet.');
  } else if (homeRecent.length >= 3 && awayRecent.length >= 3) {
    const homeRate = (mean(homeRecent, 'for') + mean(awayRecent, 'against')) / 2;
    const awayRate = (mean(awayRecent, 'for') + mean(homeRecent, 'against')) / 2;
    const forecast = sport === 'basketball' ? basketballScoreForecast(homeRecent, awayRecent, state === 'in' ? { home: homeScore!, away: awayScore!, remainingFraction: remaining! } : undefined) : homeRate > 0 && awayRate > 0 ? footballScoreForecast(homeRate * remaining!, awayRate * remaining!, state === 'in' ? homeScore! : 0, state === 'in' ? awayScore! : 0) : null;
    if (forecast) setForecast(result, forecast, sport === 'football' ? 'Mögliches Endergebnis (90 Minuten)' : sport === 'hockey' ? 'Möglicher Stand nach 60 Minuten' : 'Mögliches Endergebnis');
    else {
      result.score.reason = sport === 'basketball' ? 'Die bisherigen Ergebnisse zeigen zu wenig Unterschiede oder umfassen weniger als fünf Spiele je Team. Daraus wird keine genaue Ergebniswahrscheinlichkeit abgeleitet.' : 'Die wenigen bisherigen Spiele ergeben für mindestens ein Team null erwartete Tore oder einen unplausiblen Wert. Daraus wird keine genaue Ergebniswahrscheinlichkeit abgeleitet.';
      result.winner.reason = result.score.reason;
    }
    result.analysis.push(`${result.home}: ${homeRecent.length} letzte abgeschlossene Spiele, im Schnitt ${mean(homeRecent, 'for').toFixed(1)} ${sport === 'basketball' ? 'Punkte' : 'Tore'} erzielt und ${mean(homeRecent, 'against').toFixed(1)} zugelassen.`, `${result.away}: ${awayRecent.length} letzte abgeschlossene Spiele, im Schnitt ${mean(awayRecent, 'for').toFixed(1)} ${sport === 'basketball' ? 'Punkte' : 'Tore'} erzielt und ${mean(awayRecent, 'against').toFixed(1)} zugelassen.`);
    result.assumptions.push('Die Grundlage sind wenige jüngste Spiele, teils aus verschiedenen Wettbewerben. Gegnerstärke und Heimvorteil werden nicht gesondert berücksichtigt.');
    result.assumptions.push(sport === 'basketball' ? 'Die zuletzt erzielten und zugelassenen Punkte sowie ihre Schwankungen bilden die Grundlage. Mögliche Punktzahlen werden für beide Teams getrennt berechnet. Ein Unentschieden am Spielende wird ausgeschlossen; Verlängerungen werden nicht eigens berechnet.' : 'Eigene erzielte Tore und die zugelassenen Tore des Gegners zählen gleich stark. Die Rechnung berücksichtigt nicht, ob ein Tor die Spielweise danach verändert. Ein genaues Ergebnis bleibt eines von vielen möglichen Szenarien.');
    if (sport === 'football') result.assumptions.push('Die Prognose gilt für 90 Minuten; Nachspielzeit, Verlängerung und Elfmeterschießen werden nicht gesondert modelliert.');
    if (sport === 'hockey') result.assumptions.push('Ergebnis und Sieg/Remis/Niederlage gelten nach 60 Minuten. Mit OT/SO markierte Ein-Tor-Endstände werden auf den Gleichstand nach regulärer Spielzeit zurückgeführt.');
  } else result.analysis.push(`Zu wenig aktuelle Ergebnisse: ${result.home} ${homeRecent.length}, ${result.away} ${awayRecent.length}; mindestens drei je Team sind erforderlich (Basketball: fünf).`);
  if (state === 'in') {
    result.analysis.push(`Livebasis: ${homeScore}:${awayScore}, ${str(status.displayClock) || str(type.shortDetail)}. ${result.score.available ? 'Der aktuelle Stand bleibt erhalten; geschätzt wird nur, was in der verbleibenden regulären Spielzeit noch hinzukommt.' : 'Diese Daten dienen zur Einordnung; eine genaue Ergebnisprognose liegt nicht vor.'}`);
    if (result.score.available) result.assumptions.push('Die Rechnung schätzt nur, was in der verbleibenden regulären Spielzeit noch hinzukommen könnte. Verändertes Tempo und neue Taktik werden dabei nicht eingerechnet.');
  }
  // ESPN's pregame Matchup Predictor is a separate, attributed winner estimate.
  const predictor = row(data.predictor); const predictorHome = row(predictor.homeTeam); const predictorAway = row(predictor.awayTeam);
  const pHome = numeric(predictorHome.gameProjection); const pAway = numeric(predictorAway.gameProjection);
  if (state === 'pre' && sport === 'basketball' && str(predictorHome.id) === homeId && str(predictorAway.id) === awayId && pHome !== null && pAway !== null && pHome >= 0 && pAway >= 0 && Math.abs(pHome + pAway - 100) <= 1) {
    const total = pHome + pAway; const side = pHome >= pAway ? 'home' : 'away';
    result.winner = { available: true, side, name: side === 'home' ? result.home : result.away, probability: Math.max(pHome, pAway) / total, probabilities: { home: pHome / total, away: pAway / total } };
    result.kind = 'forecast'; result.analysis.push('Die Siegchance stammt aus der ESPN-Spielprognose; die Schätzung des Endstands wird separat aus den letzten Spielen berechnet.');
    if (!result.score.available) result.assumptions.push('Die ESPN-Siegchance liefert keine Wahrscheinlichkeit für einen konkreten Endstand. Eine belegte Trefferquote liegt nicht vor.');
  }
  if (sport === 'football') {
    const season = row(header.season); const year = integer(season.year); const seasonType = integer(season.type);
    if (year && seasonType && /^\d+$/.test(homeId) && /^\d+$/.test(awayId)) {
      const requests = [{ teamId: homeId, teamName: result.home }, { teamId: awayId, teamName: result.away }].map(team => ({ ...team, url: `${API}${feed}/teams/${team.teamId}/roster?season=${year}&seasontype=${seasonType}` }));
      const rosters = await Promise.allSettled(requests.map(async request => ({ ...request, roster: await providerJson(request.url, 10 * 60_000) })));
      for (const fetched of rosters) if (fetched.status === 'fulfilled') {
        const { roster, teamId, teamName, url: rosterUrl } = fetched.value;
        result.goalscorers.players.push(...parseScorerCandidates(roster, data, teamId, teamName, state as GamePrediction['state']));
        result.sources.push({ label: `ESPN · ${teamName} · Saisontore und Kader`, url: rosterUrl, accessedAt: providerFetchedAt.get(rosterUrl) ?? new Date().toISOString(), updatedAt: validDate(row(roster).timestamp) });
      }
      result.goalscorers.available = result.goalscorers.players.length > 0;
      if (result.goalscorers.available) {
        delete result.goalscorers.reason;
        result.assumptions.push('Torschützenkandidaten werden nach gemeldeten Saisontoren sortiert. Das ist keine individuelle Torwahrscheinlichkeit. Gemeldete Bankspieler, ausgewechselte Spieler, Platzverweise und bekannte Verletzungen werden ausgeschlossen; ohne Aufstellung bleibt der Einsatz offen.');
      }
    }
  }
  if (result.kind === 'unavailable' && result.goalscorers.available) result.kind = 'forecast';
  result.fetchedAt = new Date().toISOString();
  return result;
}

export async function getGamePrediction(sportInput: string, id: string): Promise<GamePrediction> {
  const request = parsePredictionRequest(sportInput, id);
  if (!request) throw new GamePredictionError('invalid_game', 400, 'Unbekannte Sportart, Liga oder ungültige Spiel-ID.');
  const key = `${sportInput}:${id}`; const cached = forecasts.get(key);
  if (cached && cached.until > Date.now()) return cached.value;
  const active = pending.get(key); if (active) return active;
  const work = createPrediction(request.sport, request.feed, request.eventId, id);
  pending.set(key, work);
  try {
    const result = await work;
    if (forecasts.size >= MAX_CACHE) forecasts.delete(forecasts.keys().next().value!);
    forecasts.set(key, { until: Date.now() + (result.state === 'in' ? 20_000 : result.state === 'post' ? 10 * 60_000 : 60_000), value: result });
    return result;
  } catch (error) {
    if (error instanceof GamePredictionError) throw error;
    throw new GamePredictionError('provider_unavailable', 503, 'Die Sportdatenquelle liefert gerade keine überprüfbaren Daten. Bitte erneut laden.');
  } finally { pending.delete(key); }
}

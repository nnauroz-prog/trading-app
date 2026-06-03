import type { Fixture } from '@/lib/sport/fetcher';

export interface VenueSplitForm {
  homeOnlyWinPct: number; // 0..1
  homeOnlyGoalRatio: number; // Tore/Spiel zu Hause
  awayOnlyWinPct: number;
  awayOnlyGoalRatio: number;
  homeGames: number;
  awayGames: number;
}

// Trennt Heim- und Auswärts-Form. Manche Teams sind extrem heimstark
// (Atlético Madrid in den 2010ern, Bayer in der Bundes-Heimbilanz) — eine
// kombinierte Form-Zahl versteckt das.
export function computeVenueSplit(team: string, finishedPool: Fixture[]): VenueSplitForm {
  let homeWins = 0, homeGames = 0, homeGoalsFor = 0;
  let awayWins = 0, awayGames = 0, awayGoalsFor = 0;
  for (const f of finishedPool) {
    if (f.homeScore === null || f.awayScore === null) continue;
    if (f.homeTeam === team) {
      homeGames++;
      homeGoalsFor += f.homeScore;
      if (f.homeScore > f.awayScore) homeWins++;
    } else if (f.awayTeam === team) {
      awayGames++;
      awayGoalsFor += f.awayScore;
      if (f.awayScore > f.homeScore) awayWins++;
    }
  }
  return {
    homeOnlyWinPct: homeGames > 0 ? homeWins / homeGames : 0,
    homeOnlyGoalRatio: homeGames > 0 ? homeGoalsFor / homeGames : 0,
    awayOnlyWinPct: awayGames > 0 ? awayWins / awayGames : 0,
    awayOnlyGoalRatio: awayGames > 0 ? awayGoalsFor / awayGames : 0,
    homeGames,
    awayGames
  };
}

export interface RestDaysInfo {
  daysSinceLastGame: number | null;
  // ≤ 3 Tage = harte Belastung, 4-5 = normal, 6+ = ausgeruht
  restCategory: 'short' | 'normal' | 'long' | 'unknown';
}

// Ruhetage seit letztem Spiel. Mannschaften mit < 4 Tagen Pause verlieren
// statistisch deutlich häufiger als ausgeruhte Gegner.
export function computeRestDays(team: string, fixtureDate: string, finishedPool: Fixture[]): RestDaysInfo {
  const previous = finishedPool
    .filter((f) => (f.homeTeam === team || f.awayTeam === team) && f.date < fixtureDate)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!previous) return { daysSinceLastGame: null, restCategory: 'unknown' };
  const diffMs = new Date(fixtureDate + 'T12:00:00Z').getTime() - new Date(previous.date + 'T12:00:00Z').getTime();
  const days = Math.round(diffMs / 86_400_000);
  const cat: RestDaysInfo['restCategory'] = days <= 3 ? 'short' : days <= 5 ? 'normal' : 'long';
  return { daysSinceLastGame: days, restCategory: cat };
}

export interface FormTrend {
  recent3pts: number;
  earlier3pts: number;
  // > 0 = besser werdend, < 0 = absteigend
  delta: number;
  direction: 'up' | 'down' | 'flat';
}

// Trend-Erkennung: nicht nur die letzten 5 als Block, sondern Frühphase
// vs Spätphase. Aufsteigende Form ist wertvoller als Punktsumme allein.
export function computeFormTrend(team: string, finishedPool: Fixture[]): FormTrend {
  const games = finishedPool
    .filter((f) => f.homeScore !== null && f.awayScore !== null && (f.homeTeam === team || f.awayTeam === team))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6)
    .reverse(); // chronologisch
  if (games.length < 4) return { recent3pts: 0, earlier3pts: 0, delta: 0, direction: 'flat' };
  function pts(slice: Fixture[]): number {
    let p = 0;
    for (const g of slice) {
      const my = g.homeTeam === team ? (g.homeScore ?? 0) : (g.awayScore ?? 0);
      const opp = g.homeTeam === team ? (g.awayScore ?? 0) : (g.homeScore ?? 0);
      if (my > opp) p += 3;
      else if (my === opp) p += 1;
    }
    return p;
  }
  const earlier = games.slice(0, Math.floor(games.length / 2));
  const recent = games.slice(Math.floor(games.length / 2));
  const recent3pts = pts(recent);
  const earlier3pts = pts(earlier);
  const delta = recent3pts - earlier3pts;
  return {
    recent3pts,
    earlier3pts,
    delta,
    direction: delta >= 2 ? 'up' : delta <= -2 ? 'down' : 'flat'
  };
}

export interface DefensiveStability {
  cleanSheetPct: number;
  goalsConcededPerGame: number;
  // Standardabweichung der Gegentore = wie konstant
  stdDev: number;
  games: number;
}

// Wie konstant lässt die Mannschaft Tore zu? Eine Verteidigung die mal 0 mal 4
// kassiert ist weniger verlässlich als eine die konstant 1 zulässt.
export function computeDefensiveStability(team: string, finishedPool: Fixture[]): DefensiveStability {
  const games = finishedPool.filter((f) => f.homeScore !== null && f.awayScore !== null && (f.homeTeam === team || f.awayTeam === team));
  if (games.length === 0) return { cleanSheetPct: 0, goalsConcededPerGame: 0, stdDev: 0, games: 0 };
  const conceded: number[] = [];
  let cleanSheets = 0;
  for (const g of games) {
    const opp = g.homeTeam === team ? (g.awayScore ?? 0) : (g.homeScore ?? 0);
    conceded.push(opp);
    if (opp === 0) cleanSheets++;
  }
  const mean = conceded.reduce((a, b) => a + b, 0) / conceded.length;
  const variance = conceded.reduce((acc, x) => acc + (x - mean) ** 2, 0) / conceded.length;
  return {
    cleanSheetPct: cleanSheets / games.length,
    goalsConcededPerGame: mean,
    stdDev: Math.sqrt(variance),
    games: games.length
  };
}

export interface OffensiveConsistency {
  scoringRate: number; // Tore/Spiel
  scoreInEveryGamePct: number; // wie oft überhaupt getroffen
  stdDev: number;
  games: number;
}

// Wie konstant trifft das Team? Eine Offensive die alle drei Spiele explodiert
// und dazwischen leer ausgeht, ist schwerer zu tippen als eine konstante.
export function computeOffensiveConsistency(team: string, finishedPool: Fixture[]): OffensiveConsistency {
  const games = finishedPool.filter((f) => f.homeScore !== null && f.awayScore !== null && (f.homeTeam === team || f.awayTeam === team));
  if (games.length === 0) return { scoringRate: 0, scoreInEveryGamePct: 0, stdDev: 0, games: 0 };
  const scored: number[] = [];
  let gamesWithGoal = 0;
  for (const g of games) {
    const my = g.homeTeam === team ? (g.homeScore ?? 0) : (g.awayScore ?? 0);
    scored.push(my);
    if (my > 0) gamesWithGoal++;
  }
  const mean = scored.reduce((a, b) => a + b, 0) / scored.length;
  const variance = scored.reduce((acc, x) => acc + (x - mean) ** 2, 0) / scored.length;
  return {
    scoringRate: mean,
    scoreInEveryGamePct: gamesWithGoal / games.length,
    stdDev: Math.sqrt(variance),
    games: games.length
  };
}

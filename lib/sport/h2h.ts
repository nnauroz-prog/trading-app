import type { Fixture } from '@/lib/sport/fetcher';

export interface HeadToHeadResult {
  meetings: number;
  homeTeam: string;
  awayTeam: string;
  // From the perspective of the upcoming match's home team.
  winsForHome: number;
  draws: number;
  winsForAway: number;
  goalsForHome: number;
  goalsForAway: number;
  // Venue-spezifisch: Begegnungen, in denen das KOMMENDE Heim-Team auch
  // damals zuhause war (gleiche Konstellation wie jetzt). Das ist der
  // ehrlichere Indikator als die symmetrische Bilanz, weil Heimvorteil
  // ueber alle Liga-Spiele hinweg ~50 % der Punkte tragen kann.
  atHomeVenue: {
    meetings: number;
    winsForHome: number;
    draws: number;
    winsForAway: number;
    goalsForHome: number;
    goalsForAway: number;
  };
  // Letzte 5 Begegnungen — neueste zuerst. Form-Trend ist oft aussagekraeftiger
  // als die Lebenslang-Bilanz.
  recent5: {
    meetings: number;
    winsForHome: number;
    draws: number;
    winsForAway: number;
    goalsForHome: number;
    goalsForAway: number;
  };
  lastMeeting: {
    date: string;
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
  } | null;
}

// Modifier auf die Lambda-Erwartung des Predictors basierend auf der venue-
// spezifischen H2H plus dem Recency-Form-Trend. Reine Funktion. Liefert
// einen Multiplier in 0.85..1.15 (max ±15 %) und einen Klartext-Grund.
//
// Heuristik in Klartext:
//   - Wenn das aktuelle Heim-Team in den eigenen Heim-Begegnungen gegen
//     diesen Gegner historisch DOMINIERT hat (≥ 4 Begegnungen, ≥ 70 % Punkte
//     aus Heim-Sicht), erhoehen wir lambdaHome um bis zu 10 %.
//   - Wenn umgekehrt der Gast in den eigenen Heim-Begegnungen jenseits der
//     ELO-Erwartung gewonnen hat → Heim-Multiplier sinkt.
//   - Recency-Form-Trend (letzte ≤ 5 Duelle) bekommt halbes Gewicht.
export interface H2hModifier {
  homeMultiplier: number; // auf lambdaHome
  awayMultiplier: number; // auf lambdaAway
  factors: string[];      // Klartext der Begruendung
}

const NEUTRAL_MOD: H2hModifier = { homeMultiplier: 1, awayMultiplier: 1, factors: [] };

export function computeH2hModifier(h2h: HeadToHeadResult): H2hModifier {
  const factors: string[] = [];
  let homeMul = 1;
  let awayMul = 1;

  // Venue-spezifisch: nur das aussagekraeftig, wenn ≥ 3 Heim-Begegnungen.
  if (h2h.atHomeVenue.meetings >= 3) {
    const totalGames = h2h.atHomeVenue.meetings;
    const homePoints = h2h.atHomeVenue.winsForHome * 3 + h2h.atHomeVenue.draws;
    const maxPoints = totalGames * 3;
    const homePtsShare = maxPoints > 0 ? homePoints / maxPoints : 0.5;
    // 50 % Punkt-Anteil ist neutral. ≥ 70 % schiebt Heim hoch.
    if (homePtsShare >= 0.7) {
      homeMul *= 1.1;
      awayMul *= 0.95;
      factors.push(`Heimvorteil bestaetigt: ${h2h.atHomeVenue.winsForHome}/${totalGames} Heim-Siege gegen diesen Gegner`);
    } else if (homePtsShare <= 0.25) {
      homeMul *= 0.9;
      awayMul *= 1.05;
      factors.push(`Heim-Schwaeche gegen diesen Gegner: nur ${h2h.atHomeVenue.winsForHome}/${totalGames} eigene Heim-Siege`);
    }
  }

  // Recency-Trend: halbes Gewicht.
  if (h2h.recent5.meetings >= 3) {
    const recentHomeShare = h2h.recent5.meetings > 0
      ? (h2h.recent5.winsForHome + 0.5 * h2h.recent5.draws) / h2h.recent5.meetings
      : 0.5;
    if (recentHomeShare >= 0.7) {
      homeMul *= 1.05;
      awayMul *= 0.97;
      factors.push(`Aktueller Trend pro Heim: ${h2h.recent5.winsForHome} Siege in den letzten ${h2h.recent5.meetings} Duellen`);
    } else if (recentHomeShare <= 0.3) {
      homeMul *= 0.97;
      awayMul *= 1.05;
      factors.push(`Aktueller Trend pro Auswaerts: ${h2h.recent5.winsForAway} Siege in den letzten ${h2h.recent5.meetings} Duellen`);
    }
  }

  // Clamp auf ±15 % zur Sicherheit (falls beide Signale gleichzeitig stark).
  homeMul = Math.max(0.85, Math.min(1.15, homeMul));
  awayMul = Math.max(0.85, Math.min(1.15, awayMul));
  if (factors.length === 0) return NEUTRAL_MOD;
  return { homeMultiplier: homeMul, awayMultiplier: awayMul, factors };
}

// Walks the supplied finished fixtures and pulls every direct duel between the
// two teams (Heim/Auswärts vertauscht oder nicht). Pure + deterministisch.
export function computeHeadToHead(
  homeTeam: string,
  awayTeam: string,
  finished: Fixture[]
): HeadToHeadResult {
  const duels = finished
    .filter(
      (f) =>
        f.status === 'finished' &&
        f.homeScore !== null &&
        f.awayScore !== null &&
        ((f.homeTeam === homeTeam && f.awayTeam === awayTeam) ||
          (f.homeTeam === awayTeam && f.awayTeam === homeTeam))
    )
    .sort((a, b) => b.date.localeCompare(a.date));

  let winsForHome = 0;
  let draws = 0;
  let winsForAway = 0;
  let goalsForHome = 0;
  let goalsForAway = 0;
  const atHomeVenue = { meetings: 0, winsForHome: 0, draws: 0, winsForAway: 0, goalsForHome: 0, goalsForAway: 0 };
  const recent5 = { meetings: 0, winsForHome: 0, draws: 0, winsForAway: 0, goalsForHome: 0, goalsForAway: 0 };

  duels.forEach((d, idx) => {
    const hs = d.homeScore ?? 0;
    const as = d.awayScore ?? 0;
    const isUpcomingHomeAtHome = d.homeTeam === homeTeam;
    const homePerspectiveGoals = isUpcomingHomeAtHome ? hs : as;
    const awayPerspectiveGoals = isUpcomingHomeAtHome ? as : hs;
    goalsForHome += homePerspectiveGoals;
    goalsForAway += awayPerspectiveGoals;
    const homeWon = (isUpcomingHomeAtHome && hs > as) || (!isUpcomingHomeAtHome && as > hs);
    const isDraw = hs === as;
    if (isDraw) draws++;
    else if (homeWon) winsForHome++;
    else winsForAway++;

    // Venue-spezifisch: nur Duelle zaehlen, in denen das KOMMENDE Heim-Team
    // tatsaechlich auch damals daheim war.
    if (isUpcomingHomeAtHome) {
      atHomeVenue.meetings++;
      atHomeVenue.goalsForHome += homePerspectiveGoals;
      atHomeVenue.goalsForAway += awayPerspectiveGoals;
      if (isDraw) atHomeVenue.draws++;
      else if (homeWon) atHomeVenue.winsForHome++;
      else atHomeVenue.winsForAway++;
    }

    // Recent: erste 5 Eintraege (duels sind bereits desc sortiert).
    if (idx < 5) {
      recent5.meetings++;
      recent5.goalsForHome += homePerspectiveGoals;
      recent5.goalsForAway += awayPerspectiveGoals;
      if (isDraw) recent5.draws++;
      else if (homeWon) recent5.winsForHome++;
      else recent5.winsForAway++;
    }
  });

  const last = duels[0];
  return {
    meetings: duels.length,
    homeTeam,
    awayTeam,
    winsForHome,
    draws,
    winsForAway,
    goalsForHome,
    goalsForAway,
    atHomeVenue,
    recent5,
    lastMeeting: last
      ? {
          date: last.date,
          homeTeam: last.homeTeam,
          awayTeam: last.awayTeam,
          homeScore: last.homeScore ?? 0,
          awayScore: last.awayScore ?? 0
        }
      : null
  };
}

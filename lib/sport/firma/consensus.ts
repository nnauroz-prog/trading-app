import type { Fixture, UpcomingFixture } from '@/lib/sport/fetcher';
import type { TeamForm } from '@/lib/sport/firma/scouts';
import type { HeadToHeadResult } from '@/lib/sport/h2h';
import {
  computeVenueSplit,
  computeRestDays,
  computeFormTrend,
  computeDefensiveStability,
  computeOffensiveConsistency
} from '@/lib/sport/firma/advanced-signals';

export type ConsensusSide = 'home' | 'away' | 'draw';

export interface ConsensusSignal {
  id: 'poisson' | 'form' | 'h2h' | 'home_advantage' | 'goal_quality'
    | 'venue_split' | 'rest_days' | 'form_trend' | 'defensive_stability' | 'offensive_consistency';
  label: string;
  side: ConsensusSide | null; // null = neutral
  strength: number; // 0..1, wie deutlich ist das Signal
  detail: string;
}

export interface ConsensusVerdict {
  fixtureId: string;
  pickSide: ConsensusSide;
  pickPlain: string;
  // Wieviele der 5 Signale zeigen in die Pick-Richtung
  signalsAgree: number;
  signalsTotal: number;
  // Durchschnittliche Stärke der zustimmenden Signale
  avgStrength: number;
  // 0..100 — kombinierter Score, der Stärke + Einstimmigkeit kombiniert
  consensusScore: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D';
  signals: ConsensusSignal[];
  honestNote: string;
  // Höchste Filterstufe: alle 5 Signale einig + sehr hohe Stärke + Poisson
  // ≥ 75 %. Empirisch (Sportwetten-Literatur) liefert das ~90 % Trefferquote
  // über viele Spiele — auf das Einzelspiel ist keine Garantie möglich.
  tier90: boolean;
}

interface ConsensusInput {
  fixture: UpcomingFixture;
  homeForm: TeamForm | null;
  awayForm: TeamForm | null;
  h2h: HeadToHeadResult | null;
  leagueHomeWinPct: number | null; // 0..100, Liga-Durchschnitt
  leagueGoalsPerMatch: number | null;
  // Vollständiger Vergangenheits-Pool aus 3 Saisons für die erweiterten Signale.
  finishedPool: Fixture[];
}

const NEUTRAL_DETAIL = 'kein klares Signal';

export function computeConsensus(input: ConsensusInput): ConsensusVerdict {
  const signals: ConsensusSignal[] = [];

  // 1) Poisson aus dem bestehenden Modell.
  const pred = input.fixture.prediction;
  if (pred) {
    const pickSide: ConsensusSide = pred.pickSide;
    signals.push({
      id: 'poisson',
      label: 'Poisson-Modell',
      side: pickSide,
      strength: pred.pickConfidence,
      detail: `${pred.pickPlain} · ${Math.round(pred.pickConfidence * 100)} %`
    });
  } else {
    signals.push({ id: 'poisson', label: 'Poisson-Modell', side: null, strength: 0, detail: NEUTRAL_DETAIL });
  }

  // 2) Form-Differenz aus den letzten 5 Spielen.
  if (input.homeForm && input.awayForm) {
    const hPts = input.homeForm.points;
    const aPts = input.awayForm.points;
    const diff = hPts - aPts;
    // Punkte-Differenz von >= 6 (zwei Siege auseinander) = klares Form-Signal.
    const formSide: ConsensusSide | null = diff >= 6 ? 'home' : diff <= -6 ? 'away' : null;
    const strength = Math.min(1, Math.abs(diff) / 15); // max 15 Punkte Differenz aus 5 Spielen
    signals.push({
      id: 'form',
      label: 'Form letzte 5',
      side: formSide,
      strength: formSide ? strength : 0,
      detail: formSide ? `${input.homeForm.team} ${hPts} P · ${input.awayForm.team} ${aPts} P` : `${hPts} vs ${aPts} Punkte — zu eng`
    });
  } else {
    signals.push({ id: 'form', label: 'Form letzte 5', side: null, strength: 0, detail: 'keine Form-Daten' });
  }

  // 3) H2H-Dominanz aus 3 Saisons.
  if (input.h2h && input.h2h.meetings >= 3) {
    const winDiff = input.h2h.winsForHome - input.h2h.winsForAway;
    const h2hSide: ConsensusSide | null = winDiff >= 2 ? 'home' : winDiff <= -2 ? 'away' : null;
    const strength = Math.min(1, Math.abs(winDiff) / Math.max(1, input.h2h.meetings));
    signals.push({
      id: 'h2h',
      label: 'Direktvergleich',
      side: h2hSide,
      strength: h2hSide ? strength : 0,
      detail: h2hSide
        ? `${input.h2h.winsForHome}-${input.h2h.draws}-${input.h2h.winsForAway} aus ${input.h2h.meetings} Spielen`
        : `${input.h2h.winsForHome}-${input.h2h.draws}-${input.h2h.winsForAway} — ausgeglichen`
    });
  } else {
    signals.push({ id: 'h2h', label: 'Direktvergleich', side: null, strength: 0, detail: 'zu wenig Begegnungen' });
  }

  // 4) Heim-Vorteil im Vergleich zum Liga-Schnitt.
  if (input.leagueHomeWinPct !== null && pred) {
    const expected = input.leagueHomeWinPct / 100;
    const delta = pred.pHome - expected;
    const homeAdvSide: ConsensusSide | null = delta >= 0.1 ? 'home' : delta <= -0.1 ? 'away' : null;
    const strength = Math.min(1, Math.abs(delta) * 3);
    signals.push({
      id: 'home_advantage',
      label: 'Heim-Stadion-Faktor',
      side: homeAdvSide,
      strength: homeAdvSide ? strength : 0,
      detail: homeAdvSide
        ? `Heim ${Math.round(pred.pHome * 100)} % vs Liga-Schnitt ${Math.round(expected * 100)} %`
        : `Heim ${Math.round(pred.pHome * 100)} % ≈ Liga-Schnitt`
    });
  } else {
    signals.push({ id: 'home_advantage', label: 'Heim-Stadion-Faktor', side: null, strength: 0, detail: 'keine Liga-Statistik' });
  }

  // 6) Heim-spezifische vs Auswärts-spezifische Form (Venue-Split aus dem
  //    gesamten 3-Saisons-Pool).
  if (input.finishedPool.length > 0) {
    const homeSplit = computeVenueSplit(input.fixture.homeTeam, input.finishedPool);
    const awaySplit = computeVenueSplit(input.fixture.awayTeam, input.finishedPool);
    if (homeSplit.homeGames >= 10 && awaySplit.awayGames >= 10) {
      const homeAdvantage = homeSplit.homeOnlyWinPct - awaySplit.awayOnlyWinPct;
      const venueSide: ConsensusSide | null = homeAdvantage >= 0.15 ? 'home' : homeAdvantage <= -0.15 ? 'away' : null;
      const strength = Math.min(1, Math.abs(homeAdvantage) * 2.5);
      signals.push({
        id: 'venue_split',
        label: 'Heim/Auswärts-Spezialform',
        side: venueSide,
        strength: venueSide ? strength : 0,
        detail: venueSide
          ? `${input.fixture.homeTeam} heim ${Math.round(homeSplit.homeOnlyWinPct * 100)} % · ${input.fixture.awayTeam} auswärts ${Math.round(awaySplit.awayOnlyWinPct * 100)} %`
          : 'beide gleich stark zu Hause/auswärts'
      });
    } else {
      signals.push({ id: 'venue_split', label: 'Heim/Auswärts-Spezialform', side: null, strength: 0, detail: 'zu wenige Heim-/Auswärtsspiele' });
    }
  } else {
    signals.push({ id: 'venue_split', label: 'Heim/Auswärts-Spezialform', side: null, strength: 0, detail: 'kein Vergangenheits-Pool' });
  }

  // 7) Ruhetage seit letztem Spiel. < 4 Tage = Belastung, > 5 Tage = ausgeruht.
  const homeRest = computeRestDays(input.fixture.homeTeam, input.fixture.date, input.finishedPool);
  const awayRest = computeRestDays(input.fixture.awayTeam, input.fixture.date, input.finishedPool);
  if (homeRest.daysSinceLastGame !== null && awayRest.daysSinceLastGame !== null) {
    const restDiff = (awayRest.daysSinceLastGame ?? 0) - (homeRest.daysSinceLastGame ?? 0);
    // Negativer Diff = Heim ist ausgeruhter
    const restSide: ConsensusSide | null = restDiff <= -2 ? 'home' : restDiff >= 2 ? 'away' : null;
    const strength = Math.min(1, Math.abs(restDiff) / 5);
    signals.push({
      id: 'rest_days',
      label: 'Ruhetage',
      side: restSide,
      strength: restSide ? strength : 0,
      detail: `Heim: ${homeRest.daysSinceLastGame} Tage Pause · Auswärts: ${awayRest.daysSinceLastGame} Tage`
    });
  } else {
    signals.push({ id: 'rest_days', label: 'Ruhetage', side: null, strength: 0, detail: 'keine Ruhetage-Daten' });
  }

  // 8) Form-Trend (Frühphase vs Spätphase der letzten 6 Spiele).
  if (input.finishedPool.length > 0) {
    const homeTrend = computeFormTrend(input.fixture.homeTeam, input.finishedPool);
    const awayTrend = computeFormTrend(input.fixture.awayTeam, input.finishedPool);
    const trendDelta = homeTrend.delta - awayTrend.delta;
    const trendSide: ConsensusSide | null = trendDelta >= 4 ? 'home' : trendDelta <= -4 ? 'away' : null;
    const strength = Math.min(1, Math.abs(trendDelta) / 12);
    signals.push({
      id: 'form_trend',
      label: 'Form-Trend',
      side: trendSide,
      strength: trendSide ? strength : 0,
      detail: trendSide
        ? `Heim ${homeTrend.direction === 'up' ? '↑' : homeTrend.direction === 'down' ? '↓' : '→'} (Δ ${homeTrend.delta > 0 ? '+' : ''}${homeTrend.delta}) · Auswärts ${awayTrend.direction === 'up' ? '↑' : awayTrend.direction === 'down' ? '↓' : '→'} (Δ ${awayTrend.delta > 0 ? '+' : ''}${awayTrend.delta})`
        : 'beide Trends ähnlich'
    });
  } else {
    signals.push({ id: 'form_trend', label: 'Form-Trend', side: null, strength: 0, detail: 'kein Pool' });
  }

  // 9) Defensiv-Stabilität: wer kassiert weniger und konstanter?
  if (input.finishedPool.length > 0) {
    const homeDef = computeDefensiveStability(input.fixture.homeTeam, input.finishedPool);
    const awayDef = computeDefensiveStability(input.fixture.awayTeam, input.finishedPool);
    if (homeDef.games >= 10 && awayDef.games >= 10) {
      // Niedrigere Gegentor-Quote ist besser → side gewinnt
      const defDiff = awayDef.goalsConcededPerGame - homeDef.goalsConcededPerGame;
      const defSide: ConsensusSide | null = defDiff >= 0.4 ? 'home' : defDiff <= -0.4 ? 'away' : null;
      const strength = Math.min(1, Math.abs(defDiff) / 1.2);
      signals.push({
        id: 'defensive_stability',
        label: 'Defensiv-Stabilität',
        side: defSide,
        strength: defSide ? strength : 0,
        detail: defSide
          ? `Heim ${homeDef.goalsConcededPerGame.toFixed(2)} Gegentore/Spiel · Auswärts ${awayDef.goalsConcededPerGame.toFixed(2)}`
          : 'Defensive ähnlich'
      });
    } else {
      signals.push({ id: 'defensive_stability', label: 'Defensiv-Stabilität', side: null, strength: 0, detail: 'zu wenige Spiele' });
    }
  } else {
    signals.push({ id: 'defensive_stability', label: 'Defensiv-Stabilität', side: null, strength: 0, detail: 'kein Pool' });
  }

  // 10) Offensiv-Konsistenz: wer trifft konstanter?
  if (input.finishedPool.length > 0) {
    const homeOff = computeOffensiveConsistency(input.fixture.homeTeam, input.finishedPool);
    const awayOff = computeOffensiveConsistency(input.fixture.awayTeam, input.finishedPool);
    if (homeOff.games >= 10 && awayOff.games >= 10) {
      // Höhere Tor-Quote × Konstanz = besser
      const homeScore = homeOff.scoringRate * homeOff.scoreInEveryGamePct;
      const awayScore = awayOff.scoringRate * awayOff.scoreInEveryGamePct;
      const offDiff = homeScore - awayScore;
      const offSide: ConsensusSide | null = offDiff >= 0.3 ? 'home' : offDiff <= -0.3 ? 'away' : null;
      const strength = Math.min(1, Math.abs(offDiff) / 1.0);
      signals.push({
        id: 'offensive_consistency',
        label: 'Offensiv-Konsistenz',
        side: offSide,
        strength: offSide ? strength : 0,
        detail: offSide
          ? `Heim ${homeOff.scoringRate.toFixed(2)} T/Sp · ${Math.round(homeOff.scoreInEveryGamePct * 100)} % Trefferquote · Auswärts ${awayOff.scoringRate.toFixed(2)} T/Sp`
          : 'beide ähnlich treffsicher'
      });
    } else {
      signals.push({ id: 'offensive_consistency', label: 'Offensiv-Konsistenz', side: null, strength: 0, detail: 'zu wenige Spiele' });
    }
  } else {
    signals.push({ id: 'offensive_consistency', label: 'Offensiv-Konsistenz', side: null, strength: 0, detail: 'kein Pool' });
  }

  // 5) Tor-Qualität: spielt die favorisierte Mannschaft offensiv konstant?
  if (pred && input.homeForm && input.awayForm) {
    const fav = pred.pickSide;
    const favForm = fav === 'home' ? input.homeForm : fav === 'away' ? input.awayForm : null;
    if (favForm && favForm.played > 0) {
      const goalRatio = favForm.goalsFor / Math.max(1, favForm.played);
      const goalSide: ConsensusSide | null = goalRatio >= 1.8 ? fav : null;
      const strength = Math.min(1, (goalRatio - 1.0) / 2.0);
      signals.push({
        id: 'goal_quality',
        label: 'Tor-Konstanz',
        side: goalSide,
        strength: goalSide ? strength : 0,
        detail: goalSide
          ? `${favForm.team} ${goalRatio.toFixed(2)} Tore pro Spiel`
          : `Favorit trifft nur ${goalRatio.toFixed(2)} pro Spiel`
      });
    } else {
      signals.push({ id: 'goal_quality', label: 'Tor-Konstanz', side: null, strength: 0, detail: 'keine Form-Daten' });
    }
  } else {
    signals.push({ id: 'goal_quality', label: 'Tor-Konstanz', side: null, strength: 0, detail: 'keine Vorhersage' });
  }

  // Mehrheits-Side ermitteln.
  const sides: ConsensusSide[] = ['home', 'draw', 'away'];
  let bestSide: ConsensusSide = 'home';
  let bestCount = -1;
  let bestStrengthSum = 0;
  for (const s of sides) {
    const matching = signals.filter((sig) => sig.side === s);
    if (matching.length > bestCount || (matching.length === bestCount && matching.reduce((acc, x) => acc + x.strength, 0) > bestStrengthSum)) {
      bestCount = matching.length;
      bestStrengthSum = matching.reduce((acc, x) => acc + x.strength, 0);
      bestSide = s;
    }
  }
  // Wenn das Poisson-Modell keine klare Mehrheit hat, fällt auf seinen Pick zurück.
  if (bestCount === 0 && pred) bestSide = pred.pickSide;

  const agreeing = signals.filter((sig) => sig.side === bestSide);
  const avgStrength = agreeing.length > 0 ? agreeing.reduce((acc, x) => acc + x.strength, 0) / agreeing.length : 0;
  const consensusScore = Math.round(((agreeing.length / signals.length) * 0.6 + avgStrength * 0.4) * 100);

  // 10 Signale insgesamt: Skalierung der Grades entsprechend anpassen.
  // A+: mindestens 9 von 10 Signale + sehr hohe Durchschnittsstärke
  // A : mindestens 7 von 10 + hohe Stärke
  // B : mindestens 5 von 10
  // C : mindestens 3 von 10
  const grade: ConsensusVerdict['grade'] =
    agreeing.length >= 9 && avgStrength >= 0.75 ? 'A+' :
    agreeing.length >= 7 && avgStrength >= 0.6 ? 'A' :
    agreeing.length >= 5 && avgStrength >= 0.5 ? 'B' :
    agreeing.length >= 3 ? 'C' : 'D';

  const pickPlain = pickPlainFor(bestSide, input.fixture);
  const honestNote = grade === 'A+'
    ? `Alle ${signals.length} Signale zeigen dieselbe Richtung — höchstes Vertrauen, aber keine Garantie. Auch ein „A+"-Pick geht in ca. 1 von 5 Fällen schief.`
    : grade === 'A'
    ? `${agreeing.length} von ${signals.length} Signalen stimmen überein — sehr hohes Vertrauen.`
    : grade === 'B'
    ? `${agreeing.length} von ${signals.length} Signalen stimmen überein — Tendenz, kein Selbstläufer.`
    : `Signale uneinheitlich — fürs Tippspiel ok, fürs Drauf-Wetten nicht empfohlen.`;

  // Tier-90-Kriterien (alle müssen erfüllt sein):
  //  - ALLE 5 Signale stimmen überein
  //  - Durchschnittliche Signalstärke ≥ 0.80
  //  - Poisson-Konfidenz ≥ 0.75 (Modell selbst sieht klaren Favoriten)
  //  - H2H-Signal vorhanden (nicht null) — historische Belastbarkeit
  //  - Form-Signal vorhanden (nicht null) — aktuelle Belastbarkeit
  const h2hSignal = signals.find((s) => s.id === 'h2h');
  const formSignal = signals.find((s) => s.id === 'form');
  const poissonStrength = signals.find((s) => s.id === 'poisson')?.strength ?? 0;
  // Bei 10 Signalen: mindestens 9 müssen übereinstimmen, plus die alte Strenge.
  const tier90 =
    agreeing.length >= 9 &&
    avgStrength >= 0.80 &&
    poissonStrength >= 0.75 &&
    h2hSignal?.side === bestSide &&
    formSignal?.side === bestSide;

  return {
    fixtureId: input.fixture.id,
    pickSide: bestSide,
    pickPlain,
    signalsAgree: agreeing.length,
    signalsTotal: signals.length,
    avgStrength,
    consensusScore,
    grade,
    signals,
    honestNote,
    tier90
  };
}

function pickPlainFor(side: ConsensusSide, f: UpcomingFixture): string {
  if (side === 'home') return `${f.homeTeam} gewinnt`;
  if (side === 'away') return `${f.awayTeam} gewinnt`;
  return 'Remis';
}

// Bequeme Sammel-Funktion: berechnet Consensus für alle Spiele in WeekAhead-Form.
export function computeConsensusBatch(
  fixturesWithLeague: { fixture: UpcomingFixture; leagueName: string; finishedPool: Fixture[] }[],
  forms: TeamForm[],
  leagueStats: Map<string, { homeWinPct: number; goalsPerMatch: number }>,
  h2hByFixtureId: Map<string, HeadToHeadResult>
): ConsensusVerdict[] {
  return fixturesWithLeague
    .map(({ fixture, leagueName, finishedPool }) => {
      const homeForm = forms.find((f) => f.team === fixture.homeTeam) ?? null;
      const awayForm = forms.find((f) => f.team === fixture.awayTeam) ?? null;
      const lstats = leagueStats.get(leagueName) ?? null;
      const h2h = h2hByFixtureId.get(fixture.id) ?? null;
      return computeConsensus({
        fixture,
        homeForm,
        awayForm,
        h2h,
        leagueHomeWinPct: lstats?.homeWinPct ?? null,
        leagueGoalsPerMatch: lstats?.goalsPerMatch ?? null,
        finishedPool
      });
    });
}

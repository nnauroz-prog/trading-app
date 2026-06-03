import { describe, it, expect } from 'vitest';
import {
  computePredictionQualityScore,
  pickStablePrediction,
  type PredictionRecommendation
} from '@/lib/sport/prediction-quality-score';
import type { MatchPrediction, TeamForm5 } from '@/lib/sport/predictor';
import type { FootballProbabilityModel } from '@/lib/sport/probabilities';
import type { UpcomingFixture } from '@/lib/sport/fetcher';

function buildPrediction(overrides: Partial<MatchPrediction> = {}): MatchPrediction {
  const form: TeamForm5 = { results: ['W', 'W', 'W', 'D', 'W'], goalsFor: 10, goalsAgainst: 3 };
  return {
    lambdaHome: 1.8,
    lambdaAway: 1.0,
    pHome: 0.55,
    pDraw: 0.25,
    pAway: 0.20,
    likelyScore: { home: 2, away: 1 },
    homeGames: 10,
    awayGames: 10,
    pickSide: 'home',
    pickConfidence: 0.55,
    pickLabel: 'leicht',
    pickPlain: 'leicht Heim',
    homeForm: form,
    awayForm: form,
    ...overrides
  };
}

function buildProbs(overrides: Partial<FootballProbabilityModel> = {}): FootballProbabilityModel {
  return {
    homeWin: 0.5,
    draw: 0.25,
    awayWin: 0.25,
    over05: 0.92,
    over15: 0.78,
    over25: 0.55,
    under25: 0.45,
    bothTeamsToScore: 0.6,
    bothTeamsNotToScore: 0.4,
    topScorelines: [{ score: '2:1', probability: 0.12 }],
    expectedHomeGoals: 1.7,
    expectedAwayGoals: 1.1,
    homeGamesUsed: 12,
    awayGamesUsed: 12,
    modelConfidence: 'medium',
    dataQuality: 'good',
    explanation: 'ok',
    headToHead: { totalGames: 0, homeWins: 0, draws: 0, awayWins: 0, recentResults: [] },
    ...overrides
  };
}

function buildFixture(overrides: Partial<UpcomingFixture> = {}): UpcomingFixture {
  return {
    id: 'evt-1',
    homeTeam: 'Heim',
    awayTeam: 'Auswärts',
    league: 'TestLiga',
    date: '2026-06-04',
    time: '20:30',
    venue: null,
    homeScore: null,
    awayScore: null,
    status: 'upcoming',
    prediction: buildPrediction(),
    probabilities: buildProbs(),
    tips: null,
    ...overrides
  };
}

describe('pickStablePrediction', () => {
  it('bevorzugt Über 1,5 Tore wenn Wahrscheinlichkeit hoch ist', () => {
    const pick = pickStablePrediction(buildPrediction(), buildProbs({ over15: 0.86 }));
    expect(pick.market).toBe('Over 1.5');
    expect(pick.isStableMarket).toBe(true);
  });

  it('wählt Doppelchance 1X wenn p1X über Schwelle', () => {
    const prediction = buildPrediction({ pHome: 0.55, pDraw: 0.25, pAway: 0.20 });
    const probs = buildProbs({ over15: 0.5, over25: 0.4, bothTeamsToScore: 0.5 });
    const pick = pickStablePrediction(prediction, probs);
    expect(['1X', 'Over 1.5']).toContain(pick.market);
    expect(pick.isStableMarket).toBe(true);
  });

  it('Fallback auf 1X2 nur wenn nichts stabil', () => {
    const prediction = buildPrediction({ pHome: 0.38, pDraw: 0.28, pAway: 0.34, pickSide: 'home', pickConfidence: 0.38, pickPlain: 'offen' });
    const probs = buildProbs({ over15: 0.5, over25: 0.4, bothTeamsToScore: 0.5, bothTeamsNotToScore: 0.5 });
    const pick = pickStablePrediction(prediction, probs);
    expect(pick.isStableMarket).toBe(false);
    expect(pick.market).toBe('1');
  });

  it('Over 0.5 ist Top-Kandidat bei sehr hoher Mindest-Tor-Wahrsch.', () => {
    const prediction = buildPrediction({ pHome: 0.4, pDraw: 0.3, pAway: 0.3 });
    const probs = buildProbs({ over05: 0.97, over15: 0.5, over25: 0.3, bothTeamsToScore: 0.5 });
    const pick = pickStablePrediction(prediction, probs);
    expect(pick.market).toBe('Over 0.5');
    expect(pick.isStableMarket).toBe(true);
  });

  it('Under 2.5 wenn Defensive dominiert', () => {
    const prediction = buildPrediction({ pHome: 0.35, pDraw: 0.35, pAway: 0.3 });
    const probs = buildProbs({ over05: 0.6, over15: 0.4, over25: 0.2, under25: 0.8, bothTeamsToScore: 0.3 });
    const pick = pickStablePrediction(prediction, probs);
    expect(['Under 2.5', 'BTTS nein']).toContain(pick.market);
    expect(pick.isStableMarket).toBe(true);
  });

  it('funktioniert auch ohne Probabilities', () => {
    const prediction = buildPrediction({ pHome: 0.72, pDraw: 0.18, pAway: 0.10 });
    const pick = pickStablePrediction(prediction, null);
    expect(['1', '1X', '12']).toContain(pick.market);
  });
});

describe('computePredictionQualityScore', () => {
  const stableRec: PredictionRecommendation = {
    market: 'Over 1.5',
    probability: 0.85,
    label: 'Über 1,5 Tore',
    rationale: 'stabil',
    isStableMarket: true
  };

  it('gibt hohen Score bei stabilem Markt + guter Datenlage + klar', () => {
    const fixture = buildFixture({
      prediction: buildPrediction({ pickLabel: 'klar' }),
      probabilities: buildProbs({ dataQuality: 'good' })
    });
    const result = computePredictionQualityScore({ fixture, recommendation: stableRec, sampleSize: 120 });
    expect(result.score).toBeGreaterThanOrEqual(85);
    expect(result.band).toBe('sehr_stark');
    expect(result.bandLabel).toBe('sehr starke Prognose');
  });

  it('deckelt Score bei schwacher Datenlage auf 60', () => {
    const fixture = buildFixture({
      prediction: buildPrediction({ pickLabel: 'klar' }),
      probabilities: buildProbs({ dataQuality: 'weak' })
    });
    const result = computePredictionQualityScore({ fixture, recommendation: stableRec, sampleSize: 5 });
    expect(result.score).toBeLessThanOrEqual(60);
    expect(result.warnings.some((w) => w.includes('Datenlage'))).toBe(true);
  });

  it('deckelt Score bei instabilem Markt auf 70', () => {
    const unstable: PredictionRecommendation = {
      market: '1',
      probability: 0.62,
      label: 'Heimsieg',
      rationale: '1X2',
      isStableMarket: false
    };
    const fixture = buildFixture({
      prediction: buildPrediction({ pickLabel: 'klar' }),
      probabilities: buildProbs({ dataQuality: 'good' })
    });
    const result = computePredictionQualityScore({ fixture, recommendation: unstable, sampleSize: 100 });
    expect(result.score).toBeLessThanOrEqual(70);
    expect(result.warnings.some((w) => w.includes('instabil'))).toBe(true);
  });

  it('exakt-Markt bekommt 0 Punkte für Marktart', () => {
    const exactRec: PredictionRecommendation = {
      market: 'exakt',
      probability: 0.12,
      label: '2:1',
      rationale: 'Top-Ergebnis-Schätzung',
      isStableMarket: false
    };
    const fixture = buildFixture();
    const result = computePredictionQualityScore({ fixture, recommendation: exactRec, sampleSize: 100 });
    expect(result.parts.marketRisk).toBe(0);
  });

  it('beendetes Spiel: Score = 0 und Warning', () => {
    const fixture = buildFixture({ status: 'finished' });
    const result = computePredictionQualityScore({ fixture, recommendation: stableRec, sampleSize: 100 });
    expect(result.score).toBe(0);
    expect(result.band).toBe('nicht_verwenden');
    expect(result.warnings.some((w) => w.includes('beendet'))).toBe(true);
  });

  it('confidence niedrig erzeugt Warning', () => {
    const fixture = buildFixture({
      prediction: buildPrediction({ pickLabel: 'offen' })
    });
    const result = computePredictionQualityScore({ fixture, recommendation: stableRec, sampleSize: 100 });
    expect(result.parts.confidence).toBe(5);
    expect(result.warnings.some((w) => w.includes('Confidence'))).toBe(true);
  });

  it('Bands entsprechen Score-Schwellen', () => {
    const fixture = buildFixture({
      prediction: buildPrediction({ pickLabel: 'leicht' }),
      probabilities: buildProbs({ dataQuality: 'medium' })
    });
    const lowRec: PredictionRecommendation = {
      market: 'X',
      probability: 0.32,
      label: 'Remis',
      rationale: 'eng',
      isStableMarket: false
    };
    const result = computePredictionQualityScore({ fixture, recommendation: lowRec, sampleSize: 10 });
    expect(['nicht_verwenden', 'orientierung']).toContain(result.band);
  });

  it('parts-Aufschlüsselung addiert sich zum (ungedeckelten) Score', () => {
    const fixture = buildFixture({
      prediction: buildPrediction({ pickLabel: 'klar' }),
      probabilities: buildProbs({ dataQuality: 'good' })
    });
    const result = computePredictionQualityScore({ fixture, recommendation: stableRec, sampleSize: 100 });
    const sum =
      result.parts.probability +
      result.parts.confidence +
      result.parts.dataQuality +
      result.parts.marketRisk +
      result.parts.actuality;
    expect(sum).toBeGreaterThanOrEqual(result.score);
    expect(result.parts.actuality).toBe(5);
  });
});

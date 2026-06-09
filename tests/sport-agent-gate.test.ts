import { describe, expect, it } from 'vitest';
import {
  evaluateCalibrationAgent,
  evaluateDataAgent,
  evaluateModelAgent,
  evaluateRiskAgent,
  evaluateSportAgents
} from '@/lib/sport/sport-agent-gate';
import type { PrecisionPickInput } from '@/lib/sport/sport-precision-gate';

function input(over: Partial<PrecisionPickInput> = {}): PrecisionPickInput {
  return {
    matchId: 'm1',
    competitionType: 'LEAGUE',
    league: 'Bundesliga',
    homeTeam: 'Bayern',
    awayTeam: 'Dortmund',
    marketType: 'Über 1,5 Tore',
    modelProbability: 0.82,
    rawProbability: 0.82,
    dataConfidence: 90,
    qualityScore: 86,
    eloDiff: 60,
    expectedGoalsHome: 2.1,
    expectedGoalsAway: 1.5,
    poissonConfidence: 0.7,
    formSampleSize: 10,
    h2hSampleSize: 5,
    homeAwaySampleSize: 5,
    homeAwayDataAvailable: true,
    injuryDataAvailable: true,
    lineupDataAvailable: true,
    daysUntilMatch: 3,
    hasOfficialFixture: true,
    isTbdTeam: false,
    marketStability: 'STRONG',
    modelDisagreement: 'LOW',
    sourceCompleteness: 95,
    isFutureTournamentFixture: false,
    isNeutralVenue: false,
    venueKnown: true,
    resultTrackingAvailable: true,
    calibrationSampleSize: 50,
    historicalHitRateForBucket: 0.82,
    brierScoreForBucket: 0.18,
    calibrationLabel: 'KALIBRIERT',
    ...over
  };
}

describe('evaluateDataAgent', () => {
  it('Vollstaendige Daten → OK', () => {
    expect(evaluateDataAgent(input()).status).toBe('OK');
  });
  it('TBD → BLOCKIERT', () => {
    expect(evaluateDataAgent(input({ isTbdTeam: true })).status).toBe('BLOCKIERT');
  });
  it('Fixture nicht offiziell → BLOCKIERT', () => {
    expect(evaluateDataAgent(input({ hasOfficialFixture: false })).status).toBe('BLOCKIERT');
  });
  it('sourceCompleteness < 80 → BLOCKIERT', () => {
    expect(evaluateDataAgent(input({ sourceCompleteness: 70 })).status).toBe('BLOCKIERT');
  });
  it('sourceCompleteness 85 → WARNUNG', () => {
    expect(evaluateDataAgent(input({ sourceCompleteness: 85 })).status).toBe('WARNUNG');
  });
  it('formSampleSize 4 → BLOCKIERT', () => {
    expect(evaluateDataAgent(input({ formSampleSize: 4 })).status).toBe('BLOCKIERT');
  });
});

describe('evaluateModelAgent', () => {
  it('Stark + low Disagreement → OK', () => {
    expect(evaluateModelAgent(input()).status).toBe('OK');
  });
  it('marketStability WEAK → BLOCKIERT', () => {
    expect(evaluateModelAgent(input({ marketStability: 'WEAK' })).status).toBe('BLOCKIERT');
  });
  it('modelDisagreement HIGH → BLOCKIERT', () => {
    expect(evaluateModelAgent(input({ modelDisagreement: 'HIGH' })).status).toBe('BLOCKIERT');
  });
  it('Poisson/ELO-Konflikt (ELO stark home, xG favorisiert away) → BLOCKIERT', () => {
    const r = evaluateModelAgent(input({ eloDiff: 150, expectedGoalsHome: 1.0, expectedGoalsAway: 1.8 }));
    expect(r.status).toBe('BLOCKIERT');
  });
  it('xG eng aber 1X2 hoch → BLOCKIERT', () => {
    const r = evaluateModelAgent(input({
      marketType: 'Heimsieg Bayern',
      modelProbability: 0.78,
      expectedGoalsHome: 1.5,
      expectedGoalsAway: 1.45
    }));
    expect(r.status).toBe('BLOCKIERT');
  });
  it('Probability nur durch ELO getrieben → BLOCKIERT', () => {
    const r = evaluateModelAgent(input({
      eloDiff: 150,
      poissonConfidence: 0.3,
      modelProbability: 0.78
    }));
    expect(r.status).toBe('BLOCKIERT');
  });
});

describe('evaluateRiskAgent', () => {
  it('Stabiler Markt → OK', () => {
    expect(evaluateRiskAgent(input()).status).toBe('OK');
  });
  it('Enger 1X2-Markt → BLOCKIERT', () => {
    const r = evaluateRiskAgent(input({
      marketType: 'Heimsieg Bayern',
      modelProbability: 0.45,
      expectedGoalsHome: 1.7,
      expectedGoalsAway: 1.5
    }));
    expect(r.status).toBe('BLOCKIERT');
  });
  it('Spiel 90 Tage entfernt → BLOCKIERT', () => {
    expect(evaluateRiskAgent(input({ daysUntilMatch: 90 })).status).toBe('BLOCKIERT');
  });
  it('Spiel 20 Tage entfernt → WARNUNG', () => {
    expect(evaluateRiskAgent(input({ daysUntilMatch: 20 })).status).toBe('WARNUNG');
  });
  it('Roh-Probability hoch + Daten schwach → BLOCKIERT (ueberhoehte Confidence)', () => {
    const r = evaluateRiskAgent(input({ rawProbability: 0.88, dataConfidence: 75, qualityScore: 70 }));
    expect(r.status).toBe('BLOCKIERT');
  });
  it('Sensitiver Markt + Lineup fehlt + 1 Tag bis Anstoss → BLOCKIERT', () => {
    const r = evaluateRiskAgent(input({
      marketType: 'BTTS ja',
      lineupDataAvailable: false,
      injuryDataAvailable: false,
      daysUntilMatch: 1
    }));
    expect(r.status).toBe('BLOCKIERT');
  });
  it('Sensitiver Markt + Lineup fehlt aber Spiel in 7 Tagen → nur WARNUNG', () => {
    const r = evaluateRiskAgent(input({
      marketType: 'BTTS ja',
      lineupDataAvailable: false,
      injuryDataAvailable: false,
      daysUntilMatch: 7
    }));
    expect(r.status).toBe('WARNUNG');
  });
});

describe('evaluateCalibrationAgent', () => {
  it('Volle Historie, Bucket kalibriert → OK', () => {
    expect(evaluateCalibrationAgent(input()).status).toBe('OK');
  });
  it('calibrationSampleSize 5 → WARNUNG', () => {
    expect(evaluateCalibrationAgent(input({ calibrationSampleSize: 5 })).status).toBe('WARNUNG');
  });
  it('Bucket UEBERSCHAETZT → BLOCKIERT', () => {
    expect(evaluateCalibrationAgent(input({ calibrationLabel: 'UEBERSCHAETZT' })).status).toBe('BLOCKIERT');
  });
  it('Historische Hit-Rate weit unter erwartet → BLOCKIERT', () => {
    const r = evaluateCalibrationAgent(input({
      historicalHitRateForBucket: 0.5,
      calibrationLabel: undefined,
      calibrationSampleSize: 20
    }));
    expect(r.status).toBe('BLOCKIERT');
  });
  it('Brier 0.35 → BLOCKIERT', () => {
    expect(evaluateCalibrationAgent(input({ brierScoreForBucket: 0.35 })).status).toBe('BLOCKIERT');
  });
});

describe('evaluateSportAgents — Composite', () => {
  it('Alle OK → kein Blocker, keine Warnung', () => {
    const r = evaluateSportAgents(input());
    expect(r.hasBlocker).toBe(false);
    expect(r.hasWarning).toBe(false);
  });
  it('Ein Blocker reicht fuer hasBlocker', () => {
    const r = evaluateSportAgents(input({ isTbdTeam: true }));
    expect(r.hasBlocker).toBe(true);
    expect(r.statuses.find((s) => s.id === 'data')?.status).toBe('BLOCKIERT');
  });
  it('Warnung ohne Blocker → hasWarning true, hasBlocker false', () => {
    const r = evaluateSportAgents(input({ sourceCompleteness: 85 }));
    expect(r.hasBlocker).toBe(false);
    expect(r.hasWarning).toBe(true);
  });
});

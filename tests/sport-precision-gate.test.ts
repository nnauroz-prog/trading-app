import { describe, expect, it } from 'vitest';
import {
  CONFIDENCE_CAPS,
  evaluateSportPrecisionPick,
  type PrecisionPickInput
} from '@/lib/sport/sport-precision-gate';

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

describe('evaluateSportPrecisionPick — FREIGABE', () => {
  it('Vollstaendige starke Datenlage → FREIGABE, Score hoch, kein Blocker', () => {
    const r = evaluateSportPrecisionPick(input());
    expect(r.verdict).toBe('FREIGABE');
    expect(r.blockers).toEqual([]);
    expect(r.precisionScore).toBeGreaterThanOrEqual(80);
    expect(r.dataLabel).toBe('VOLLSTAENDIG');
    expect(r.riskLabel).toBe('LOW');
    expect(r.calibrationLabel).toBe('KALIBRIERT');
    expect(r.shouldShowAsTopPick).toBe(true);
  });
});

describe('evaluateSportPrecisionPick — BEOBACHTEN', () => {
  it('Mittlere Datenlage (dataConfidence 80, qualityScore 75) → BEOBACHTEN', () => {
    const r = evaluateSportPrecisionPick(input({ dataConfidence: 80, qualityScore: 75 }));
    expect(r.verdict).toBe('BEOBACHTEN');
    expect(r.blockers).toEqual([]);
  });
  it('Modell-Wahrscheinlichkeit 0.74 → BEOBACHTEN', () => {
    const r = evaluateSportPrecisionPick(input({ modelProbability: 0.74 }));
    expect(r.verdict).toBe('BEOBACHTEN');
  });
  it('Marktstabilitaet MEDIUM allein → BEOBACHTEN', () => {
    const r = evaluateSportPrecisionPick(input({ marketStability: 'MEDIUM' }));
    expect(r.verdict).toBe('BEOBACHTEN');
  });
  it('Spiel 10 Tage entfernt → BEOBACHTEN', () => {
    const r = evaluateSportPrecisionPick(input({ daysUntilMatch: 10 }));
    expect(r.verdict).toBe('BEOBACHTEN');
  });
});

describe('evaluateSportPrecisionPick — NICHT_VERWENDEN', () => {
  it('TBD-Team → NICHT_VERWENDEN', () => {
    const r = evaluateSportPrecisionPick(input({ isTbdTeam: true }));
    expect(r.verdict).toBe('NICHT_VERWENDEN');
    expect(r.blockers.some((b) => b.toLowerCase().includes('tbd'))).toBe(true);
  });
  it('hasOfficialFixture false → NICHT_VERWENDEN', () => {
    const r = evaluateSportPrecisionPick(input({ hasOfficialFixture: false }));
    expect(r.verdict).toBe('NICHT_VERWENDEN');
  });
  it('dataConfidence 70 (unter 75) → NICHT_VERWENDEN', () => {
    const r = evaluateSportPrecisionPick(input({ dataConfidence: 70 }));
    expect(r.verdict).toBe('NICHT_VERWENDEN');
  });
  it('qualityScore 65 (unter 70) → NICHT_VERWENDEN', () => {
    const r = evaluateSportPrecisionPick(input({ qualityScore: 65 }));
    expect(r.verdict).toBe('NICHT_VERWENDEN');
  });
  it('sourceCompleteness 75 (unter 80) → NICHT_VERWENDEN', () => {
    const r = evaluateSportPrecisionPick(input({ sourceCompleteness: 75 }));
    expect(r.verdict).toBe('NICHT_VERWENDEN');
  });
  it('marketStability WEAK → NICHT_VERWENDEN', () => {
    const r = evaluateSportPrecisionPick(input({ marketStability: 'WEAK' }));
    expect(r.verdict).toBe('NICHT_VERWENDEN');
  });
  it('modelDisagreement HIGH → NICHT_VERWENDEN', () => {
    const r = evaluateSportPrecisionPick(input({ modelDisagreement: 'HIGH' }));
    expect(r.verdict).toBe('NICHT_VERWENDEN');
  });
  it('formSampleSize 4 (unter 5) → NICHT_VERWENDEN', () => {
    const r = evaluateSportPrecisionPick(input({ formSampleSize: 4 }));
    expect(r.verdict).toBe('NICHT_VERWENDEN');
  });
  it('modelProbability 0.65 (unter 0.70) → NICHT_VERWENDEN', () => {
    const r = evaluateSportPrecisionPick(input({ modelProbability: 0.65 }));
    expect(r.verdict).toBe('NICHT_VERWENDEN');
  });
  it('Spiel 90 Tage entfernt → NICHT_VERWENDEN', () => {
    const r = evaluateSportPrecisionPick(input({ daysUntilMatch: 90 }));
    expect(r.verdict).toBe('NICHT_VERWENDEN');
  });
  it('Kalibrierung UEBERSCHAETZT → NICHT_VERWENDEN', () => {
    const r = evaluateSportPrecisionPick(input({ calibrationLabel: 'UEBERSCHAETZT', historicalHitRateForBucket: 0.5 }));
    expect(r.verdict).toBe('NICHT_VERWENDEN');
  });
});

describe('evaluateSportPrecisionPick — Confidence-Capping', () => {
  it('Fehlende Lineup-Daten → Cap und Warnung', () => {
    const r = evaluateSportPrecisionPick(input({ lineupDataAvailable: false }));
    expect(r.confidenceCap).toBeLessThanOrEqual(CONFIDENCE_CAPS.lineupMissing);
    expect(r.warnings.some((w) => w.toLowerCase().includes('aufstellung'))).toBe(true);
  });
  it('Fehlende Verletzungsdaten → Cap', () => {
    const r = evaluateSportPrecisionPick(input({ injuryDataAvailable: false }));
    expect(r.confidenceCap).toBeLessThanOrEqual(CONFIDENCE_CAPS.injuryMissing);
  });
  it('Spiel 20 Tage entfernt → Cap auf 72', () => {
    const r = evaluateSportPrecisionPick(input({ daysUntilMatch: 20 }));
    expect(r.confidenceCap).toBeLessThanOrEqual(CONFIDENCE_CAPS.daysOver14);
  });
  it('Spiel 35 Tage entfernt → Cap auf 65', () => {
    const r = evaluateSportPrecisionPick(input({ daysUntilMatch: 35 }));
    expect(r.confidenceCap).toBeLessThanOrEqual(CONFIDENCE_CAPS.daysOver30);
  });
  it('Kalibrierungs-Sample klein → Cap auf 72', () => {
    const r = evaluateSportPrecisionPick(input({ calibrationSampleSize: 3 }));
    expect(r.confidenceCap).toBeLessThanOrEqual(CONFIDENCE_CAPS.smallCalibrationSample);
  });
  it('displayProbability darf nicht ueber Cap liegen', () => {
    const r = evaluateSportPrecisionPick(input({ dataConfidence: 75, modelProbability: 0.92 }));
    expect(r.displayProbability).toBeLessThanOrEqual(r.confidenceCap / 100);
  });
});

describe('evaluateSportPrecisionPick — Wording', () => {
  const FORBIDDEN = ['sicher', 'maximal sicher', 'sehr sicher', 'sicherer tipp', 'bank', 'garantiert', 'todsicher', 'free money', 'geldmaschine', 'risikolos', 'muss kommen'];

  it('Keine verbotenen Woerter in reasons/blockers/warnings', () => {
    const all: string[] = [];
    const cases: PrecisionPickInput[] = [
      input(),
      input({ dataConfidence: 70 }),
      input({ isTbdTeam: true }),
      input({ daysUntilMatch: 90 }),
      input({ marketStability: 'WEAK' }),
      input({ lineupDataAvailable: false, injuryDataAvailable: false })
    ];
    for (const c of cases) {
      const r = evaluateSportPrecisionPick(c);
      all.push(...r.reasons, ...r.blockers, ...r.warnings);
    }
    for (const text of all) {
      const lower = text.toLowerCase();
      for (const f of FORBIDDEN) {
        expect(lower.includes(f), `Verbotenes Wort "${f}" gefunden in: ${text}`).toBe(false);
      }
    }
  });
});

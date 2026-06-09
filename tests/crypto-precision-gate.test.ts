import { describe, expect, it } from 'vitest';
import {
  evaluateCryptoPrecisionPick,
  evaluateCryptoDataAgent,
  evaluateCryptoRiskAgent,
  evaluateCryptoModelAgent,
  evaluateCryptoCalibrationAgent,
  type CryptoPrecisionInput
} from '@/lib/analysis/crypto-precision-gate';
import type { SafetyAssessment } from '@/lib/analysis/safety-gate';

function safety(over: Partial<SafetyAssessment> = {}): SafetyAssessment {
  return {
    score: 95,
    maxSafety: true,
    grade: 'A',
    criteria: [],
    passedHard: 8,
    totalHard: 8,
    residualRiskNote: 'Auch sichere Setups koennen drehen.',
    ...over
  };
}

function input(over: Partial<CryptoPrecisionInput> = {}): CryptoPrecisionInput {
  return {
    coinId: 'btc',
    symbol: 'BTC',
    passedCount: 10,
    totalCount: 12,
    marketMood: 'risk-on',
    btcRegime: 'bull',
    structure: 'uptrend',
    nearSupport: true,
    quoteVolume: 200_000_000,
    stopDistancePct: 3,
    priceChangePct24h: 1.5,
    crowdCautious: false,
    confirmed: true,
    backtestWinRatePct: 60,
    backtestSampleSize: 30,
    safety: safety(),
    ...over
  };
}

describe('evaluateCryptoPrecisionPick — FREIGABE', () => {
  it('Voller Stack → FREIGABE', () => {
    const r = evaluateCryptoPrecisionPick(input());
    expect(r.verdict).toBe('FREIGABE');
    expect(r.precisionScore).toBeGreaterThanOrEqual(80);
    expect(r.riskLabel).toBe('LOW');
    expect(r.shouldShowAsTopPick).toBe(true);
  });
});

describe('evaluateCryptoPrecisionPick — BEOBACHTEN', () => {
  it('Konfluenz 8/12 → BEOBACHTEN', () => {
    const r = evaluateCryptoPrecisionPick(input({ passedCount: 8, safety: safety({ maxSafety: false, grade: 'B' }) }));
    expect(r.verdict).toBe('BEOBACHTEN');
  });
  it('safety.maxSafety false → BEOBACHTEN', () => {
    const r = evaluateCryptoPrecisionPick(input({ safety: safety({ maxSafety: false, grade: 'B' }) }));
    expect(r.verdict).toBe('BEOBACHTEN');
  });
});

describe('evaluateCryptoPrecisionPick — NICHT_VERWENDEN', () => {
  it('Markt-Mood risk-off → NICHT_VERWENDEN', () => {
    const r = evaluateCryptoPrecisionPick(input({ marketMood: 'risk-off' }));
    expect(r.verdict).toBe('NICHT_VERWENDEN');
  });
  it('BTC-Regime bear (Altcoin) → NICHT_VERWENDEN', () => {
    const r = evaluateCryptoPrecisionPick(input({ coinId: 'eth', btcRegime: 'bear' }));
    expect(r.verdict).toBe('NICHT_VERWENDEN');
  });
  it('Struktur downtrend → NICHT_VERWENDEN', () => {
    const r = evaluateCryptoPrecisionPick(input({ structure: 'downtrend' }));
    expect(r.verdict).toBe('NICHT_VERWENDEN');
  });
  it('Liquiditaet zu niedrig → NICHT_VERWENDEN', () => {
    const r = evaluateCryptoPrecisionPick(input({ quoteVolume: 10_000_000 }));
    expect(r.verdict).toBe('NICHT_VERWENDEN');
  });
  it('Stop zu weit (>6 %) → NICHT_VERWENDEN', () => {
    const r = evaluateCryptoPrecisionPick(input({ stopDistancePct: 8 }));
    expect(r.verdict).toBe('NICHT_VERWENDEN');
  });
  it('24h Pump > 15 % → NICHT_VERWENDEN (Chase)', () => {
    const r = evaluateCryptoPrecisionPick(input({ priceChangePct24h: 18 }));
    expect(r.verdict).toBe('NICHT_VERWENDEN');
  });
  it('Backtest-Hit unter 45 % bei n>=10 → NICHT_VERWENDEN', () => {
    const r = evaluateCryptoPrecisionPick(input({ backtestWinRatePct: 40, backtestSampleSize: 20 }));
    expect(r.verdict).toBe('NICHT_VERWENDEN');
  });
});

describe('Agenten einzeln', () => {
  it('Datenpruefer blockiert bei passedCount < 7', () => {
    expect(evaluateCryptoDataAgent(input({ passedCount: 5 })).status).toBe('BLOCKIERT');
  });
  it('Risiko-Veto blockiert bei stop > 6 %', () => {
    expect(evaluateCryptoRiskAgent(input({ stopDistancePct: 7 })).status).toBe('BLOCKIERT');
  });
  it('Modellpruefer blockiert bei risk-off', () => {
    expect(evaluateCryptoModelAgent(input({ marketMood: 'risk-off' })).status).toBe('BLOCKIERT');
  });
  it('Kalibrierungswaechter blockiert bei Backtest < 45 %', () => {
    expect(evaluateCryptoCalibrationAgent(input({ backtestWinRatePct: 40, backtestSampleSize: 15 })).status).toBe('BLOCKIERT');
  });
  it('Kalibrierungswaechter WARNUNG bei n < 10', () => {
    expect(evaluateCryptoCalibrationAgent(input({ backtestSampleSize: 3 })).status).toBe('WARNUNG');
  });
});

describe('News-Verarbeitung im Hintergrund', () => {
  it('Baerische News-Lage (netScore <= -2) → WARNUNG, verhindert FREIGABE', () => {
    const r = evaluateCryptoPrecisionPick(input({ newsTilt: 'bärisch', newsNetScore: -3 }));
    expect(r.verdict).toBe('BEOBACHTEN');
    expect(r.warnings.some((w) => w.toLowerCase().includes('news'))).toBe(true);
  });
  it('Leicht baerische News (netScore -1) → keine Warnung', () => {
    const r = evaluateCryptoPrecisionPick(input({ newsTilt: 'bärisch', newsNetScore: -1 }));
    expect(r.verdict).toBe('FREIGABE');
  });
  it('Bullische News → kein Boost, FREIGABE bleibt von Pflicht-Kriterien abhaengig', () => {
    const weak = evaluateCryptoPrecisionPick(input({ passedCount: 8, safety: safety({ maxSafety: false, grade: 'B' }), newsTilt: 'bullisch', newsNetScore: 5 }));
    expect(weak.verdict).toBe('BEOBACHTEN');
  });
  it('Chase-Warnung (News schon eingepreist) → NICHT_VERWENDEN', () => {
    const r = evaluateCryptoPrecisionPick(input({ chaseWarning: true }));
    expect(r.verdict).toBe('NICHT_VERWENDEN');
    expect(r.blockers.some((b) => b.includes('eingepreist'))).toBe(true);
  });
  it('Keine News-Daten (null) → neutral, kein Veto', () => {
    const r = evaluateCryptoPrecisionPick(input({ newsTilt: null, newsNetScore: null }));
    expect(r.verdict).toBe('FREIGABE');
  });
});

describe('Wording — keine verbotenen Begriffe', () => {
  const FORBIDDEN = ['sicher', 'maximal sicher', 'sehr sicher', 'sicherer tipp', 'bank', 'garantiert', 'todsicher', 'free money', 'geldmaschine', 'risikolos', 'muss kommen'];
  it('Reasons / Blockers / Warnings sind frei von verbotenen Begriffen', () => {
    const cases = [
      input(),
      input({ marketMood: 'risk-off' }),
      input({ priceChangePct24h: 20 }),
      input({ stopDistancePct: 0.5 })
    ];
    for (const c of cases) {
      const r = evaluateCryptoPrecisionPick(c);
      const all = [...r.reasons, ...r.blockers, ...r.warnings];
      for (const text of all) {
        const lower = text.toLowerCase();
        for (const f of FORBIDDEN) {
          expect(lower.includes(f), `Verbotenes Wort "${f}" in: ${text}`).toBe(false);
        }
      }
    }
  });
});

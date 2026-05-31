import { describe, expect, it } from 'vitest';
import { computeConfidence } from '@/lib/heute-confidence';
import { SetupSimilarity } from '@/lib/analysis/setup-similarity';

function sim(over: Partial<SetupSimilarity> = {}): SetupSimilarity {
  return {
    coinId: 'eth', ticker: 'ETH', currentConfluence: 9,
    matchCount: 10, tp1Hits: 7, slHits: 3, timeouts: 0,
    hitRatePct: 70, avgWinPct: 2.5, avgLossPct: -1.5, expectancyPct: 1.5,
    sampleSize: 'good',
    oneLineVerdict: '',
    ...over
  };
}

describe('computeConfidence', () => {
  it('peaks above 75 with full consensus + good news + good history', () => {
    const r = computeConfidence(3, 'bullisch', sim({ hitRatePct: 70 }), null, 'risk-on');
    expect(r.score).toBeGreaterThanOrEqual(85);
    expect(r.label).toBe('hoch');
  });

  it('drops to "sehr niedrig" with no consensus + bad news + event imminent', () => {
    const r = computeConfidence(0, 'bärisch', sim({ hitRatePct: 20 }), { imminent: true, veryImminent: true, nextHighImpact: null, hoursUntilNextHighImpact: 3, plainSummary: '' }, 'risk-off');
    expect(r.score).toBeLessThan(35);
  });

  it('subtracts 20 for very imminent event', () => {
    const base = computeConfidence(2, 'neutral', null, null, null);
    const withEvent = computeConfidence(2, 'neutral', null, { imminent: true, veryImminent: true, nextHighImpact: null, hoursUntilNextHighImpact: 3, plainSummary: '' }, null);
    expect(base.score - withEvent.score).toBeGreaterThanOrEqual(20);
  });

  it('subtracts 10 for imminent but not very-imminent event', () => {
    const base = computeConfidence(2, 'neutral', null, null, null);
    const withEvent = computeConfidence(2, 'neutral', null, { imminent: true, veryImminent: false, nextHighImpact: null, hoursUntilNextHighImpact: 20, plainSummary: '' }, null);
    expect(base.score - withEvent.score).toBe(10);
  });

  it('CEO risk-off penalty larger than risk-on bonus', () => {
    const ceoOn = computeConfidence(2, 'neutral', null, null, 'risk-on');
    const ceoOff = computeConfidence(2, 'neutral', null, null, 'risk-off');
    expect(ceoOn.score - ceoOff.score).toBe(15);
  });

  it('small-sample similarity is penalised', () => {
    const noSim = computeConfidence(2, 'neutral', null, null, null);
    const withSmall = computeConfidence(2, 'neutral', sim({ sampleSize: 'small', matchCount: 2 }), null, null);
    expect(withSmall.score).toBeLessThan(noSim.score);
  });

  it('clamps between 0 and 100', () => {
    const veryBad = computeConfidence(0, 'bärisch', sim({ hitRatePct: 10 }), { imminent: true, veryImminent: true, nextHighImpact: null, hoursUntilNextHighImpact: 1, plainSummary: '' }, 'risk-off');
    expect(veryBad.score).toBeGreaterThanOrEqual(0);
    const veryGood = computeConfidence(3, 'bullisch', sim({ hitRatePct: 80 }), null, 'risk-on');
    expect(veryGood.score).toBeLessThanOrEqual(100);
  });
});

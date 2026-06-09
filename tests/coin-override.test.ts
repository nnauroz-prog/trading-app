import { describe, expect, it } from 'vitest';
import { applyCoinAdjustment, type CoinOverride, type CoinOverrideFactor } from '@/lib/agents/coin-override';

function override(factors: CoinOverrideFactor[]): CoinOverride {
  return { coinId: 'btc', factors, updatedAt: 0 };
}

describe('applyCoinAdjustment', () => {
  it('null override → neutral, kein Veto', () => {
    const adj = applyCoinAdjustment(null);
    expect(adj.scoreDelta).toBe(0);
    expect(adj.capped).toBe(false);
    expect(adj.factors).toEqual([]);
    expect(adj.hardVeto).toBe(false);
  });

  it('leerer Faktoren-Array → neutral', () => {
    const adj = applyCoinAdjustment(override([]));
    expect(adj.scoreDelta).toBe(0);
  });

  it('Major-Event → +10 Score', () => {
    const adj = applyCoinAdjustment(override(['major-event-today']));
    expect(adj.scoreDelta).toBe(10);
    expect(adj.hardVeto).toBe(false);
  });

  it('Whale-Verkauf → -10 Score', () => {
    const adj = applyCoinAdjustment(override(['whale-selling-visible']));
    expect(adj.scoreDelta).toBe(-10);
  });

  it('Token-Unlock → -15 Score UND hardVeto', () => {
    const adj = applyCoinAdjustment(override(['large-unlock-today']));
    expect(adj.scoreDelta).toBe(-15);
    expect(adj.hardVeto).toBe(true);
  });

  it('Manuelles Misstrauen → -20 Score UND hardVeto', () => {
    const adj = applyCoinAdjustment(override(['manual-distrust']));
    expect(adj.scoreDelta).toBe(-20);
    expect(adj.hardVeto).toBe(true);
  });

  it('Faktoren stapeln additiv', () => {
    const adj = applyCoinAdjustment(override(['major-event-today', 'whale-accumulating', 'manual-conviction']));
    // 10 + 5 + 10 = 25
    expect(adj.scoreDelta).toBe(25);
    expect(adj.hardVeto).toBe(false);
  });

  it('Cap auf +25: positive Stapel werden geclamped', () => {
    const adj = applyCoinAdjustment(override(['major-event-today', 'whale-accumulating', 'manual-conviction', 'major-event-today']));
    expect(adj.scoreDelta).toBe(25);
    expect(adj.capped).toBe(true);
  });

  it('Cap auf -25: negative Stapel werden geclamped', () => {
    const adj = applyCoinAdjustment(override(['large-unlock-today', 'whale-selling-visible', 'regulatory-uncertainty', 'manual-distrust']));
    // -15 -10 -10 -20 = -55 → -25
    expect(adj.scoreDelta).toBe(-25);
    expect(adj.capped).toBe(true);
    expect(adj.hardVeto).toBe(true);
  });

  it('Gemischte Faktoren saldieren korrekt', () => {
    const adj = applyCoinAdjustment(override(['major-event-today', 'whale-selling-visible']));
    expect(adj.scoreDelta).toBe(0); // +10 - 10
    expect(adj.hardVeto).toBe(false);
  });

  it('hardVeto bleibt bestehen auch wenn Delta gemixt ist', () => {
    // Manual-conviction +10 stoppt hardVeto vom Unlock NICHT.
    const adj = applyCoinAdjustment(override(['large-unlock-today', 'manual-conviction']));
    expect(adj.hardVeto).toBe(true);
  });

  it('Unbekannter Faktor wird ignoriert', () => {
    // @ts-expect-error testing forward-compat
    const adj = applyCoinAdjustment(override(['no-such-factor']));
    expect(adj.scoreDelta).toBe(0);
  });
});

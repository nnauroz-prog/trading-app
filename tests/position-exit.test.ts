import { describe, expect, it } from 'vitest';
import { Position } from '@/lib/types/positions';
import { evaluatePositionExit } from '@/lib/risk/position-exit';

function pos(overrides: Partial<Position>): Position {
  return {
    id: 'p1',
    underlying: 'BTC',
    ticker: 'BTC',
    instrumentType: 'crypto',
    broker: 'Coinbase',
    entryPrice: 100,
    entryDate: Date.now(),
    positionSize: 1,
    investmentQuote: 100,
    currency: 'EUR',
    stopLossPlanned: 95,
    takeProfitPlanned: 115,
    thesis: '',
    status: 'open',
    notes: '',
    ...overrides
  };
}

describe('evaluatePositionExit', () => {
  it('returns null for closed positions or missing price', () => {
    expect(evaluatePositionExit(pos({ status: 'closed_win' }), 100)).toBeNull();
    expect(evaluatePositionExit(pos({}), null)).toBeNull();
    expect(evaluatePositionExit(pos({}), 0)).toBeNull();
  });

  it('says VERKAUFEN when price is at or below the stop', () => {
    expect(evaluatePositionExit(pos({}), 95)?.verdict).toBe('STOP_HIT');
    expect(evaluatePositionExit(pos({}), 90)?.verdict).toBe('STOP_HIT');
    expect(evaluatePositionExit(pos({}), 90)?.tone).toBe('sell');
  });

  it('says GEWINN SICHERN when price reaches the target', () => {
    const s = evaluatePositionExit(pos({}), 116);
    expect(s?.verdict).toBe('TARGET_HIT');
    expect(s?.tone).toBe('trim');
  });

  it('suggests trailing the stop to break-even once halfway to target', () => {
    // entry 100, target 115 -> halfway 107.5; stop 95 (< entry)
    const s = evaluatePositionExit(pos({}), 110);
    expect(s?.verdict).toBe('TRAIL_STOP');
  });

  it('does not suggest trailing again if stop already at/above entry', () => {
    const s = evaluatePositionExit(pos({ stopLossPlanned: 100 }), 110);
    expect(s?.verdict).not.toBe('TRAIL_STOP');
    expect(s?.verdict).toBe('HOLD');
  });

  it('warns when hovering just above the stop', () => {
    // stop 95, within 1.5% -> <= 96.425
    const s = evaluatePositionExit(pos({ takeProfitPlanned: null }), 96);
    expect(s?.verdict).toBe('NEAR_STOP');
  });

  it('flags a missing stop while holding', () => {
    const s = evaluatePositionExit(pos({ stopLossPlanned: null, takeProfitPlanned: null }), 101);
    expect(s?.verdict).toBe('HOLD');
    expect(s?.action.toLowerCase()).toContain('stop');
  });

  it('holds when between entry and target with a valid stop', () => {
    const s = evaluatePositionExit(pos({}), 102);
    expect(s?.verdict).toBe('HOLD');
    expect(s?.tone).toBe('hold');
  });
});

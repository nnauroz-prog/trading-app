import { describe, expect, it } from 'vitest';
import { IntelSnapshot, computeIntelAccuracy } from '@/lib/intel/memory';

function snap(over: Partial<IntelSnapshot>): IntelSnapshot {
  return {
    date: '2026-05-01', recordedAt: Date.now(),
    netSignal: 'neutral',
    riskOnCount: 0, riskOffCount: 0, neutralCount: 0,
    lagebericht: '',
    btcPriceAtRecord: 100000,
    specialistVotes: [],
    ...over
  };
}

describe('computeIntelAccuracy', () => {
  it('returns no accuracy with fewer than 2 entries', () => {
    expect(computeIntelAccuracy([]).hitRatePct).toBeNull();
    expect(computeIntelAccuracy([snap({})]).hitRatePct).toBeNull();
  });

  it('counts a risk-on call as right when BTC moved up', () => {
    const log: IntelSnapshot[] = [
      snap({ date: '2026-05-01', netSignal: 'risk-on', btcPriceAtRecord: 100000 }),
      snap({ date: '2026-05-02', netSignal: 'neutral', btcPriceAtRecord: 102000 })
    ];
    const a = computeIntelAccuracy(log);
    expect(a.rightCalls).toBe(1);
    expect(a.wrongCalls).toBe(0);
    expect(a.hitRatePct).toBe(100);
  });

  it('counts a risk-off call as right when BTC dropped', () => {
    const log: IntelSnapshot[] = [
      snap({ date: '2026-05-01', netSignal: 'risk-off', btcPriceAtRecord: 100000 }),
      snap({ date: '2026-05-02', netSignal: 'neutral', btcPriceAtRecord: 97000 })
    ];
    expect(computeIntelAccuracy(log).rightCalls).toBe(1);
  });

  it('counts a neutral call as right when BTC stayed flat', () => {
    const log: IntelSnapshot[] = [
      snap({ date: '2026-05-01', netSignal: 'neutral', btcPriceAtRecord: 100000 }),
      snap({ date: '2026-05-02', netSignal: 'neutral', btcPriceAtRecord: 100200 })
    ];
    expect(computeIntelAccuracy(log).rightCalls).toBe(1);
  });

  it('counts a risk-on call as wrong when BTC dropped', () => {
    const log: IntelSnapshot[] = [
      snap({ date: '2026-05-01', netSignal: 'risk-on', btcPriceAtRecord: 100000 }),
      snap({ date: '2026-05-02', netSignal: 'neutral', btcPriceAtRecord: 97000 })
    ];
    expect(computeIntelAccuracy(log).wrongCalls).toBe(1);
  });

  it('tracks per-specialist accuracy across multiple days', () => {
    const log: IntelSnapshot[] = [
      snap({ date: '2026-05-01', netSignal: 'risk-on', btcPriceAtRecord: 100,
        specialistVotes: [{ id: 's1', title: 'A', signal: 'risk-on' }, { id: 's2', title: 'B', signal: 'risk-off' }] }),
      snap({ date: '2026-05-02', netSignal: 'risk-on', btcPriceAtRecord: 102,
        specialistVotes: [{ id: 's1', title: 'A', signal: 'risk-on' }, { id: 's2', title: 'B', signal: 'risk-off' }] }),
      snap({ date: '2026-05-03', netSignal: 'risk-on', btcPriceAtRecord: 105,
        specialistVotes: [{ id: 's1', title: 'A', signal: 'risk-on' }, { id: 's2', title: 'B', signal: 'risk-off' }] })
    ];
    const a = computeIntelAccuracy(log);
    const s1 = a.perSpecialist.find((s) => s.id === 's1');
    const s2 = a.perSpecialist.find((s) => s.id === 's2');
    expect(s1?.hitRatePct).toBe(100);
    expect(s2?.hitRatePct).toBe(0);
  });

  it('skips entries without BTC price', () => {
    const log: IntelSnapshot[] = [
      snap({ date: '2026-05-01', netSignal: 'risk-on', btcPriceAtRecord: null }),
      snap({ date: '2026-05-02', netSignal: 'neutral', btcPriceAtRecord: 102000 })
    ];
    expect(computeIntelAccuracy(log).evaluated).toBe(0);
  });
});

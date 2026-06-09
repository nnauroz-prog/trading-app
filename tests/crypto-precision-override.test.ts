import { describe, expect, it } from 'vitest';
import {
  applyUserOverrideToPrecision,
  applyUserOverridesToAll,
  DOWNGRADE_DELTA_THRESHOLD
} from '@/lib/analysis/crypto-precision-override';
import type { CoinAdjustment } from '@/lib/agents/coin-override';

function adj(over: Partial<CoinAdjustment> = {}): CoinAdjustment {
  return { scoreDelta: 0, capped: false, factors: ['Pers. Misstrauen'], hardVeto: false, ...over };
}

const freigabePick = { coinId: 'btc', symbol: 'BTC', verdict: 'FREIGABE' as const };
const beobachtenPick = { coinId: 'eth', symbol: 'ETH', verdict: 'BEOBACHTEN' as const };
const blockedPick = { coinId: 'doge', symbol: 'DOGE', verdict: 'NICHT_VERWENDEN' as const };

describe('applyUserOverrideToPrecision', () => {
  it('Kein Override → unveraendert', () => {
    const r = applyUserOverrideToPrecision(freigabePick, null);
    expect(r.changed).toBe(false);
    expect(r.adjustedVerdict).toBe('FREIGABE');
  });

  it('Leere Faktoren → unveraendert', () => {
    const r = applyUserOverrideToPrecision(freigabePick, adj({ factors: [] }));
    expect(r.changed).toBe(false);
  });

  it('Hard-Veto kippt FREIGABE auf NICHT_VERWENDEN', () => {
    const r = applyUserOverrideToPrecision(freigabePick, adj({ hardVeto: true, scoreDelta: -20 }));
    expect(r.changed).toBe(true);
    expect(r.adjustedVerdict).toBe('NICHT_VERWENDEN');
    expect(r.reason).toContain('Veto');
  });

  it('Hard-Veto kippt auch BEOBACHTEN', () => {
    const r = applyUserOverrideToPrecision(beobachtenPick, adj({ hardVeto: true, scoreDelta: -20 }));
    expect(r.adjustedVerdict).toBe('NICHT_VERWENDEN');
  });

  it('Hard-Veto auf bereits blockiertem Pick → kein doppeltes changed', () => {
    const r = applyUserOverrideToPrecision(blockedPick, adj({ hardVeto: true, scoreDelta: -20 }));
    expect(r.changed).toBe(false);
    expect(r.adjustedVerdict).toBe('NICHT_VERWENDEN');
  });

  it('Delta <= -15 ohne Veto stuft FREIGABE auf BEOBACHTEN', () => {
    const r = applyUserOverrideToPrecision(freigabePick, adj({ scoreDelta: DOWNGRADE_DELTA_THRESHOLD }));
    expect(r.changed).toBe(true);
    expect(r.adjustedVerdict).toBe('BEOBACHTEN');
  });

  it('Delta -10 (ueber Schwelle) aendert FREIGABE nicht', () => {
    const r = applyUserOverrideToPrecision(freigabePick, adj({ scoreDelta: -10 }));
    expect(r.changed).toBe(false);
    expect(r.adjustedVerdict).toBe('FREIGABE');
  });

  it('Delta <= -15 stuft BEOBACHTEN nicht weiter herab (nur FREIGABE)', () => {
    const r = applyUserOverrideToPrecision(beobachtenPick, adj({ scoreDelta: -20 }));
    expect(r.changed).toBe(false);
    expect(r.adjustedVerdict).toBe('BEOBACHTEN');
  });

  it('Positives Delta kann NIE auf FREIGABE hochstufen — nur Notiz', () => {
    const r = applyUserOverrideToPrecision(beobachtenPick, adj({ scoreDelta: 20, factors: ['Pers. Ueberzeugung'] }));
    expect(r.changed).toBe(false);
    expect(r.adjustedVerdict).toBe('BEOBACHTEN');
    expect(r.convictionNote).toContain('Conviction');
  });

  it('Positives Delta auf FREIGABE → keine Notiz noetig', () => {
    const r = applyUserOverrideToPrecision(freigabePick, adj({ scoreDelta: 10 }));
    expect(r.convictionNote).toBeNull();
  });
});

describe('applyUserOverridesToAll', () => {
  it('Mappt pro Coin den richtigen Adjustment', () => {
    const adjustments: Record<string, CoinAdjustment> = {
      btc: adj({ hardVeto: true, scoreDelta: -20 }),
      eth: adj({ scoreDelta: 5, factors: ['Whale akkumuliert'] })
    };
    const out = applyUserOverridesToAll(
      [freigabePick, beobachtenPick, blockedPick],
      (id) => adjustments[id] ?? null
    );
    expect(out[0].adjustedVerdict).toBe('NICHT_VERWENDEN'); // btc veto
    expect(out[1].adjustedVerdict).toBe('BEOBACHTEN');      // eth conviction, kein Upgrade
    expect(out[1].convictionNote).not.toBeNull();
    expect(out[2].changed).toBe(false);                       // doge ohne Override
  });
});

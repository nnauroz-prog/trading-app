import { describe, expect, it } from 'vitest';
import { computeFirmaPnl, evaluateTradePnl } from '@/lib/agents/firma-pnl';
import type { FirmaDecision } from '@/lib/firma-memory';
import type { PersonaId } from '@/lib/agents/personas';

function dec(over: Partial<FirmaDecision> = {}): FirmaDecision {
  return {
    date: '2026-05-01',
    recordedAt: 0,
    firma: 'conservative' as PersonaId,
    firmaName: 'Konservativ',
    verdict: 'BUY',
    coin: 'BTC',
    entry: 100,
    stopLoss: 95,
    takeProfit1: 110,
    safetyGrade: 'A',
    passedCount: 9,
    analystVote: 'POSITIV',
    scoutVote: 'STARK',
    riskVote: 'OK',
    ceoFinalWord: '',
    ...over
  };
}

describe('evaluateTradePnl', () => {
  it('WAIT-Entscheidungen werden uebersprungen', () => {
    expect(evaluateTradePnl(dec({ verdict: 'WAIT' }), 100)).toBeNull();
  });

  it('Fehlende Levels → null', () => {
    expect(evaluateTradePnl(dec({ entry: null }), 100)).toBeNull();
    expect(evaluateTradePnl(dec({ stopLoss: null }), 100)).toBeNull();
    expect(evaluateTradePnl(dec({ takeProfit1: null }), 100)).toBeNull();
    expect(evaluateTradePnl(dec({ coin: null }), 100)).toBeNull();
  });

  it('current = null → NO_DATA, kein P&L', () => {
    const t = evaluateTradePnl(dec(), null);
    expect(t!.outcome).toBe('NO_DATA');
    expect(t!.pnlPct).toBeNull();
  });

  it('current >= TP1 → HIT_TP, realisierter Gewinn ist (TP-Entry)/Entry', () => {
    const t = evaluateTradePnl(dec({ entry: 100, takeProfit1: 110 }), 115);
    expect(t!.outcome).toBe('HIT_TP');
    expect(t!.pnlPct).toBe(10);
  });

  it('current <= SL → HIT_SL, realisierter Verlust ist (SL-Entry)/Entry', () => {
    const t = evaluateTradePnl(dec({ entry: 100, stopLoss: 95 }), 90);
    expect(t!.outcome).toBe('HIT_SL');
    expect(t!.pnlPct).toBe(-5);
  });

  it('current zwischen SL und TP1 → OPEN, schwebender P&L', () => {
    const t = evaluateTradePnl(dec({ entry: 100 }), 103);
    expect(t!.outcome).toBe('OPEN');
    expect(t!.pnlPct).toBe(3);
  });

  it('current genau auf TP1 → HIT_TP (Grenze inklusiv)', () => {
    const t = evaluateTradePnl(dec({ entry: 100, takeProfit1: 110 }), 110);
    expect(t!.outcome).toBe('HIT_TP');
  });

  it('current genau auf SL → HIT_SL (Grenze inklusiv)', () => {
    const t = evaluateTradePnl(dec({ entry: 100, stopLoss: 95 }), 95);
    expect(t!.outcome).toBe('HIT_SL');
  });
});

describe('computeFirmaPnl', () => {
  it('leeres Log → keine Zeilen', () => {
    const out = computeFirmaPnl([], () => null);
    expect(out).toEqual([]);
  });

  it('gruppiert pro Firma, sortiert konservativ→balanced→aggressive', () => {
    const log = [
      dec({ firma: 'aggressive', firmaName: 'A' }),
      dec({ firma: 'conservative', firmaName: 'K' }),
      dec({ firma: 'balanced', firmaName: 'B' })
    ];
    const out = computeFirmaPnl(log, () => 105);
    expect(out.map((r) => r.firma)).toEqual(['conservative', 'balanced', 'aggressive']);
  });

  it('aggregiert TP/SL/OPEN korrekt und summiert P&L gleich-gewichtet', () => {
    const log = [
      dec({ firma: 'conservative', date: '2026-05-01', coin: 'BTC', entry: 100, stopLoss: 90, takeProfit1: 110 }),
      dec({ firma: 'conservative', date: '2026-05-02', coin: 'ETH', entry: 200, stopLoss: 180, takeProfit1: 220 }),
      dec({ firma: 'conservative', date: '2026-05-03', coin: 'SOL', entry: 50, stopLoss: 45, takeProfit1: 55 })
    ];
    const prices = new Map<string, number>([['BTC', 115], ['ETH', 170], ['SOL', 52]]);
    const out = computeFirmaPnl(log, (sym) => prices.get(sym) ?? null);
    const k = out[0];
    expect(k.totalBuys).toBe(3);
    expect(k.wins).toBe(1);  // BTC → HIT_TP (+10)
    expect(k.losses).toBe(1); // ETH → HIT_SL (-10)
    expect(k.openTrades).toBe(1); // SOL → OPEN (+4)
    expect(k.resolvedTrades).toBe(2);
    expect(k.resolvedHitRatePct).toBe(50);
    // BTC +10, ETH -10, SOL +4 = +4
    expect(k.totalPnlPct).toBe(4);
    expect(k.avgPnlPct).toBeCloseTo(1.33, 1);
    expect(k.bestTradePct).toBe(10);
    expect(k.worstTradePct).toBe(-10);
  });

  it('Trades sortiert nach Datum descending, max 20 zurueck', () => {
    const log: FirmaDecision[] = [];
    for (let i = 1; i <= 25; i++) {
      log.push(dec({ firma: 'balanced', date: `2026-05-${String(i).padStart(2, '0')}`, coin: `C${i}`, entry: 100 + i, stopLoss: 95 + i, takeProfit1: 110 + i }));
    }
    const out = computeFirmaPnl(log, (sym) => Number(sym.slice(1)) + 105);
    expect(out[0].trades.length).toBe(20);
    expect(out[0].trades[0].date).toBe('2026-05-25');
  });

  it('WAIT-Entscheidungen + invalide Levels werden uebersprungen', () => {
    const log = [
      dec({ firma: 'aggressive', verdict: 'WAIT' }),
      dec({ firma: 'aggressive', entry: null }),
      dec({ firma: 'aggressive', date: '2026-05-05', coin: 'BTC', entry: 100, stopLoss: 95, takeProfit1: 110 })
    ];
    const out = computeFirmaPnl(log, () => 115);
    expect(out[0].totalBuys).toBe(1);
    expect(out[0].wins).toBe(1);
  });

  it('hitRatePct null wenn keine resolved trades', () => {
    const log = [dec({ entry: 100, stopLoss: 95, takeProfit1: 110 })];
    const out = computeFirmaPnl(log, () => 102); // OPEN
    expect(out[0].resolvedHitRatePct).toBeNull();
    expect(out[0].openTrades).toBe(1);
  });
});

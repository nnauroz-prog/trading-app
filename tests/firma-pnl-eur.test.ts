import { describe, expect, it } from 'vitest';
import { projectFirmaPnlEur } from '@/lib/agents/firma-pnl-eur';
import type { FirmaPnlSummary } from '@/lib/agents/firma-pnl';

function summary(over: Partial<FirmaPnlSummary> = {}): FirmaPnlSummary {
  return {
    firma: 'conservative',
    firmaName: 'Konservativ',
    totalBuys: 10,
    resolvedTrades: 8,
    wins: 5,
    losses: 3,
    openTrades: 2,
    resolvedHitRatePct: 63,
    totalPnlPct: 25, // Summe der Prozent ueber alle bewertbaren Trades
    avgPnlPct: 2.5,
    bestTradePct: 10,
    worstTradePct: -5,
    equityCurve: [0],
    maxDrawdownPct: 0,
    trades: [],
    ...over
  };
}

describe('projectFirmaPnlEur', () => {
  it('100 EUR pro BUY, 10 bewertbare Trades, +25 % Summe → 1000 invested + 25 profit', () => {
    // totalPnlPct ist die SUMME der prozent-Gewinne ueber alle Trades.
    // Bei gleich-gewichtet €100 pro Trade: Profit = 100 × (25/100) = €25.
    // Das entspricht avgPnlPct (2.5 %) ueber €1000 Gesamt-Investition.
    const out = projectFirmaPnlEur(summary({ wins: 5, losses: 3, openTrades: 2, totalPnlPct: 25, avgPnlPct: 2.5 }), 100);
    expect(out.investedEur).toBe(1000);
    expect(out.profitEur).toBe(25);
    expect(out.currentWorthEur).toBe(1025);
    expect(out.profitPct).toBe(2.5); // entspricht avgPnlPct
    expect(out.evaluableTrades).toBe(10);
  });

  it('negativer P&L wird als Minus-Profit ausgegeben', () => {
    const out = projectFirmaPnlEur(summary({ wins: 2, losses: 6, openTrades: 0, totalPnlPct: -40, avgPnlPct: -5 }), 100);
    expect(out.investedEur).toBe(800);
    expect(out.profitEur).toBe(-40);
    expect(out.currentWorthEur).toBe(760);
    expect(out.profitPct).toBe(-5);
  });

  it('0 bewertbare Trades → alles 0', () => {
    const out = projectFirmaPnlEur(summary({ wins: 0, losses: 0, openTrades: 0, totalPnlPct: 0 }), 100);
    expect(out.investedEur).toBe(0);
    expect(out.profitEur).toBe(0);
    expect(out.currentWorthEur).toBe(0);
    expect(out.profitPct).toBe(0);
  });

  it('Betrag 0 oder negativ → kein investiertes Kapital', () => {
    const out = projectFirmaPnlEur(summary({ wins: 3, losses: 0, openTrades: 0, totalPnlPct: 15 }), 0);
    expect(out.investedEur).toBe(0);
    expect(out.profitEur).toBe(0);
    expect(out.profitPct).toBe(0);
  });

  it('NaN-Betrag wird auf 0 gefiltert', () => {
    const out = projectFirmaPnlEur(summary({ wins: 3, losses: 0, openTrades: 0, totalPnlPct: 15 }), NaN);
    expect(out.investedEur).toBe(0);
    expect(out.profitEur).toBe(0);
  });

  it('250 EUR pro BUY, 6 Trades, +18 % Summe → 1500 invested + 45 profit', () => {
    // 250 × 0.18 = 45 absoluter Profit, 45/1500 = 3 % (= avgPnlPct)
    const out = projectFirmaPnlEur(summary({ wins: 4, losses: 1, openTrades: 1, totalPnlPct: 18, avgPnlPct: 3 }), 250);
    expect(out.investedEur).toBe(1500);
    expect(out.profitEur).toBe(45);
    expect(out.currentWorthEur).toBe(1545);
    expect(out.profitPct).toBe(3);
  });

  it('Rundung: Cent-genau auf 2 Stellen', () => {
    const out = projectFirmaPnlEur(summary({ wins: 3, losses: 0, openTrades: 0, totalPnlPct: 7.7 }), 333.33);
    expect(out.investedEur).toBe(999.99);
    // 333.33 × 0.077 ≈ 25.67 EUR Profit (Summe ueber alle Trades, nicht ueber jedes investierte 333.33)
    expect(out.profitEur).toBeCloseTo(25.67, 1);
  });
});

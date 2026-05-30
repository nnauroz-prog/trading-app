import { unstable_cache } from 'next/cache';
import { runStrategyBacktest } from '@/lib/analysis/strategy-backtest';

export interface AssetEdge {
  winRatePct: number | null;
  expectancyPct: number;
}

export interface TierStat {
  trades: number;
  winRatePct: number;
  netReturnPct: number;
  medianHoldHours: number | null;
  equityCurve: number[]; // cumulative net % return after each safe trade
  maxDrawdownPct: number; // largest peak-to-trough drop in the curve (<=0)
  tradeSharpe: number | null; // per-trade mean/stdev of net returns
  profitFactor: number | null; // gross wins / gross losses (>=0)
}

export interface BacktestSummary {
  available: boolean;
  trades: number;
  winRatePct: number | null;
  netReturnPct: number;
  periodDays: number;
  perAssetEdge: Record<string, AssetEdge>;
  safeTier: TierStat | null;
}

const UNAVAILABLE: BacktestSummary = { available: false, trades: 0, winRatePct: null, netReturnPct: 0, periodDays: 0, perAssetEdge: {}, safeTier: null };

// Confluence threshold (within the backtest's own 12-check grid) that mirrors
// the "safe" tier shown live (>=9/12).
const SAFE_TIER_CONFLUENCE = 9;

async function compute(): Promise<BacktestSummary> {
  try {
    const r = await runStrategyBacktest(['btc', 'eth', 'sol']);
    if (r.dataSource === 'offline' || r.combined.totalSignals === 0) return UNAVAILABLE;
    const perAssetEdge: Record<string, AssetEdge> = {};
    for (const a of r.perAsset) {
      perAssetEdge[a.assetId] = {
        winRatePct: a.winRate !== null ? Math.round(a.winRate * 100) : null,
        expectancyPct: a.expectancyPct
      };
    }

    const safeTrades = r.perAsset
      .flatMap((a) => a.trades)
      .filter((t) => t.confluence >= SAFE_TIER_CONFLUENCE)
      .sort((a, b) => a.entryTime - b.entryTime);
    const safeWins = safeTrades.filter((t) => t.outcome === 'TP1').length;
    const holdBarsSorted = safeTrades.map((t) => t.holdBars).sort((a, b) => a - b);
    const medianHoldHours = holdBarsSorted.length > 0 ? holdBarsSorted[Math.floor(holdBarsSorted.length / 2)] : null;
    let eq = 0;
    const equityCurve: number[] = [0];
    for (const t of safeTrades) {
      eq += t.netPnlPct;
      equityCurve.push(eq);
    }
    let peak = -Infinity;
    let maxDrawdownPct = 0;
    for (const v of equityCurve) {
      if (v > peak) peak = v;
      const dd = v - peak;
      if (dd < maxDrawdownPct) maxDrawdownPct = dd;
    }
    let tradeSharpe: number | null = null;
    if (safeTrades.length >= 2) {
      const returns = safeTrades.map((t) => t.netPnlPct);
      const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
      const variance = returns.reduce((s, r) => s + (r - mean) * (r - mean), 0) / (returns.length - 1);
      const stdev = Math.sqrt(variance);
      tradeSharpe = stdev > 0 ? mean / stdev : null;
    }
    const grossWin = safeTrades.filter((t) => t.netPnlPct > 0).reduce((s, t) => s + t.netPnlPct, 0);
    const grossLoss = -safeTrades.filter((t) => t.netPnlPct < 0).reduce((s, t) => s + t.netPnlPct, 0);
    const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : null;
    const safeTier: TierStat | null =
      safeTrades.length > 0
        ? {
            trades: safeTrades.length,
            winRatePct: Math.round((safeWins / safeTrades.length) * 100),
            netReturnPct: eq,
            medianHoldHours,
            equityCurve,
            maxDrawdownPct,
            tradeSharpe,
            profitFactor
          }
        : null;

    return {
      available: true,
      trades: r.combined.totalSignals,
      winRatePct: r.combined.winRate !== null ? Math.round(r.combined.winRate * 100) : null,
      netReturnPct: r.combined.netReturnPct,
      periodDays: r.periodDays,
      perAssetEdge,
      safeTier
    };
  } catch {
    return UNAVAILABLE;
  }
}

// The backtest is heavy (thousands of candles) and only changes as new history
// accrues, so cache it for 30 minutes rather than recomputing on every render.
export const getBacktestSummary = unstable_cache(compute, ['backtest-summary-v1'], { revalidate: 1800 });

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
    const safeTier: TierStat | null =
      safeTrades.length > 0
        ? {
            trades: safeTrades.length,
            winRatePct: Math.round((safeWins / safeTrades.length) * 100),
            netReturnPct: eq,
            medianHoldHours,
            equityCurve
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

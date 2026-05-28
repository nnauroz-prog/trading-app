import { unstable_cache } from 'next/cache';
import { runStrategyBacktest } from '@/lib/analysis/strategy-backtest';

export interface AssetEdge {
  winRatePct: number | null;
  expectancyPct: number;
}

export interface BacktestSummary {
  available: boolean;
  trades: number;
  winRatePct: number | null;
  netReturnPct: number;
  periodDays: number;
  perAssetEdge: Record<string, AssetEdge>;
}

const UNAVAILABLE: BacktestSummary = { available: false, trades: 0, winRatePct: null, netReturnPct: 0, periodDays: 0, perAssetEdge: {} };

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
    return {
      available: true,
      trades: r.combined.totalSignals,
      winRatePct: r.combined.winRate !== null ? Math.round(r.combined.winRate * 100) : null,
      netReturnPct: r.combined.netReturnPct,
      periodDays: r.periodDays,
      perAssetEdge
    };
  } catch {
    return UNAVAILABLE;
  }
}

// The backtest is heavy (thousands of candles) and only changes as new history
// accrues, so cache it for 30 minutes rather than recomputing on every render.
export const getBacktestSummary = unstable_cache(compute, ['backtest-summary-v1'], { revalidate: 1800 });

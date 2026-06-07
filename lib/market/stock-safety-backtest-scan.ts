// Aggregierter Backtest des 8-Punkt-Sicherheits-Gates über das gesamte
// Aktien-Universum. Beweist mit echten historischen Tageskerzen, ob
// „Grade A" in der Vergangenheit tatsächlich tragbar war. 24h Cache.

import { unstable_cache } from 'next/cache';
import { STOCK_UNIVERSE } from '@/lib/market/stocks';
import { fetchYahooHistory } from '@/lib/market/yahoo-history';
import { backtestSafetyStrategy, type SafetyTrade } from '@/lib/market/instrument-safety-backtest';

export interface PerAssetBacktest {
  symbol: string;
  name: string;
  totalTrades: number;
  winRatePct: number | null;
  avgPnlPct: number;
  totalReturnPct: number;
  buyAndHoldReturnPct: number;
}

export interface SafetyBacktestSummary {
  available: boolean;
  totalTrades: number;
  combinedWinRatePct: number | null;
  combinedAvgPnlPct: number;
  // Aggregate Buy-and-Hold Benchmark über alle gescannten Aktien.
  combinedBuyAndHoldPct: number;
  // Pro-Asset-Sicht für die UI-Tabelle.
  perAsset: PerAssetBacktest[];
  bestTradePct: number | null;
  worstTradePct: number | null;
  totalAssetsScanned: number;
}

const UNAVAILABLE: SafetyBacktestSummary = {
  available: false,
  totalTrades: 0,
  combinedWinRatePct: null,
  combinedAvgPnlPct: 0,
  combinedBuyAndHoldPct: 0,
  perAsset: [],
  bestTradePct: null,
  worstTradePct: null,
  totalAssetsScanned: 0
};

async function compute(): Promise<SafetyBacktestSummary> {
  const perAsset: PerAssetBacktest[] = [];
  const allTrades: SafetyTrade[] = [];
  const buyAndHolds: number[] = [];

  await Promise.all(
    STOCK_UNIVERSE.map(async (s) => {
      const history = await fetchYahooHistory(s.symbol);
      if (!history || history.candles.length < 220) return;
      const result = backtestSafetyStrategy(history.candles);
      perAsset.push({
        symbol: s.symbol,
        name: s.name,
        totalTrades: result.totalTrades,
        winRatePct: result.winRatePct,
        avgPnlPct: result.avgPnlPct,
        totalReturnPct: result.totalReturnPct,
        buyAndHoldReturnPct: result.buyAndHoldReturnPct
      });
      allTrades.push(...result.trades);
      buyAndHolds.push(result.buyAndHoldReturnPct);
    })
  );

  if (perAsset.length === 0) return UNAVAILABLE;

  perAsset.sort((a, b) => b.totalReturnPct - a.totalReturnPct);

  const wins = allTrades.filter((t) => t.pnlPct >= 0).length;
  const combinedAvg = allTrades.length > 0 ? allTrades.reduce((s, t) => s + t.pnlPct, 0) / allTrades.length : 0;
  const combinedBnH = buyAndHolds.length > 0 ? buyAndHolds.reduce((s, v) => s + v, 0) / buyAndHolds.length : 0;
  const pnlValues = allTrades.map((t) => t.pnlPct);

  return {
    available: true,
    totalTrades: allTrades.length,
    combinedWinRatePct: allTrades.length > 0 ? Math.round((wins / allTrades.length) * 100) : null,
    combinedAvgPnlPct: combinedAvg,
    combinedBuyAndHoldPct: combinedBnH,
    perAsset,
    bestTradePct: pnlValues.length > 0 ? Math.max(...pnlValues) : null,
    worstTradePct: pnlValues.length > 0 ? Math.min(...pnlValues) : null,
    totalAssetsScanned: perAsset.length
  };
}

// 24h Cache — Backtest ändert sich nur, wenn neue Tagesschlüsse dazukommen.
export const getStockSafetyBacktestSummary = unstable_cache(
  compute,
  ['stock-safety-backtest-v1'],
  { revalidate: 60 * 60 * 24 }
);

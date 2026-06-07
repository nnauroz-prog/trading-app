// Backtest des 8-Punkt-Sicherheits-Gates über das gesamte Rohstoff-Universum.
// Gleicher Mechanismus wie der Aktien-Backtest, nur über COMMODITY_UNIVERSE.

import { unstable_cache } from 'next/cache';
import { COMMODITY_UNIVERSE } from '@/lib/market/commodities';
import { fetchYahooHistory } from '@/lib/market/yahoo-history';
import { backtestSafetyStrategy, type SafetyTrade } from '@/lib/market/instrument-safety-backtest';

export interface PerCommodityBacktest {
  symbol: string;
  name: string;
  group: string;
  totalTrades: number;
  winRatePct: number | null;
  avgPnlPct: number;
  totalReturnPct: number;
  buyAndHoldReturnPct: number;
}

export interface CommoditySafetyBacktestSummary {
  available: boolean;
  totalTrades: number;
  combinedWinRatePct: number | null;
  combinedAvgPnlPct: number;
  combinedBuyAndHoldPct: number;
  perAsset: PerCommodityBacktest[];
  bestTradePct: number | null;
  worstTradePct: number | null;
  totalAssetsScanned: number;
}

const UNAVAILABLE: CommoditySafetyBacktestSummary = {
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

async function compute(): Promise<CommoditySafetyBacktestSummary> {
  const perAsset: PerCommodityBacktest[] = [];
  const allTrades: SafetyTrade[] = [];
  const buyAndHolds: number[] = [];

  await Promise.all(
    COMMODITY_UNIVERSE.map(async (c) => {
      const history = await fetchYahooHistory(c.symbol);
      if (!history || history.candles.length < 220) return;
      const result = backtestSafetyStrategy(history.candles);
      perAsset.push({
        symbol: c.symbol,
        name: c.name,
        group: c.group,
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

export const getCommoditySafetyBacktestSummary = unstable_cache(
  compute,
  ['commodity-safety-backtest-v1'],
  { revalidate: 60 * 60 * 24 }
);

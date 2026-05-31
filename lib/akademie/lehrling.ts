import { unstable_cache } from 'next/cache';
import { DEFAULT_STRATEGY_PARAMS, StrategyParams, fetchBacktestCandles, runStrategyBacktestOnCandles } from '@/lib/analysis/strategy-backtest';

export interface VariantResult {
  id: string;
  params: StrategyParams;
  totalTrades: number;
  winRatePct: number;
  netReturnPct: number;
  expectancyPct: number;
  isDefault: boolean;
  isBest: boolean;
}

export interface LehrlingReport {
  variants: VariantResult[];
  best: VariantResult | null;
  baseline: VariantResult | null;
  periodDays: number;
  generatedAt: string;
  dataSource: 'binance' | 'offline';
  totalVariantsTried: number;
}

// Small, bounded grid. Each axis has 3 values; total 3 * 3 * 2 = 18 variants.
// All run against the same fetched candle set — one HTTP round per asset.
const CONFLUENCE_VALUES = [6, 7, 8];
const STOP_VALUES = [1.0, 1.5, 2.0];
const TP1_VALUES = [2.0, 3.0];

function variantId(p: StrategyParams): string {
  return `c${p.minConfluence}-s${p.stopAtrMult.toFixed(1)}-t${p.tp1AtrMult.toFixed(1)}-h${p.maxHoldBars}`;
}

// Ranking score: prioritises expectancy (per-trade edge) over raw return so a
// variant that fires often with thin edge does not beat one with real signal.
// Slight penalty for variants with < 8 trades to avoid lucky one-shots.
function rankScore(r: VariantResult): number {
  const sampleAdjust = r.totalTrades < 8 ? -2 : 0;
  return r.expectancyPct * 10 + r.netReturnPct * 0.1 + sampleAdjust;
}

async function compute(): Promise<LehrlingReport> {
  const candles = await fetchBacktestCandles(['btc', 'eth', 'sol']);
  const variants: VariantResult[] = [];

  for (const c of CONFLUENCE_VALUES) {
    for (const s of STOP_VALUES) {
      for (const t of TP1_VALUES) {
        const params: StrategyParams = { minConfluence: c, stopAtrMult: s, tp1AtrMult: t, maxHoldBars: 72 };
        const report = runStrategyBacktestOnCandles(candles, params);
        variants.push({
          id: variantId(params),
          params,
          totalTrades: report.combined.totalSignals,
          winRatePct: report.combined.winRate !== null ? Math.round(report.combined.winRate * 1000) / 10 : 0,
          netReturnPct: Math.round(report.combined.netReturnPct * 10) / 10,
          expectancyPct: Math.round(report.combined.expectancyPct * 100) / 100,
          isDefault: false,
          isBest: false
        });
      }
    }
  }

  // Sort by rank score desc, mark best and default.
  variants.sort((a, b) => rankScore(b) - rankScore(a));
  if (variants.length > 0) variants[0].isBest = true;
  const defaultId = variantId(DEFAULT_STRATEGY_PARAMS);
  for (const v of variants) {
    if (v.id === defaultId) v.isDefault = true;
  }

  const best = variants[0] ?? null;
  const baseline = variants.find((v) => v.isDefault) ?? null;
  const periodDays = candles.length > 0
    ? Math.round((candles[0].c1h[candles[0].c1h.length - 1].openTime - candles[0].c1h[0].openTime) / (1000 * 60 * 60 * 24))
    : 0;

  return {
    variants,
    best,
    baseline,
    periodDays,
    generatedAt: new Date().toISOString(),
    dataSource: candles.length > 0 ? 'binance' : 'offline',
    totalVariantsTried: variants.length
  };
}

// 1h cache — sweeping 18 variants is heavy and price action over an hour
// won't meaningfully change which variant tops the leaderboard.
export const getLehrlingReport = unstable_cache(compute, ['lehrling-sweep-v1'], { revalidate: 3600 });

import { unstable_cache } from 'next/cache';
import {
  AssetCandles,
  DEFAULT_STRATEGY_PARAMS,
  StrategyParams,
  StrategyTrade,
  backtestStrategy,
  fetchBacktestCandles
} from '@/lib/analysis/strategy-backtest';

export interface WindowStats {
  totalTrades: number;
  winRatePct: number;
  netReturnPct: number;
  expectancyPct: number;
}

export interface VariantResult {
  id: string;
  params: StrategyParams;
  // Full window (kept for back-compat with existing UI/strip)
  totalTrades: number;
  winRatePct: number;
  netReturnPct: number;
  expectancyPct: number;
  // Walk-forward split
  train: WindowStats;
  test: WindowStats;
  isRobust: boolean;
  robustnessReason: string;
  isDefault: boolean;
  isBest: boolean;
}

export interface LehrlingReport {
  variants: VariantResult[];
  best: VariantResult | null;
  baseline: VariantResult | null;
  periodDays: number;
  trainDays: number;
  testDays: number;
  generatedAt: string;
  dataSource: 'binance' | 'offline';
  totalVariantsTried: number;
  robustCount: number;
  honestNote: string;
}

const CONFLUENCE_VALUES = [6, 7, 8];
const STOP_VALUES = [1.0, 1.5, 2.0];
const TP1_VALUES = [2.0, 3.0];

function variantId(p: StrategyParams): string {
  return `c${p.minConfluence}-s${p.stopAtrMult.toFixed(1)}-t${p.tp1AtrMult.toFixed(1)}-h${p.maxHoldBars}`;
}

function statsFromTrades(trades: StrategyTrade[]): WindowStats {
  if (trades.length === 0) return { totalTrades: 0, winRatePct: 0, netReturnPct: 0, expectancyPct: 0 };
  const wins = trades.filter((t) => t.outcome === 'TP1').length;
  const net = trades.reduce((s, t) => s + t.netPnlPct, 0);
  return {
    totalTrades: trades.length,
    winRatePct: Math.round((wins / trades.length) * 1000) / 10,
    netReturnPct: Math.round(net * 10) / 10,
    expectancyPct: Math.round((net / trades.length) * 100) / 100
  };
}

// Robustness: a variant is "robust" only if BOTH windows produced a
// meaningful sample (≥3 trades each), the test-window expectancy has the
// same sign as the train-window expectancy, and the test result is no
// worse than half the train result. Anything else is overfit-prone.
function judgeRobustness(train: WindowStats, test: WindowStats): { robust: boolean; reason: string } {
  if (train.totalTrades < 3) return { robust: false, reason: 'Train zu wenig Trades' };
  if (test.totalTrades < 3) return { robust: false, reason: 'Test zu wenig Trades' };
  const trainExp = train.expectancyPct;
  const testExp = test.expectancyPct;
  if (trainExp <= 0) return { robust: false, reason: 'Train ohne Edge' };
  if (testExp <= 0) return { robust: false, reason: 'Test wurde unprofitabel — überangepasst' };
  if (testExp < trainExp * 0.5) return { robust: false, reason: 'Test deutlich schwächer als Train — Edge instabil' };
  return { robust: true, reason: `Edge hält im Out-of-Sample (Train ${trainExp.toFixed(2)} → Test ${testExp.toFixed(2)})` };
}

// Robust variants are preferred. Among them, rank by TEST expectancy (the
// honest, out-of-sample measure). Non-robust variants fall back to full-window
// ranking but never beat any robust variant.
function rankScore(r: VariantResult): number {
  const robustBonus = r.isRobust ? 10_000 : 0;
  const primary = r.isRobust ? r.test.expectancyPct : r.expectancyPct;
  const sampleAdjust = r.totalTrades < 8 ? -2 : 0;
  return robustBonus + primary * 10 + r.netReturnPct * 0.05 + sampleAdjust;
}

function periodSpanDays(candles: AssetCandles[]): { total: number; splitTime: number } {
  if (candles.length === 0) return { total: 0, splitTime: 0 };
  const first = candles[0].c1h[0].openTime;
  const last = candles[0].c1h[candles[0].c1h.length - 1].openTime;
  const total = (last - first) / (1000 * 60 * 60 * 24);
  return { total: Math.round(total), splitTime: first + (last - first) / 2 };
}

async function compute(): Promise<LehrlingReport> {
  const candles = await fetchBacktestCandles(['btc', 'eth', 'sol']);
  const { total: periodDays, splitTime } = periodSpanDays(candles);
  const trainDays = Math.round(periodDays / 2);
  const testDays = periodDays - trainDays;
  const variants: VariantResult[] = [];

  for (const c of CONFLUENCE_VALUES) {
    for (const s of STOP_VALUES) {
      for (const t of TP1_VALUES) {
        const params: StrategyParams = { minConfluence: c, stopAtrMult: s, tp1AtrMult: t, maxHoldBars: 72 };
        const allTrades: StrategyTrade[] = candles.flatMap((a) =>
          backtestStrategy(a.assetId, a.ticker, a.c1h, a.c4h, a.c1d, params).trades
        ).sort((a, b) => a.entryTime - b.entryTime);

        const trainTrades = allTrades.filter((tr) => tr.entryTime < splitTime);
        const testTrades = allTrades.filter((tr) => tr.entryTime >= splitTime);
        const full = statsFromTrades(allTrades);
        const train = statsFromTrades(trainTrades);
        const test = statsFromTrades(testTrades);
        const robustness = judgeRobustness(train, test);

        variants.push({
          id: variantId(params),
          params,
          totalTrades: full.totalTrades,
          winRatePct: full.winRatePct,
          netReturnPct: full.netReturnPct,
          expectancyPct: full.expectancyPct,
          train,
          test,
          isRobust: robustness.robust,
          robustnessReason: robustness.reason,
          isDefault: false,
          isBest: false
        });
      }
    }
  }

  variants.sort((a, b) => rankScore(b) - rankScore(a));
  if (variants.length > 0) variants[0].isBest = true;
  const defaultId = variantId(DEFAULT_STRATEGY_PARAMS);
  for (const v of variants) {
    if (v.id === defaultId) v.isDefault = true;
  }

  const best = variants[0] ?? null;
  const baseline = variants.find((v) => v.isDefault) ?? null;
  const robustCount = variants.filter((v) => v.isRobust).length;

  const honestNote =
    candles.length === 0 ? 'Lehrling offline — keine Backtest-Daten verfügbar.' :
    robustCount === 0 ? `Keine der ${variants.length} Varianten besteht den Out-of-Sample-Test. Heißt: was im Train-Zeitraum funktionierte, brach im Test-Zeitraum ein. Lehrling rät zur Default-Konfiguration und mehr Zeit zum Reifen.` :
    robustCount === 1 ? `Genau eine Variante besteht den Out-of-Sample-Test — schmale Basis, aber konsistent.` :
    `${robustCount} von ${variants.length} Varianten bestehen den Out-of-Sample-Test. Lehrling empfiehlt die robusteste — sie hat den Test-Zeitraum überlebt, nicht nur den Train-Zeitraum.`;

  return {
    variants,
    best,
    baseline,
    periodDays,
    trainDays,
    testDays,
    generatedAt: new Date().toISOString(),
    dataSource: candles.length > 0 ? 'binance' : 'offline',
    totalVariantsTried: variants.length,
    robustCount,
    honestNote
  };
}

// Bump the cache key — schema changed (walk-forward fields).
export const getLehrlingReport = unstable_cache(compute, ['lehrling-sweep-v2'], { revalidate: 3600 });

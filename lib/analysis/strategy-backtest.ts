import { Candle } from '@/lib/types/domain';
import { adx, atr, bollinger, ema, macd, rsi, sma } from '@/lib/analysis/indicators';
import { fetchKlinesBySymbol } from '@/lib/providers/binance';
import { TOP_50 } from '@/lib/coin-universe';

export interface StrategyParams {
  minConfluence: number;
  stopAtrMult: number;
  tp1AtrMult: number;
  maxHoldBars: number;
}

export const DEFAULT_STRATEGY_PARAMS: StrategyParams = {
  minConfluence: 7,
  stopAtrMult: 1.5,
  tp1AtrMult: 2.5,
  maxHoldBars: 72
};

const TRADING_FEE_PCT = 0.001;

type Outcome = 'TP1' | 'SL' | 'TIMEOUT';

export interface StrategyTrade {
  assetId: string;
  ticker: string;
  entryTime: number;
  exitTime: number;
  entry: number;
  exit: number;
  outcome: Outcome;
  confluence: number;
  netPnlPct: number;
  holdBars: number;
}

export interface StrategyBacktestStats {
  assetId: string;
  ticker: string;
  totalSignals: number;
  wins: number;
  losses: number;
  timeouts: number;
  winRate: number | null;
  netReturnPct: number;
  expectancyPct: number;
  equityCurve: number[];
  periodDays: number;
  trades: StrategyTrade[];
}

export interface StrategyBacktestReport {
  perAsset: StrategyBacktestStats[];
  combined: {
    totalSignals: number;
    wins: number;
    losses: number;
    timeouts: number;
    winRate: number | null;
    netReturnPct: number;
    expectancyPct: number;
    equityCurve: number[];
  };
  periodDays: number;
  minConfluence: number;
  generatedAt: string;
  dataSource: 'binance' | 'offline';
}

function alignedIndexAt(times: number[], target: number): number {
  let lo = 0;
  let hi = times.length - 1;
  let res = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (times[mid] <= target) {
      res = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return res;
}

function simulateForward(candles: Candle[], startIdx: number, entry: number, atrValue: number, params: StrategyParams): { outcome: Outcome; exit: number; exitIdx: number } {
  const sl = entry - params.stopAtrMult * atrValue;
  const tp1 = entry + params.tp1AtrMult * atrValue;
  const end = Math.min(candles.length, startIdx + 1 + params.maxHoldBars);
  for (let i = startIdx + 1; i < end; i++) {
    const c = candles[i];
    if (c.low <= sl) return { outcome: 'SL', exit: sl, exitIdx: i };
    if (c.high >= tp1) return { outcome: 'TP1', exit: tp1, exitIdx: i };
  }
  const lastIdx = Math.min(end - 1, candles.length - 1);
  return { outcome: 'TIMEOUT', exit: candles[lastIdx].close, exitIdx: lastIdx };
}

export function backtestStrategy(assetId: string, ticker: string, c1h: Candle[], c4h: Candle[], c1d: Candle[], params: StrategyParams = DEFAULT_STRATEGY_PARAMS): StrategyBacktestStats {
  const empty: StrategyBacktestStats = {
    assetId, ticker, totalSignals: 0, wins: 0, losses: 0, timeouts: 0,
    winRate: null, netReturnPct: 0, expectancyPct: 0, equityCurve: [0], periodDays: 0, trades: []
  };
  if (c1h.length < 220 || c4h.length < 60 || c1d.length < 60) return empty;

  const closes1h = c1h.map((c) => c.close);
  const closes4h = c4h.map((c) => c.close);
  const closes1d = c1d.map((c) => c.close);
  const times4h = c4h.map((c) => c.openTime);
  const times1d = c1d.map((c) => c.openTime);

  // Precompute 1h series (offset-aligned to candle index)
  const rsiS = rsi(closes1h, 14);
  const rsiOff = closes1h.length - rsiS.length;
  const macdR = macd(closes1h);
  const macdOff = closes1h.length - macdR.histogram.length;
  const ema20S = ema(closes1h, 20);
  const ema20Off = closes1h.length - ema20S.length;
  const adxS = adx(c1h, 14).adx;
  const adxOff = closes1h.length - adxS.length;
  const atrS = atr(c1h, 14);
  const atrOff = closes1h.length - atrS.length;
  const volSma = sma(c1h.map((c) => c.volume), 20);
  const volOff = closes1h.length - volSma.length;
  const bb = bollinger(closes1h, 20, 2);
  const bbOff = closes1h.length - bb.upper.length;
  const stochKfull = (() => {
    // inline stochastic K to align by index
    const kP = 14;
    const out: number[] = [];
    for (let i = kP - 1; i < c1h.length; i++) {
      const slice = c1h.slice(i - kP + 1, i + 1);
      const hi = Math.max(...slice.map((b) => b.high));
      const lo = Math.min(...slice.map((b) => b.low));
      out.push(hi === lo ? 50 : ((c1h[i].close - lo) / (hi - lo)) * 100);
    }
    return out;
  })();
  const stochOff = closes1h.length - stochKfull.length;

  // 4h series
  const ema50_4h = ema(closes4h, 50);
  const ema50_4hOff = closes4h.length - ema50_4h.length;
  const macd4h = macd(closes4h);
  const macd4hOff = closes4h.length - macd4h.histogram.length;
  const rsi4h = rsi(closes4h, 14);
  const rsi4hOff = closes4h.length - rsi4h.length;

  // 1d series
  const ema200_1d = ema(closes1d, Math.min(200, closes1d.length - 1));
  const ema200_1dOff = closes1d.length - ema200_1d.length;

  const trades: StrategyTrade[] = [];
  const equityCurve: number[] = [0];
  let equity = 0;
  let releaseAt = -1;

  const startIdx = Math.max(210, c1h.length - 24 * 60); // last ~60 days max
  for (let i = startIdx; i < c1h.length - 1; i++) {
    if (i < releaseAt) continue;

    const rsiIdx = i - rsiOff;
    const macdIdx = i - macdOff;
    const ema20Idx = i - ema20Off;
    const adxIdx = i - adxOff;
    const atrIdx = i - atrOff;
    const volIdx = i - volOff;
    const bbIdx = i - bbOff;
    const stochIdx = i - stochOff;
    if (rsiIdx < 0 || macdIdx < 1 || ema20Idx < 0 || adxIdx < 0 || atrIdx < 0 || volIdx < 0 || bbIdx < 0 || stochIdx < 0) continue;

    const entry = closes1h[i];
    const t = c1h[i].openTime;

    const i4h = alignedIndexAt(times4h, t);
    const i1d = alignedIndexAt(times1d, t);
    const ema50_4hIdx = i4h - ema50_4hOff;
    const macd4hIdx = i4h - macd4hOff;
    const rsi4hIdx = i4h - rsi4hOff;
    const ema200_1dIdx = i1d - ema200_1dOff;
    if (ema50_4hIdx < 0 || macd4hIdx < 0 || rsi4hIdx < 0 || ema200_1dIdx < 0) continue;

    const ema20 = ema20S[ema20Idx];
    const ema50_4hVal = ema50_4h[ema50_4hIdx];
    const ema200Val = ema200_1d[ema200_1dIdx];
    const close1dAtT = closes1d[i1d];
    const rsi1h = rsiS[rsiIdx];
    const rsi4hVal = rsi4h[rsi4hIdx];
    const histNow = macdR.histogram[macdIdx];
    const histPrev = macdR.histogram[macdIdx - 1];
    const macdBull = (histPrev <= 0 && histNow > 0) || histNow > 0;
    const macd4hHist = macd4h.histogram[macd4hIdx];
    const adxVal = adxS[adxIdx];
    const atrVal = atrS[atrIdx];
    const volRatio = volSma[volIdx] > 0 ? c1h[i].volume / volSma[volIdx] : 1;
    const bbUpper = bb.upper[bbIdx];
    const stochK = stochKfull[stochIdx];

    const regimeBull = close1dAtT > ema200Val * 1.02;

    let confluence = 0;
    if (entry > ema20) confluence++;
    if (entry > ema50_4hVal) confluence++;
    if (regimeBull) confluence++;
    if (rsi1h >= 35 && rsi1h <= 60) confluence++;
    if (rsi4hVal > 40) confluence++;
    if (macdBull) confluence++;
    if (macd4hHist > 0) confluence++;
    if (adxVal > 20) confluence++;
    if (volRatio >= 1.3) confluence++;
    if (((bbUpper - entry) / entry) * 100 > 1.5) confluence++;
    if (stochK < 80) confluence++;
    if (atrVal > 0) confluence++; // stop-level always identifiable via ATR

    if (confluence < params.minConfluence) continue;

    const sim = simulateForward(c1h, i, entry, atrVal, params);
    const grossPct = ((sim.exit - entry) / entry) * 100;
    const netPct = grossPct - TRADING_FEE_PCT * 100 * 2;
    trades.push({
      assetId, ticker, entryTime: t, exitTime: c1h[sim.exitIdx].openTime,
      entry, exit: sim.exit, outcome: sim.outcome, confluence, netPnlPct: netPct, holdBars: sim.exitIdx - i
    });
    equity += netPct;
    equityCurve.push(equity);
    releaseAt = sim.exitIdx;
  }

  const wins = trades.filter((t) => t.outcome === 'TP1').length;
  const losses = trades.filter((t) => t.outcome === 'SL').length;
  const timeouts = trades.filter((t) => t.outcome === 'TIMEOUT').length;
  const winRate = trades.length > 0 ? wins / trades.length : null;
  const winning = trades.filter((t) => t.netPnlPct > 0);
  const losing = trades.filter((t) => t.netPnlPct <= 0);
  const avgWin = winning.length > 0 ? winning.reduce((a, b) => a + b.netPnlPct, 0) / winning.length : 0;
  const avgLoss = losing.length > 0 ? losing.reduce((a, b) => a + b.netPnlPct, 0) / losing.length : 0;
  const expectancy = winRate !== null ? winRate * avgWin + (1 - winRate) * avgLoss : 0;
  const periodDays = (c1h[c1h.length - 1].openTime - c1h[Math.min(startIdx, c1h.length - 1)].openTime) / (1000 * 60 * 60 * 24);

  return {
    assetId, ticker,
    totalSignals: trades.length, wins, losses, timeouts, winRate,
    netReturnPct: equity, expectancyPct: expectancy, equityCurve, periodDays, trades
  };
}

export interface AssetCandles {
  assetId: string;
  ticker: string;
  c1h: Candle[];
  c4h: Candle[];
  c1d: Candle[];
}

// Fetches the candles needed for a backtest run. Separated so callers
// (like the Lehrling) can run multiple parameter sweeps without re-fetching.
export async function fetchBacktestCandles(assetIds: string[] = ['btc', 'eth', 'sol']): Promise<AssetCandles[]> {
  const coins = TOP_50.filter((c) => assetIds.includes(c.id));
  const out: AssetCandles[] = [];
  for (const coin of coins) {
    const [c1h, c4h, c1d] = await Promise.all([
      fetchKlinesBySymbol(coin.binanceSymbol, '1h', 1000),
      fetchKlinesBySymbol(coin.binanceSymbol, '4h', 300),
      fetchKlinesBySymbol(coin.binanceSymbol, '1d', 300)
    ]);
    if (!c1h || !c4h || !c1d) continue;
    out.push({ assetId: coin.id, ticker: coin.symbol, c1h, c4h, c1d });
  }
  return out;
}

export function runStrategyBacktestOnCandles(candles: AssetCandles[], params: StrategyParams = DEFAULT_STRATEGY_PARAMS): StrategyBacktestReport {
  const perAsset: StrategyBacktestStats[] = candles.map((a) =>
    backtestStrategy(a.assetId, a.ticker, a.c1h, a.c4h, a.c1d, params)
  );
  const allTrades = perAsset.flatMap((s) => s.trades).sort((a, b) => a.entryTime - b.entryTime);
  const wins = allTrades.filter((t) => t.outcome === 'TP1').length;
  const losses = allTrades.filter((t) => t.outcome === 'SL').length;
  const timeouts = allTrades.filter((t) => t.outcome === 'TIMEOUT').length;
  const winRate = allTrades.length > 0 ? wins / allTrades.length : null;
  let eq = 0;
  const curve: number[] = [0];
  for (const t of allTrades) { eq += t.netPnlPct; curve.push(eq); }
  const winning = allTrades.filter((t) => t.netPnlPct > 0);
  const losing = allTrades.filter((t) => t.netPnlPct <= 0);
  const avgWin = winning.length > 0 ? winning.reduce((a, b) => a + b.netPnlPct, 0) / winning.length : 0;
  const avgLoss = losing.length > 0 ? losing.reduce((a, b) => a + b.netPnlPct, 0) / losing.length : 0;
  const expectancy = winRate !== null ? winRate * avgWin + (1 - winRate) * avgLoss : 0;
  const periodDays = perAsset.length > 0 ? Math.max(...perAsset.map((s) => s.periodDays)) : 0;
  return {
    perAsset,
    combined: { totalSignals: allTrades.length, wins, losses, timeouts, winRate, netReturnPct: eq, expectancyPct: expectancy, equityCurve: curve },
    periodDays,
    minConfluence: params.minConfluence,
    generatedAt: new Date().toISOString(),
    dataSource: candles.length > 0 ? 'binance' : 'offline'
  };
}

export async function runStrategyBacktest(assetIds: string[] = ['btc', 'eth', 'sol']): Promise<StrategyBacktestReport> {
  const candles = await fetchBacktestCandles(assetIds);
  return runStrategyBacktestOnCandles(candles);
}

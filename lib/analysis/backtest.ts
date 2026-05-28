import { Candle } from '@/lib/types/domain';
import { ema, rsi, macd, sma } from '@/lib/analysis/indicators';
import { fetchCandlesBatch } from '@/lib/providers/binance';
import { mockAssets, binanceSymbolByAssetId } from '@/lib/data/mock';

const STOP_LOSS_PCT = 0.015;
const TP1_RR = 1.5;
const RSI_LOW = 30;
const RSI_HIGH = 55;
const VOLUME_THRESHOLD = 1.3;
const MIN_CONFLUENCE = 3;
const MAX_HOLD_BARS = 72;
const TRADING_FEE_PCT = 0.001;

type TradeOutcome = 'TP1' | 'SL' | 'TIMEOUT';

export interface BacktestTrade {
  assetId: string;
  ticker: string;
  entryTime: number;
  exitTime: number;
  entry: number;
  exit: number;
  outcome: TradeOutcome;
  pnlPct: number;
  netPnlPct: number;
  holdBars: number;
}

export interface BacktestStats {
  assetId: string;
  ticker: string;
  totalSignals: number;
  wins: number;
  losses: number;
  timeouts: number;
  winRate: number | null;
  netReturnPct: number;
  avgWinPct: number;
  avgLossPct: number;
  expectancyPct: number;
  equityCurve: number[];
  trades: BacktestTrade[];
  periodDays: number;
}

export interface BacktestReport {
  perAsset: BacktestStats[];
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
  generatedAt: string;
  dataSource: 'binance' | 'offline';
}

function find4hIndexAt(candles4h: Candle[], targetTime: number): number {
  let lo = 0;
  let hi = candles4h.length - 1;
  let result = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (candles4h[mid].openTime <= targetTime) {
      result = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return result;
}

function simulateForward(candles1h: Candle[], startIdx: number, entry: number): { outcome: TradeOutcome; exit: number; exitIdx: number } {
  const sl = entry * (1 - STOP_LOSS_PCT);
  const tp1 = entry * (1 + STOP_LOSS_PCT * TP1_RR);
  const end = Math.min(candles1h.length, startIdx + 1 + MAX_HOLD_BARS);
  for (let i = startIdx + 1; i < end; i++) {
    const c = candles1h[i];
    const hitSl = c.low <= sl;
    const hitTp = c.high >= tp1;
    if (hitSl && hitTp) {
      return { outcome: 'SL', exit: sl, exitIdx: i };
    }
    if (hitSl) return { outcome: 'SL', exit: sl, exitIdx: i };
    if (hitTp) return { outcome: 'TP1', exit: tp1, exitIdx: i };
  }
  const last = candles1h[Math.min(end - 1, candles1h.length - 1)];
  return { outcome: 'TIMEOUT', exit: last.close, exitIdx: end - 1 };
}

export function backtestAsset(assetId: string, ticker: string, candles1h: Candle[], candles4h: Candle[]): BacktestStats {
  const closes1h = candles1h.map((c) => c.close);
  const closes4h = candles4h.map((c) => c.close);

  const rsiSeries = rsi(closes1h, 14);
  const rsiOffset = closes1h.length - rsiSeries.length;
  const macdResult = macd(closes1h);
  const macdOffset = closes1h.length - macdResult.histogram.length;
  const volSma = sma(candles1h.map((c) => c.volume), 20);
  const volOffset = candles1h.length - volSma.length;
  const ema50_4h = ema(closes4h, 50);
  const ema4hOffset = closes4h.length - ema50_4h.length;

  const trades: BacktestTrade[] = [];
  const equityCurve: number[] = [0];
  let equity = 0;
  let inTrade = false;
  let releaseAtIdx = -1;

  const startIdx = Math.max(60, closes1h.length - 1 - 24 * 90);
  for (let i = startIdx; i < candles1h.length - 1; i++) {
    if (inTrade && i < releaseAtIdx) continue;
    inTrade = false;

    const rsiIdx = i - rsiOffset;
    const macdIdx = i - macdOffset;
    const volIdx = i - volOffset;
    if (rsiIdx < 0 || macdIdx < 1 || volIdx < 0) continue;

    const rsiVal = rsiSeries[rsiIdx];
    const histPrev = macdResult.histogram[macdIdx - 1];
    const histNow = macdResult.histogram[macdIdx];
    const macdBullish = (histPrev <= 0 && histNow > 0) || histNow > 0;
    const volRatio = candles1h[i].volume / volSma[volIdx];

    const candleTime = candles1h[i].openTime;
    const idx4h = find4hIndexAt(candles4h, candleTime);
    const ema4hIdx = idx4h - ema4hOffset;
    let trendUp = false;
    if (ema4hIdx >= 0) {
      const distancePct = ((closes4h[idx4h] - ema50_4h[ema4hIdx]) / ema50_4h[ema4hIdx]) * 100;
      trendUp = distancePct > 1;
    }

    const checks = [
      rsiVal >= RSI_LOW && rsiVal <= RSI_HIGH,
      macdBullish,
      trendUp,
      volRatio >= VOLUME_THRESHOLD
    ];
    const confluence = checks.filter(Boolean).length;
    if (confluence < MIN_CONFLUENCE || !trendUp) continue;

    const entry = candles1h[i].close;
    const sim = simulateForward(candles1h, i, entry);
    const grossPct = ((sim.exit - entry) / entry) * 100;
    const netPct = grossPct - TRADING_FEE_PCT * 100 * 2;

    trades.push({
      assetId,
      ticker,
      entryTime: candleTime,
      exitTime: candles1h[sim.exitIdx].openTime,
      entry,
      exit: sim.exit,
      outcome: sim.outcome,
      pnlPct: grossPct,
      netPnlPct: netPct,
      holdBars: sim.exitIdx - i
    });
    equity += netPct;
    equityCurve.push(equity);
    inTrade = true;
    releaseAtIdx = sim.exitIdx;
  }

  const wins = trades.filter((t) => t.outcome === 'TP1').length;
  const losses = trades.filter((t) => t.outcome === 'SL').length;
  const timeouts = trades.filter((t) => t.outcome === 'TIMEOUT').length;
  const winRate = trades.length > 0 ? wins / trades.length : null;
  const winning = trades.filter((t) => t.netPnlPct > 0);
  const losing = trades.filter((t) => t.netPnlPct <= 0);
  const avgWinPct = winning.length > 0 ? winning.reduce((a, b) => a + b.netPnlPct, 0) / winning.length : 0;
  const avgLossPct = losing.length > 0 ? losing.reduce((a, b) => a + b.netPnlPct, 0) / losing.length : 0;
  const expectancy = winRate !== null ? winRate * avgWinPct + (1 - winRate) * avgLossPct : 0;
  const safeStartIdx = Math.min(startIdx, candles1h.length - 1);
  const periodDays = candles1h.length > 0 && safeStartIdx >= 0
    ? (candles1h[candles1h.length - 1].openTime - candles1h[safeStartIdx].openTime) / (1000 * 60 * 60 * 24)
    : 0;

  return {
    assetId,
    ticker,
    totalSignals: trades.length,
    wins,
    losses,
    timeouts,
    winRate,
    netReturnPct: equity,
    avgWinPct,
    avgLossPct,
    expectancyPct: expectancy,
    equityCurve,
    trades,
    periodDays
  };
}

export async function runBacktest(): Promise<BacktestReport> {
  const cryptoAssets = mockAssets.filter((a) => a.category === 'crypto' && binanceSymbolByAssetId[a.id]);
  const ids = cryptoAssets.map((a) => a.id);
  const [batch1h, batch4h] = await Promise.all([
    fetchCandlesBatch(ids, '1h', 1000),
    fetchCandlesBatch(ids, '4h', 500)
  ]);

  const perAsset: BacktestStats[] = [];
  let anyData = false;
  for (const asset of cryptoAssets) {
    const c1h = batch1h[asset.id];
    const c4h = batch4h[asset.id];
    if (!c1h || !c4h) continue;
    anyData = true;
    perAsset.push(backtestAsset(asset.id, asset.ticker, c1h, c4h));
  }

  const allTrades = perAsset.flatMap((s) => s.trades).sort((a, b) => a.entryTime - b.entryTime);
  const wins = allTrades.filter((t) => t.outcome === 'TP1').length;
  const losses = allTrades.filter((t) => t.outcome === 'SL').length;
  const timeouts = allTrades.filter((t) => t.outcome === 'TIMEOUT').length;
  const winRate = allTrades.length > 0 ? wins / allTrades.length : null;
  let combinedEquity = 0;
  const combinedCurve: number[] = [0];
  for (const t of allTrades) {
    combinedEquity += t.netPnlPct;
    combinedCurve.push(combinedEquity);
  }
  const winning = allTrades.filter((t) => t.netPnlPct > 0);
  const losing = allTrades.filter((t) => t.netPnlPct <= 0);
  const avgWin = winning.length > 0 ? winning.reduce((a, b) => a + b.netPnlPct, 0) / winning.length : 0;
  const avgLoss = losing.length > 0 ? losing.reduce((a, b) => a + b.netPnlPct, 0) / losing.length : 0;
  const expectancy = winRate !== null ? winRate * avgWin + (1 - winRate) * avgLoss : 0;
  const periodDays = perAsset.length > 0 ? Math.max(...perAsset.map((s) => s.periodDays)) : 0;

  return {
    perAsset,
    combined: {
      totalSignals: allTrades.length,
      wins,
      losses,
      timeouts,
      winRate,
      netReturnPct: combinedEquity,
      expectancyPct: expectancy,
      equityCurve: combinedCurve
    },
    periodDays,
    generatedAt: new Date().toISOString(),
    dataSource: anyData ? 'binance' : 'offline'
  };
}

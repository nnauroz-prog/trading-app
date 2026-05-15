import { Candle, TradeSignal } from '@/lib/types/domain';
import { ema, rsi, macd, macdState, sma, last } from '@/lib/analysis/indicators';
import { fetchCandlesBatch } from '@/lib/providers/binance';
import { mockAssets, binanceSymbolByAssetId } from '@/lib/data/mock';

const STOP_LOSS_PCT = 0.015;
const RR_TP1 = 1.5;
const RR_TP2 = 3.0;
const RSI_LOW = 30;
const RSI_HIGH = 55;
const VOLUME_SPIKE_THRESHOLD = 1.3;
const MIN_CONFLUENCE = 3;

function trend4hFromCandles(candles4h: Candle[]): { direction: 'up' | 'down' | 'sideways'; distancePct: number } {
  const closes = candles4h.map((c) => c.close);
  const emaSeries = ema(closes, 50);
  const latestEma = last(emaSeries);
  const latestClose = last(closes);
  if (!latestEma || !latestClose) return { direction: 'sideways', distancePct: 0 };
  const distancePct = ((latestClose - latestEma) / latestEma) * 100;
  if (distancePct > 1) return { direction: 'up', distancePct };
  if (distancePct < -1) return { direction: 'down', distancePct };
  return { direction: 'sideways', distancePct };
}

function volumeSpikeRatio(candles: Candle[]): number {
  if (candles.length < 21) return 1;
  const recentVolumes = candles.slice(-21, -1).map((c) => c.volume);
  const avg = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
  if (avg === 0) return 1;
  const latest = candles[candles.length - 1].volume;
  return latest / avg;
}

export function evaluateSignal(
  assetId: string,
  ticker: string,
  candles1h: Candle[],
  candles4h: Candle[]
): TradeSignal | null {
  if (candles1h.length < 50 || candles4h.length < 60) return null;
  const closes1h = candles1h.map((c) => c.close);

  const rsiSeries = rsi(closes1h, 14);
  const latestRsi = last(rsiSeries);
  if (latestRsi === undefined) return null;

  const macdResult = macd(closes1h);
  const macdSt = macdState(macdResult);

  const sma20 = sma(closes1h, 20);
  const latestSma20 = last(sma20);
  const latestClose = last(closes1h);
  if (!latestClose || !latestSma20) return null;

  const trend = trend4hFromCandles(candles4h);
  const volRatio = volumeSpikeRatio(candles1h);

  const checks = {
    rsi: latestRsi >= RSI_LOW && latestRsi <= RSI_HIGH,
    macd: macdSt === 'bullish_cross' || macdSt === 'bullish',
    trend: trend.direction === 'up',
    volume: volRatio >= VOLUME_SPIKE_THRESHOLD
  };
  const confluence = Object.values(checks).filter(Boolean).length;
  if (confluence < MIN_CONFLUENCE) return null;
  if (!checks.trend) return null;

  const entry = latestClose;
  const stopLoss = entry * (1 - STOP_LOSS_PCT);
  const risk = entry - stopLoss;
  const takeProfit1 = entry + risk * RR_TP1;
  const takeProfit2 = entry + risk * RR_TP2;

  const baseConfidence = 50 + (confluence - MIN_CONFLUENCE) * 12.5;
  const trendBonus = Math.min(10, Math.max(0, trend.distancePct));
  const macdBonus = macdSt === 'bullish_cross' ? 5 : 0;
  const confidence = Math.min(75, Math.round(baseConfidence + trendBonus + macdBonus));

  const reasoning: string[] = [];
  if (checks.rsi) reasoning.push(`RSI(1h) = ${latestRsi.toFixed(1)} — Recovery-Zone (Oversold-Exit)`);
  if (checks.macd) reasoning.push(macdSt === 'bullish_cross' ? 'MACD(1h) bullish cross — frischer Momentum-Wechsel' : 'MACD(1h) bullish — Momentum positiv');
  if (checks.trend) reasoning.push(`4h-Trend up — Preis ${trend.distancePct.toFixed(1)}% über EMA(50)`);
  if (checks.volume) reasoning.push(`Volume ${(volRatio * 100 - 100).toFixed(0)}% über 20-Bar-Average — institutionelles Interesse`);

  return {
    assetId,
    ticker,
    type: 'LONG',
    entry,
    stopLoss,
    takeProfit1,
    takeProfit2,
    riskPct: STOP_LOSS_PCT * 100,
    rewardPct1: STOP_LOSS_PCT * RR_TP1 * 100,
    rewardPct2: STOP_LOSS_PCT * RR_TP2 * 100,
    riskRewardRatio: RR_TP1,
    confidence,
    reasoning,
    indicators: {
      rsi1h: latestRsi,
      macdState: macdSt,
      trend4h: trend.direction,
      trend4hDistancePct: trend.distancePct,
      volumeRatio: volRatio
    },
    generatedAt: new Date().toISOString()
  };
}

export interface IndicatorStatus {
  assetId: string;
  ticker: string;
  rsi1h: number | null;
  macdState: 'bullish_cross' | 'bearish_cross' | 'bullish' | 'bearish' | 'neutral' | null;
  trend4h: 'up' | 'down' | 'sideways' | null;
  volumeRatio: number | null;
  confluence: number;
  lastPrice: number | null;
}

export interface SignalReport {
  signals: TradeSignal[];
  statuses: IndicatorStatus[];
  generatedAt: string;
  dataSource: 'binance' | 'offline';
}

export async function generateSignals(): Promise<SignalReport> {
  const cryptoAssets = mockAssets.filter((a) => a.category === 'crypto' && binanceSymbolByAssetId[a.id]);
  const ids = cryptoAssets.map((a) => a.id);
  const [batch1h, batch4h] = await Promise.all([
    fetchCandlesBatch(ids, '1h', 200),
    fetchCandlesBatch(ids, '4h', 200)
  ]);

  const signals: TradeSignal[] = [];
  const statuses: IndicatorStatus[] = [];
  let anyData = false;

  for (const asset of cryptoAssets) {
    const c1h = batch1h[asset.id];
    const c4h = batch4h[asset.id];
    if (!c1h || !c4h) {
      statuses.push({
        assetId: asset.id,
        ticker: asset.ticker,
        rsi1h: null,
        macdState: null,
        trend4h: null,
        volumeRatio: null,
        confluence: 0,
        lastPrice: null
      });
      continue;
    }
    anyData = true;
    const signal = evaluateSignal(asset.id, asset.ticker, c1h, c4h);
    if (signal) signals.push(signal);

    const closes1h = c1h.map((c) => c.close);
    const rsiSeries = rsi(closes1h, 14);
    const macdResult = macd(closes1h);
    const trend = trend4hFromCandles(c4h);
    const volRatio = volumeSpikeRatio(c1h);
    const latestRsi = last(rsiSeries) ?? null;
    const macdSt = macdResult.histogram.length >= 2 ? macdState(macdResult) : null;
    const checks = [
      latestRsi !== null && latestRsi >= RSI_LOW && latestRsi <= RSI_HIGH,
      macdSt === 'bullish_cross' || macdSt === 'bullish',
      trend.direction === 'up',
      volRatio >= VOLUME_SPIKE_THRESHOLD
    ];
    statuses.push({
      assetId: asset.id,
      ticker: asset.ticker,
      rsi1h: latestRsi,
      macdState: macdSt,
      trend4h: trend.direction,
      volumeRatio: volRatio,
      confluence: checks.filter(Boolean).length,
      lastPrice: last(closes1h) ?? null
    });
  }

  return {
    signals: signals.sort((a, b) => b.confidence - a.confidence),
    statuses,
    generatedAt: new Date().toISOString(),
    dataSource: anyData ? 'binance' : 'offline'
  };
}

import { Candle } from '@/lib/types/domain';
import { ema, macd, macdState, rsi, sma, last } from '@/lib/analysis/indicators';
import { fetchKlinesBySymbol } from '@/lib/providers/binance';
import { fetchAllTickers, TickerSnapshot } from '@/lib/providers/binance-tickers';
import { TOP_50, UniverseCoin } from '@/lib/coin-universe';

const STOP_LOSS_PCT = 0.015;
const RR_TP1 = 1.5;
const RR_TP2 = 3.0;

export type Confidence = 'low' | 'medium' | 'high';

export interface TopPlay {
  coin: UniverseCoin;
  ticker: TickerSnapshot;
  type: 'LONG';
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  riskPct: number;
  reward1Pct: number;
  reward2Pct: number;
  riskRewardRatio: number;
  confidence: Confidence;
  confidenceScore: number;
  reasoning: string[];
  indicators: {
    rsi: number;
    macdHist: number;
    macdState: 'bullish_cross' | 'bearish_cross' | 'bullish' | 'bearish' | 'neutral';
    trend4hUp: boolean;
    trend4hDistancePct: number;
    volumeRatio: number;
    higherLows: boolean;
  };
  generatedAt: string;
}

function checkHigherLows(candles: Candle[]): boolean {
  if (candles.length < 12) return false;
  const recent = candles.slice(-12);
  const lows: number[] = [];
  for (let i = 1; i < recent.length - 1; i++) {
    if (recent[i].low < recent[i - 1].low && recent[i].low < recent[i + 1].low) {
      lows.push(recent[i].low);
    }
  }
  if (lows.length < 2) return false;
  for (let i = 1; i < lows.length; i++) {
    if (lows[i] <= lows[i - 1]) return false;
  }
  return true;
}

function scoreSetup(candles1h: Candle[], candles4h: Candle[]): TopPlay['indicators'] & { score: number; reasoning: string[] } | null {
  if (candles1h.length < 50 || candles4h.length < 50) return null;
  const closes1h = candles1h.map((c) => c.close);
  const closes4h = candles4h.map((c) => c.close);

  const rsiSeries = rsi(closes1h, 14);
  const macdResult = macd(closes1h);
  const ema50_4h = ema(closes4h, 50);
  const volSma = sma(candles1h.map((c) => c.volume), 20);

  const latestRsi = last(rsiSeries) ?? 50;
  const latestMacdHist = last(macdResult.histogram) ?? 0;
  const macdSt = macdResult.histogram.length >= 2 ? macdState(macdResult) : 'neutral';
  const latestEma4h = last(ema50_4h) ?? 0;
  const latestClose4h = last(closes4h) ?? 0;
  const trend4hDistancePct = latestEma4h ? ((latestClose4h - latestEma4h) / latestEma4h) * 100 : 0;
  const trend4hUp = trend4hDistancePct > 0;
  const latestVol = last(candles1h.map((c) => c.volume)) ?? 0;
  const latestVolSma = last(volSma) ?? 1;
  const volumeRatio = latestVolSma > 0 ? latestVol / latestVolSma : 1;
  const higherLows = checkHigherLows(candles1h);

  let score = 0;
  const reasoning: string[] = [];

  if (latestRsi >= 30 && latestRsi <= 55) {
    score += 25;
    reasoning.push(`RSI(1h) ${latestRsi.toFixed(0)} in Recovery-Zone`);
  } else if (latestRsi > 55 && latestRsi <= 65) {
    score += 12;
    reasoning.push(`RSI(1h) ${latestRsi.toFixed(0)} im Trend-Modus`);
  } else if (latestRsi < 30) {
    score += 18;
    reasoning.push(`RSI(1h) ${latestRsi.toFixed(0)} oversold — Bounce-Setup`);
  }

  if (macdSt === 'bullish_cross') {
    score += 30;
    reasoning.push('MACD bullish cross — frischer Momentum-Wechsel');
  } else if (macdSt === 'bullish') {
    score += 15;
    reasoning.push('MACD bullish — Momentum positiv');
  }

  if (trend4hUp && trend4hDistancePct > 2) {
    score += 25;
    reasoning.push(`4h-Trend stark up (+${trend4hDistancePct.toFixed(1)}% über EMA50)`);
  } else if (trend4hUp) {
    score += 15;
    reasoning.push(`4h-Trend up (+${trend4hDistancePct.toFixed(1)}% über EMA50)`);
  } else if (trend4hDistancePct > -2) {
    score += 5;
    reasoning.push('4h-Trend neutral');
  }

  if (volumeRatio >= 2) {
    score += 20;
    reasoning.push(`Volume +${((volumeRatio - 1) * 100).toFixed(0)}% — starkes Interesse`);
  } else if (volumeRatio >= 1.3) {
    score += 12;
    reasoning.push(`Volume +${((volumeRatio - 1) * 100).toFixed(0)}% über Schnitt`);
  }

  if (higherLows) {
    score += 10;
    reasoning.push('Higher-Lows-Sequenz auf 1h');
  }

  return {
    rsi: latestRsi,
    macdHist: latestMacdHist,
    macdState: macdSt,
    trend4hUp,
    trend4hDistancePct,
    volumeRatio,
    higherLows,
    score,
    reasoning
  };
}

function scoreToConfidence(score: number): { level: Confidence; capped: number } {
  if (score >= 70) return { level: 'high', capped: Math.min(75, score) };
  if (score >= 45) return { level: 'medium', capped: Math.min(60, score) };
  return { level: 'low', capped: Math.min(45, score) };
}

async function analyzeCoin(coin: UniverseCoin, ticker: TickerSnapshot): Promise<TopPlay | null> {
  const [c1h, c4h] = await Promise.all([
    fetchKlinesBySymbol(coin.binanceSymbol, '1h', 100),
    fetchKlinesBySymbol(coin.binanceSymbol, '4h', 60)
  ]);
  if (!c1h || !c4h) return null;
  const scored = scoreSetup(c1h, c4h);
  if (!scored) return null;

  const entry = ticker.price;
  const stopLoss = entry * (1 - STOP_LOSS_PCT);
  const risk = entry - stopLoss;
  const takeProfit1 = entry + risk * RR_TP1;
  const takeProfit2 = entry + risk * RR_TP2;

  const { level, capped } = scoreToConfidence(scored.score);

  return {
    coin,
    ticker,
    type: 'LONG',
    entry,
    stopLoss,
    takeProfit1,
    takeProfit2,
    riskPct: STOP_LOSS_PCT * 100,
    reward1Pct: STOP_LOSS_PCT * RR_TP1 * 100,
    reward2Pct: STOP_LOSS_PCT * RR_TP2 * 100,
    riskRewardRatio: RR_TP1,
    confidence: level,
    confidenceScore: capped,
    reasoning: scored.reasoning,
    indicators: {
      rsi: scored.rsi,
      macdHist: scored.macdHist,
      macdState: scored.macdState,
      trend4hUp: scored.trend4hUp,
      trend4hDistancePct: scored.trend4hDistancePct,
      volumeRatio: scored.volumeRatio,
      higherLows: scored.higherLows
    },
    generatedAt: new Date().toISOString()
  };
}

export interface TopPlayReport {
  topPlay: TopPlay | null;
  alternates: TopPlay[];
  tickers: TickerSnapshot[];
  generatedAt: string;
  analyzedCount: number;
  dataSource: 'binance' | 'offline';
}

export async function buildTopPlayReport(deepAnalyzeCount = 15): Promise<TopPlayReport> {
  const tickerMap = await fetchAllTickers();
  if (!tickerMap) {
    return {
      topPlay: null,
      alternates: [],
      tickers: [],
      generatedAt: new Date().toISOString(),
      analyzedCount: 0,
      dataSource: 'offline'
    };
  }

  const withTickers = TOP_50
    .map((c) => ({ coin: c, ticker: tickerMap.get(c.binanceSymbol) }))
    .filter((x): x is { coin: UniverseCoin; ticker: TickerSnapshot } => !!x.ticker);

  const scoredCandidates = withTickers
    .map((x) => ({
      ...x,
      interestScore: Math.abs(x.ticker.priceChangePct) + Math.log10(Math.max(x.ticker.quoteVolume, 1)) * 0.5
    }))
    .sort((a, b) => b.interestScore - a.interestScore)
    .slice(0, deepAnalyzeCount);

  const plays = (await Promise.all(scoredCandidates.map((x) => analyzeCoin(x.coin, x.ticker))))
    .filter((p): p is TopPlay => p !== null)
    .sort((a, b) => b.confidenceScore - a.confidenceScore);

  return {
    topPlay: plays[0] ?? null,
    alternates: plays.slice(1, 4),
    tickers: withTickers.map((x) => x.ticker),
    generatedAt: new Date().toISOString(),
    analyzedCount: plays.length,
    dataSource: 'binance'
  };
}

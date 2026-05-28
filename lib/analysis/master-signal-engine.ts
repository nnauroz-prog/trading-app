import { Candle } from '@/lib/types/domain';
import { adx, atr, bollinger, detectSwingLow, ema, macd, macdState, rsi, sma, stochastic, last } from '@/lib/analysis/indicators';
import { fetchKlinesBySymbol } from '@/lib/providers/binance';
import { fetchAllTickers, TickerSnapshot } from '@/lib/providers/binance-tickers';
import { TOP_50, UniverseCoin } from '@/lib/coin-universe';
import { isTickerOnCoinbase } from '@/lib/data/brokers/coinbase-assets';

export interface ConfluenceCheck {
  id: string;
  label: string;
  passed: boolean;
  value?: string;
  detail: string;
  weight: number;
}

export interface TradeRecommendation {
  kind: 'trade';
  coin: UniverseCoin;
  ticker: TickerSnapshot;
  type: 'LONG';
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  stopDistancePct: number;
  rrTp1: number;
  rrTp2: number;
  atr1h: number;
  confidence: number;
  checks: ConfluenceCheck[];
  passedCount: number;
  totalCount: number;
  oneLineReason: string;
  brokers: string[];
  marketRegime: 'bull' | 'bear' | 'sideways';
  generatedAt: string;
}

export interface NoTradeReport {
  kind: 'no_trade';
  bestCandidate: TradeRecommendation | null;
  marketRegime: 'bull' | 'bear' | 'sideways';
  marketMood: 'risk-on' | 'risk-off' | 'neutral';
  reasons: string[];
  generatedAt: string;
}

export type MasterSignalReport = TradeRecommendation | NoTradeReport;

const MIN_PASSED_FOR_TRADE = 7;
const RISK_R = 1.5;
const TP1_R = 2.5;
const TP2_R = 5.0;

interface AnalyzedCoin {
  coin: UniverseCoin;
  ticker: TickerSnapshot;
  candles1h: Candle[];
  candles4h: Candle[];
  candles1d: Candle[];
  checks: ConfluenceCheck[];
  passedCount: number;
  totalCount: number;
  totalWeight: number;
  passedWeight: number;
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  stopDistancePct: number;
  atr1h: number;
  marketRegime: 'bull' | 'bear' | 'sideways';
}

export function buildChecks(c1h: Candle[], c4h: Candle[], c1d: Candle[]): { checks: ConfluenceCheck[]; entry: number; atr1h: number; marketRegime: 'bull' | 'bear' | 'sideways' } {
  const closes1h = c1h.map((c) => c.close);
  const closes4h = c4h.map((c) => c.close);
  const closes1d = c1d.map((c) => c.close);

  const entry = last(closes1h) ?? 0;

  const ema20_1h = last(ema(closes1h, 20)) ?? entry;
  const ema50_4h = last(ema(closes4h, 50)) ?? entry;
  const ema200Series_1d = ema(closes1d, Math.min(200, closes1d.length - 1));
  const ema200_1d = last(ema200Series_1d) ?? entry;

  const rsi1h = last(rsi(closes1h, 14));
  const rsi4h = last(rsi(closes4h, 14));

  const macd1h = macd(closes1h);
  const macd4h = macd(closes4h);
  const macdState1h = macd1h.histogram.length >= 2 ? macdState(macd1h) : 'neutral';
  const macdHist4h = last(macd4h.histogram) ?? 0;

  const adx1h = last(adx(c1h, 14).adx) ?? 0;

  const atr1hSeries = atr(c1h, 14);
  const atr1h = last(atr1hSeries) ?? entry * 0.015;

  const volSma = sma(c1h.map((c) => c.volume), 20);
  const latestVol = last(c1h.map((c) => c.volume)) ?? 0;
  const latestVolSma = last(volSma) ?? 1;
  const volRatio = latestVolSma > 0 ? latestVol / latestVolSma : 1;

  const bb = bollinger(closes1h, 20, 2);
  const latestBbUpper = last(bb.upper) ?? entry * 1.05;
  const distFromUpperBand = ((latestBbUpper - entry) / entry) * 100;

  const stoch1h = stochastic(c1h, 14, 3);
  const stochK = last(stoch1h.k) ?? 50;
  const stochD = last(stoch1h.d) ?? 50;

  const swingLow = detectSwingLow(c1h.slice(-30), 3);
  const swingLowDistPct = swingLow ? ((entry - swingLow) / entry) * 100 : 0;

  const marketRegime: 'bull' | 'bear' | 'sideways' =
    closes1d.length < 50 ? 'sideways' : entry > ema200_1d * 1.02 ? 'bull' : entry < ema200_1d * 0.98 ? 'bear' : 'sideways';

  const checks: ConfluenceCheck[] = [
    {
      id: 'trend_1h',
      label: '1h-Trend up',
      passed: entry > ema20_1h,
      value: `${(((entry - ema20_1h) / ema20_1h) * 100).toFixed(2)}%`,
      detail: entry > ema20_1h ? 'Preis über EMA(20) auf 1h' : 'Preis unter EMA(20) — kurzfristig schwach',
      weight: 1
    },
    {
      id: 'trend_4h',
      label: '4h-Trend up',
      passed: entry > ema50_4h,
      value: `${(((entry - ema50_4h) / ema50_4h) * 100).toFixed(2)}%`,
      detail: entry > ema50_4h ? 'Preis über EMA(50) auf 4h — mittelfristig bullisch' : 'Preis unter EMA(50) auf 4h',
      weight: 2
    },
    {
      id: 'trend_1d',
      label: 'Tagestrend up',
      passed: marketRegime === 'bull',
      value: marketRegime,
      detail: marketRegime === 'bull' ? 'Preis über EMA(200) auf 1d — übergeordneter Bull-Trend' : marketRegime === 'bear' ? 'Preis unter EMA(200) auf 1d — Bear-Regime' : 'Seitwärts um EMA(200) auf 1d',
      weight: 2
    },
    {
      id: 'rsi_1h_recovery',
      label: 'RSI(1h) in Recovery-Zone',
      passed: rsi1h !== undefined && rsi1h >= 35 && rsi1h <= 60,
      value: rsi1h !== undefined ? rsi1h.toFixed(0) : '—',
      detail: rsi1h !== undefined ? (rsi1h >= 35 && rsi1h <= 60 ? `RSI ${rsi1h.toFixed(0)} — nicht überhitzt, kein Panik-Verkauf` : `RSI ${rsi1h.toFixed(0)} — außerhalb der idealen Range`) : 'RSI nicht verfügbar',
      weight: 1
    },
    {
      id: 'rsi_4h_healthy',
      label: 'RSI(4h) > 40',
      passed: rsi4h !== undefined && rsi4h > 40,
      value: rsi4h !== undefined ? rsi4h.toFixed(0) : '—',
      detail: rsi4h !== undefined && rsi4h > 40 ? `RSI(4h) ${rsi4h.toFixed(0)} über 40 — mittelfristig nicht ausverkauft` : `RSI(4h) ${rsi4h?.toFixed(0) ?? '—'} unter 40 — Markt ist schwach`,
      weight: 1
    },
    {
      id: 'macd_1h_bullish',
      label: 'MACD(1h) bullish',
      passed: macdState1h === 'bullish_cross' || macdState1h === 'bullish',
      value: macdState1h,
      detail: macdState1h === 'bullish_cross' ? 'Frischer MACD bullish cross — bestes Timing' : macdState1h === 'bullish' ? 'MACD-Histogramm positiv' : 'MACD-Histogramm negativ',
      weight: 2
    },
    {
      id: 'macd_4h_positive',
      label: 'MACD(4h) positiv',
      passed: macdHist4h > 0,
      value: macdHist4h.toFixed(3),
      detail: macdHist4h > 0 ? 'MACD-Histogramm auf 4h positiv — Momentum hält an' : 'MACD-Histogramm auf 4h negativ',
      weight: 1
    },
    {
      id: 'adx_trend_strength',
      label: 'ADX(14) > 20',
      passed: adx1h > 20,
      value: adx1h.toFixed(0),
      detail: adx1h > 25 ? `ADX ${adx1h.toFixed(0)} — sehr starker Trend` : adx1h > 20 ? `ADX ${adx1h.toFixed(0)} — Trend stark genug zum Reiten` : `ADX ${adx1h.toFixed(0)} — kein klarer Trend (range-bound)`,
      weight: 2
    },
    {
      id: 'volume_spike',
      label: 'Volume > 1.3x avg',
      passed: volRatio >= 1.3,
      value: `${volRatio.toFixed(2)}x`,
      detail: volRatio >= 2 ? `Volume +${((volRatio - 1) * 100).toFixed(0)}% — starkes Interesse` : volRatio >= 1.3 ? `Volume +${((volRatio - 1) * 100).toFixed(0)}% über Schnitt` : `Volume unter Durchschnitt — kein Konfirmations-Signal`,
      weight: 1
    },
    {
      id: 'not_fomo',
      label: 'Preis nicht im FOMO-Bereich',
      passed: distFromUpperBand > 1.5,
      value: `${distFromUpperBand.toFixed(1)}%`,
      detail: distFromUpperBand > 1.5 ? `Preis ${distFromUpperBand.toFixed(1)}% unter Bollinger-Upper — noch Raum nach oben` : `Preis nahe/über Bollinger-Upper — überkauft, FOMO-Risiko`,
      weight: 1
    },
    {
      id: 'stochastic_ok',
      label: 'Stochastic nicht überkauft',
      passed: stochK < 80 && stochD < 80,
      value: `${stochK.toFixed(0)}/${stochD.toFixed(0)}`,
      detail: stochK >= 80 ? `Stochastic ${stochK.toFixed(0)} — überkauft, Rücksetzer wahrscheinlich` : `Stochastic ${stochK.toFixed(0)} — gesunde Range`,
      weight: 1
    },
    {
      id: 'swing_low_nearby',
      label: 'Stop-Level identifiziert',
      passed: swingLow !== null && swingLowDistPct > 0 && swingLowDistPct < 5,
      value: swingLow !== null ? `${swingLowDistPct.toFixed(1)}% entfernt` : '—',
      detail: swingLow !== null && swingLowDistPct > 0 && swingLowDistPct < 5 ? `Letztes Swing-Low ${swingLowDistPct.toFixed(1)}% unter Entry — logischer Stop` : 'Kein klares Swing-Low in Reichweite — Stop wird via ATR gesetzt',
      weight: 1
    }
  ];

  return { checks, entry, atr1h, marketRegime };
}

async function analyzeCoin(coin: UniverseCoin, ticker: TickerSnapshot): Promise<AnalyzedCoin | null> {
  const [c1h, c4h, c1d] = await Promise.all([
    fetchKlinesBySymbol(coin.binanceSymbol, '1h', 100),
    fetchKlinesBySymbol(coin.binanceSymbol, '4h', 80),
    fetchKlinesBySymbol(coin.binanceSymbol, '1d', 250)
  ]);
  if (!c1h || c1h.length < 50 || !c4h || c4h.length < 50 || !c1d || c1d.length < 30) return null;

  const { checks, entry, atr1h, marketRegime } = buildChecks(c1h, c4h, c1d);
  const passedCount = checks.filter((c) => c.passed).length;
  const totalCount = checks.length;
  const totalWeight = checks.reduce((s, c) => s + c.weight, 0);
  const passedWeight = checks.filter((c) => c.passed).reduce((s, c) => s + c.weight, 0);

  const stopLoss = entry - RISK_R * atr1h;
  const stopDistancePct = ((entry - stopLoss) / entry) * 100;
  const takeProfit1 = entry + TP1_R * atr1h;
  const takeProfit2 = entry + TP2_R * atr1h;

  return {
    coin,
    ticker,
    candles1h: c1h,
    candles4h: c4h,
    candles1d: c1d,
    checks,
    passedCount,
    totalCount,
    totalWeight,
    passedWeight,
    entry,
    stopLoss,
    takeProfit1,
    takeProfit2,
    stopDistancePct,
    atr1h,
    marketRegime
  };
}

function buildOneLineReason(analyzed: AnalyzedCoin): string {
  const passed = analyzed.checks.filter((c) => c.passed);
  const trendChecks = passed.filter((c) => c.id.startsWith('trend_'));
  const momentumChecks = passed.filter((c) => c.id === 'macd_1h_bullish' || c.id === 'macd_4h_positive' || c.id === 'adx_trend_strength');
  const volChecks = passed.filter((c) => c.id === 'volume_spike');

  const parts: string[] = [];
  if (trendChecks.length >= 2) parts.push(`Trend stimmt auf ${trendChecks.length} Timeframes`);
  if (momentumChecks.length >= 2) parts.push('Momentum bestätigt');
  if (volChecks.length > 0) parts.push('Volumen pusht');
  if (parts.length === 0) parts.push('Setup ist ok aber nicht spektakulär');
  return parts.join(' · ');
}

export async function buildMasterSignal(deepAnalyzeCount = 12): Promise<MasterSignalReport> {
  const tickerMap = await fetchAllTickers();
  if (!tickerMap) {
    return {
      kind: 'no_trade',
      bestCandidate: null,
      marketRegime: 'sideways',
      marketMood: 'neutral',
      reasons: ['Daten-Provider gerade nicht erreichbar — keine valide Analyse möglich.'],
      generatedAt: new Date().toISOString()
    };
  }

  const tickers = Array.from(tickerMap.values());
  const negShare = tickers.filter((t) => t.priceChangePct < -2).length / tickers.length;
  const posShare = tickers.filter((t) => t.priceChangePct > 2).length / tickers.length;
  const marketMood: 'risk-on' | 'risk-off' | 'neutral' = negShare > 0.6 ? 'risk-off' : posShare > 0.6 ? 'risk-on' : 'neutral';

  const withTickers = TOP_50
    .map((c) => ({ coin: c, ticker: tickerMap.get(c.binanceSymbol) }))
    .filter((x): x is { coin: UniverseCoin; ticker: TickerSnapshot } => !!x.ticker);

  const candidates = withTickers
    .map((x) => ({
      ...x,
      interestScore: Math.abs(x.ticker.priceChangePct) + Math.log10(Math.max(x.ticker.quoteVolume, 1)) * 0.8
    }))
    .sort((a, b) => b.interestScore - a.interestScore)
    .slice(0, deepAnalyzeCount);

  const analyzed = (await Promise.all(candidates.map((x) => analyzeCoin(x.coin, x.ticker))))
    .filter((a): a is AnalyzedCoin => a !== null)
    .sort((a, b) => b.passedWeight - a.passedWeight);

  const best = analyzed[0];
  if (!best) {
    return {
      kind: 'no_trade',
      bestCandidate: null,
      marketRegime: 'sideways',
      marketMood,
      reasons: ['Keine Coins lieferten ausreichende Kline-Daten für eine Analyse.'],
      generatedAt: new Date().toISOString()
    };
  }

  const rrTp1 = TP1_R / RISK_R;
  const rrTp2 = TP2_R / RISK_R;
  const brokers: string[] = [];
  if (isTickerOnCoinbase(best.coin.symbol).available) brokers.push('Coinbase');
  brokers.push('Bybit Spot');
  brokers.push('Binance Spot');

  const tradable = best.passedCount >= MIN_PASSED_FOR_TRADE;
  const candidateRec: TradeRecommendation = {
    kind: 'trade',
    coin: best.coin,
    ticker: best.ticker,
    type: 'LONG',
    entry: best.entry,
    stopLoss: best.stopLoss,
    takeProfit1: best.takeProfit1,
    takeProfit2: best.takeProfit2,
    stopDistancePct: best.stopDistancePct,
    rrTp1,
    rrTp2,
    atr1h: best.atr1h,
    confidence: Math.round((best.passedWeight / best.totalWeight) * 100),
    checks: best.checks,
    passedCount: best.passedCount,
    totalCount: best.totalCount,
    oneLineReason: buildOneLineReason(best),
    brokers,
    marketRegime: best.marketRegime,
    generatedAt: new Date().toISOString()
  };

  if (tradable && (marketMood !== 'risk-off' || best.passedCount >= 9)) {
    return candidateRec;
  }

  const failedChecks = best.checks.filter((c) => !c.passed);
  return {
    kind: 'no_trade',
    bestCandidate: candidateRec,
    marketRegime: best.marketRegime,
    marketMood,
    reasons: [
      `Bestes Setup im 50-Coin-Universum (${best.coin.symbol}) erreicht nur ${best.passedCount}/${best.totalCount} Bestätigungen.`,
      `Trade-Schwelle: ≥${MIN_PASSED_FOR_TRADE} Bestätigungen.`,
      marketMood === 'risk-off' ? 'Markt aktuell Risk-off (>60% der Coins -2%+) — selbst gute Setups laufen oft schief.' : 'Markt-Kontext ist neutral, aber Konfluenz auf Coin-Ebene reicht nicht.',
      ...failedChecks.slice(0, 3).map((c) => `Fehlt: ${c.label} (${c.detail})`)
    ],
    generatedAt: new Date().toISOString()
  };
}

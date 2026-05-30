import { Candle } from '@/lib/types/domain';
import { adx, atr, bollinger, detectSwingLow, ema, macd, macdState, rsi, sma, stochastic, last } from '@/lib/analysis/indicators';
import { fetchKlinesBySymbol } from '@/lib/providers/binance';
import { fetchAllTickers, TickerSnapshot } from '@/lib/providers/binance-tickers';
import { TOP_50, UniverseCoin } from '@/lib/coin-universe';
import { isTickerOnCoinbase } from '@/lib/data/brokers/coinbase-assets';
import { isTickerOnScalable } from '@/lib/data/brokers/scalable-assets';
import { Structure, StructureAssessment, assessMarketStructure } from '@/lib/analysis/market-structure';
import { CrowdAssessment, assessCrowd } from '@/lib/analysis/crowd';
import { fetchFearGreed } from '@/lib/providers/sentiment-indicators';
import { fetchFundingRate } from '@/lib/providers/funding-rates';

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
  btcRegime: 'bull' | 'bear' | 'sideways';
  marketStructure: Structure;
  marketMood: 'risk-on' | 'risk-off' | 'neutral';
  crowd: CrowdAssessment;
  mode: TradeMode;
  candidates: RankedCandidate[];
  generatedAt: string;
}

export interface NoTradeReport {
  kind: 'no_trade';
  bestCandidate: TradeRecommendation | null;
  marketRegime: 'bull' | 'bear' | 'sideways';
  btcRegime: 'bull' | 'bear' | 'sideways';
  marketStructure: Structure;
  crowd: CrowdAssessment;
  marketMood: 'risk-on' | 'risk-off' | 'neutral';
  reasons: string[];
  mode: TradeMode;
  candidates: RankedCandidate[];
  generatedAt: string;
}

export interface RankedCandidate {
  symbol: string;
  coinId: string;
  passedCount: number;
  totalCount: number;
  confidence: number;
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  stopDistancePct: number;
  rrTp1: number;
  tier: 'strong' | 'standard' | 'weak';
  oneLineReason: string;
  brokers: string[];
  quoteVolume: number;
  structure: Structure;
  positionInRange: number | null;
  nearSupport: boolean;
  confirmed: boolean;
  relStrengthVsBtc: number;
  priceChangePct24h: number;
}

export type MasterSignalReport = TradeRecommendation | NoTradeReport;

export const MIN_PASSED_FOR_TRADE = 7;
const RISK_R = 1.5;
const TP1_R = 2.5;
const TP2_R = 5.0;

// Strategy exits at the market price after this many hours if no target is hit.
// Mirrors MAX_HOLD_BARS (72 × 1h) in the strategy backtest (swing default).
export const MAX_HOLD_HOURS = 72;

export type TradeMode = 'swing' | 'daytrade';

export interface ModeTimeframes {
  fast: string;
  mid: string;
  slow: string;
  maxHoldHours: number;
}

// Swing reads 1h/4h/1d (hold up to ~3 days); day-trade reads 5m/15m/1h for
// intraday signals that are meant to be closed the same day (hold ~6h max).
export const MODE_CONFIG: Record<TradeMode, ModeTimeframes> = {
  swing: { fast: '1h', mid: '4h', slow: '1d', maxHoldHours: 72 },
  daytrade: { fast: '5m', mid: '15m', slow: '1h', maxHoldHours: 6 }
};

export interface SignalAction {
  verdict: 'BUY_NOW' | 'WAIT' | 'NO_SETUP';
  headline: string;
  detail: string;
  horizonText: string | null;
}

export function describeSignalAction(report: MasterSignalReport): SignalAction {
  const maxHold = MODE_CONFIG[report.mode].maxHoldHours;
  const horizonText =
    report.mode === 'daytrade'
      ? `Zeithorizont: Minuten bis wenige Stunden (Intraday). Ohne Ziel 1 schließt die Strategie spätestens nach ${maxHold}h zum Marktpreis.`
      : `Zeithorizont: meist Stunden bis ~3 Tage. Wird Ziel 1 nicht erreicht, schließt die Strategie spätestens nach ${maxHold}h (3 Tagen) zum Marktpreis.`;

  if (report.kind === 'trade') {
    return {
      verdict: 'BUY_NOW',
      headline: `JETZT kaufen — ${report.coin.symbol} zum Marktpreis`,
      detail:
        `${report.passedCount}/${report.totalCount} Bestätigungen erfüllt ` +
        `(Schwelle ≥${MIN_PASSED_FOR_TRADE}/12). Einstieg sofort zum Markt — ` +
        `genau so misst es auch der Backtest. 50% bei Ziel 1 sichern, Stop nachziehen.`,
      horizonText
    };
  }

  const best = report.bestCandidate;
  if (best) {
    const missing = Math.max(0, MIN_PASSED_FOR_TRADE - best.passedCount);
    return {
      verdict: 'WAIT',
      headline: `WARTEN — bestes Setup ${best.coin.symbol} (${best.passedCount}/${best.totalCount})`,
      detail:
        missing > 0
          ? `Noch kein Kauf: es fehlen ${missing} Bestätigung${missing === 1 ? '' : 'en'} ` +
            `bis zur Schwelle von ≥${MIN_PASSED_FOR_TRADE}/12. Beobachten — sobald erreicht, ` +
            `wird daraus ein Kaufsignal.`
          : `Schwelle erreicht, aber der Marktfilter (Regime/Stimmung) blockiert noch. Beobachten.`,
      horizonText: null
    };
  }

  return {
    verdict: 'NO_SETUP',
    headline: 'WARTEN — kein brauchbares Setup im Markt',
    detail:
      report.reasons[0] ??
      'Aktuell bietet kein Coin im Universum ausreichende Konfluenz. Cash halten ist auch eine Position.',
    horizonText: null
  };
}

export interface BriefingStep {
  label: string;
  text: string;
  tone: 'good' | 'bad' | 'neutral';
}

// Synthesises the engine's filters into a top-down narrative — the way a pro
// reads the market: broad market -> Bitcoin (the leader) -> the best setup's
// own structure -> crowd sentiment -> the resulting decision.
export function buildMarketBriefing(report: MasterSignalReport): BriefingStep[] {
  const steps: BriefingStep[] = [];

  steps.push(
    report.marketMood === 'risk-on'
      ? { label: 'Gesamtmarkt', text: 'Die meisten Coins steigen — Rückenwind für Käufe.', tone: 'good' }
      : report.marketMood === 'risk-off'
        ? { label: 'Gesamtmarkt', text: 'Die meisten Coins fallen (Risk-off) — Gegenwind, Vorsicht.', tone: 'bad' }
        : { label: 'Gesamtmarkt', text: 'Markt gemischt, kein klarer Trend in der Breite.', tone: 'neutral' }
  );

  steps.push(
    report.btcRegime === 'bull'
      ? { label: 'Bitcoin (Leitmarkt)', text: 'BTC ist bullisch — Alts haben grünes Licht.', tone: 'good' }
      : report.btcRegime === 'bear'
        ? { label: 'Bitcoin (Leitmarkt)', text: 'BTC ist bärisch — gegen den Leitmarkt kauft man keine Alts.', tone: 'bad' }
        : { label: 'Bitcoin (Leitmarkt)', text: 'BTC läuft seitwärts — kein klarer Rückenwind.', tone: 'neutral' }
  );

  steps.push(
    report.marketStructure === 'uptrend'
      ? { label: 'Struktur', text: 'Bestes Setup zeigt höhere Hochs & Tiefs — gesunder Aufwärtstrend.', tone: 'good' }
      : report.marketStructure === 'downtrend'
        ? { label: 'Struktur', text: 'Bestes Setup zeigt tiefere Hochs & Tiefs — fallendes Messer, Finger weg.', tone: 'bad' }
        : { label: 'Struktur', text: 'Bestes Setup in einer Seitwärts-Range — keine klare Richtung.', tone: 'neutral' }
  );

  steps.push({
    label: 'Stimmung',
    text: report.crowd.detail,
    tone: report.crowd.cautious ? 'bad' : report.crowd.state === 'fear' ? 'good' : 'neutral'
  });

  if (report.kind === 'trade') {
    steps.push({
      label: 'Entscheidung',
      text: `KAUFEN — ${report.coin.symbol}. Markt-Kontext passt und das Setup ist stark genug (${report.passedCount}/${report.totalCount}).`,
      tone: 'good'
    });
  } else {
    steps.push({
      label: 'Entscheidung',
      text: `WARTEN. ${report.reasons[0] ?? 'Kein ausreichendes Setup.'}`,
      tone: 'neutral'
    });
  }

  return steps;
}

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
  structure: StructureAssessment;
  confirmed: boolean;
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

async function analyzeCoin(coin: UniverseCoin, ticker: TickerSnapshot, tf: ModeTimeframes): Promise<AnalyzedCoin | null> {
  const [c1h, c4h, c1d] = await Promise.all([
    fetchKlinesBySymbol(coin.binanceSymbol, tf.fast, 100),
    fetchKlinesBySymbol(coin.binanceSymbol, tf.mid, 80),
    fetchKlinesBySymbol(coin.binanceSymbol, tf.slow, 250)
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
  const structure = assessMarketStructure(c4h);
  // Multi-bar confirmation: the last 2 fast-timeframe closes are rising, so the
  // move has held for several bars rather than being a single-candle fakeout.
  const n = c1h.length;
  const confirmed = c1h[n - 1].close > c1h[n - 2].close && c1h[n - 2].close > c1h[n - 3].close;

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
    marketRegime,
    structure,
    confirmed
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

export function tierForConfluence(passed: number): 'strong' | 'standard' | 'weak' | null {
  if (passed >= 9) return 'strong';
  if (passed >= MIN_PASSED_FOR_TRADE) return 'standard';
  if (passed >= 5) return 'weak';
  return null;
}

// Given a candidate's confluence and the user's chosen threshold, decide
// whether it counts as actionable ("Kaufbar") or merely speculative.
export function candidateStanding(passed: number, threshold: number): { actionable: boolean; label: string } {
  return passed >= threshold
    ? { actionable: true, label: 'Kaufbar' }
    : { actionable: false, label: 'Spekulativ — kleiner sizen' };
}

export type TradeBlock = 'confluence' | 'risk-off' | 'btc-bear' | 'downtrend-structure' | 'crowd-extreme' | null;

// Pro-trader gate: a setup only becomes an actual buy if it clears the
// confluence threshold AND the market context allows it. A weak broad market
// (risk-off), a bearish Bitcoin (the market leader) or a clear downtrend in the
// coin's own structure blocks all but the strongest setups — pros don't fight
// the leader and don't buy into a falling-knife structure.
export function shouldEmitTrade(p: {
  passedCount: number;
  threshold: number;
  isBtc: boolean;
  marketMood: 'risk-on' | 'risk-off' | 'neutral';
  btcRegime: 'bull' | 'bear' | 'sideways';
  structure: Structure;
  crowdCautious: boolean;
}): { emit: boolean; blockedReason: TradeBlock } {
  if (p.passedCount < p.threshold) return { emit: false, blockedReason: 'confluence' };
  if (p.marketMood === 'risk-off' && p.passedCount < 9) return { emit: false, blockedReason: 'risk-off' };
  if (!p.isBtc && p.btcRegime === 'bear' && p.passedCount < 10) return { emit: false, blockedReason: 'btc-bear' };
  if (p.structure === 'downtrend' && p.passedCount < 10) return { emit: false, blockedReason: 'downtrend-structure' };
  if (p.crowdCautious && p.passedCount < 9) return { emit: false, blockedReason: 'crowd-extreme' };
  return { emit: true, blockedReason: null };
}

function brokersFor(symbol: string): string[] {
  const brokers: string[] = [];
  if (isTickerOnCoinbase(symbol).available) brokers.push('Coinbase');
  if (isTickerOnScalable(symbol).available) brokers.push('Scalable Capital');
  brokers.push('Bybit Spot');
  brokers.push('Binance Spot');
  return brokers;
}

function toRankedCandidate(a: AnalyzedCoin, btcPct: number): RankedCandidate {
  return {
    symbol: a.coin.symbol,
    coinId: a.coin.id,
    passedCount: a.passedCount,
    totalCount: a.totalCount,
    confidence: Math.round((a.passedWeight / a.totalWeight) * 100),
    entry: a.entry,
    stopLoss: a.stopLoss,
    takeProfit1: a.takeProfit1,
    takeProfit2: a.takeProfit2,
    stopDistancePct: a.stopDistancePct,
    rrTp1: TP1_R / RISK_R,
    tier: tierForConfluence(a.passedCount) ?? 'weak',
    oneLineReason: buildOneLineReason(a),
    brokers: brokersFor(a.coin.symbol),
    quoteVolume: a.ticker.quoteVolume,
    structure: a.structure.structure,
    positionInRange: a.structure.positionInRange,
    nearSupport: a.structure.nearSupport,
    confirmed: a.confirmed,
    relStrengthVsBtc: a.ticker.priceChangePct - btcPct,
    priceChangePct24h: a.ticker.priceChangePct
  };
}

export async function buildMasterSignal(mode: TradeMode = 'swing', deepAnalyzeCount = 12): Promise<MasterSignalReport> {
  const tf = MODE_CONFIG[mode];
  const [tickerMap, fearGreed, fundingBtc] = await Promise.all([
    fetchAllTickers(),
    fetchFearGreed(),
    fetchFundingRate('BTCUSDT')
  ]);
  const crowd = assessCrowd(fearGreed?.value ?? null, fundingBtc?.fundingRateAnnualizedPct ?? null);
  if (!tickerMap) {
    return {
      kind: 'no_trade',
      bestCandidate: null,
      marketRegime: 'sideways',
      btcRegime: 'sideways',
      marketStructure: 'range',
      crowd,
      marketMood: 'neutral',
      mode,
      reasons: ['Daten-Provider gerade nicht erreichbar — keine valide Analyse möglich.'],
      candidates: [],
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

  const scored = withTickers
    .map((x) => ({
      ...x,
      interestScore: Math.abs(x.ticker.priceChangePct) + Math.log10(Math.max(x.ticker.quoteVolume, 1)) * 0.8
    }))
    .sort((a, b) => b.interestScore - a.interestScore);

  const top = scored.slice(0, deepAnalyzeCount);
  // Always analyse Bitcoin (the market leader, used as a filter below) and
  // commodities (gold moves slowly and rarely tops the interest score).
  const forced = scored.filter((x) => (x.coin.category === 'commodity' || x.coin.id === 'btc') && !top.includes(x));
  const candidates = [...top, ...forced];

  const analyzed = (await Promise.all(candidates.map((x) => analyzeCoin(x.coin, x.ticker, tf))))
    .filter((a): a is AnalyzedCoin => a !== null)
    .sort((a, b) => b.passedWeight - a.passedWeight);

  const btc = analyzed.find((a) => a.coin.id === 'btc');
  const btcRegime: 'bull' | 'bear' | 'sideways' = btc?.marketRegime ?? 'sideways';

  const best = analyzed[0];
  if (!best) {
    return {
      kind: 'no_trade',
      bestCandidate: null,
      marketRegime: 'sideways',
      btcRegime,
      marketStructure: 'range',
      crowd,
      marketMood,
      mode,
      reasons: ['Keine Coins lieferten ausreichende Kline-Daten für eine Analyse.'],
      candidates: [],
      generatedAt: new Date().toISOString()
    };
  }

  const structure = best.structure;

  const rrTp1 = TP1_R / RISK_R;
  const rrTp2 = TP2_R / RISK_R;
  const brokers = brokersFor(best.coin.symbol);

  const btcPct = tickerMap.get('BTCUSDT')?.priceChangePct ?? 0;
  const rankedCandidates = analyzed
    .filter((a) => a.passedCount >= 5)
    .slice(0, 6)
    .map((a) => toRankedCandidate(a, btcPct));

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
    btcRegime,
    marketStructure: structure.structure,
    marketMood,
    crowd,
    mode,
    candidates: [],
    generatedAt: new Date().toISOString()
  };

  const gate = shouldEmitTrade({
    passedCount: best.passedCount,
    threshold: MIN_PASSED_FOR_TRADE,
    isBtc: best.coin.id === 'btc',
    marketMood,
    btcRegime,
    structure: structure.structure,
    crowdCautious: crowd.cautious
  });

  if (gate.emit) {
    return { ...candidateRec, candidates: rankedCandidates };
  }

  const failedChecks = best.checks.filter((c) => !c.passed);
  const contextReason =
    gate.blockedReason === 'risk-off'
      ? 'Markt aktuell Risk-off (>60% der Coins -2%+) — selbst gute Setups laufen oft schief.'
      : gate.blockedReason === 'btc-bear'
        ? 'Bitcoin (Leitmarkt) ist bärisch — gegen einen schwachen BTC kaufen Profis keine Alts. Erst wenn BTC dreht.'
        : gate.blockedReason === 'downtrend-structure'
          ? `Struktur von ${best.coin.symbol} zeigt nach unten (tiefere Hochs & Tiefs) — nicht ins fallende Messer greifen.`
          : gate.blockedReason === 'crowd-extreme'
            ? crowd.detail
            : 'Markt-Kontext ist neutral, aber Konfluenz auf Coin-Ebene reicht nicht.';
  return {
    kind: 'no_trade',
    bestCandidate: candidateRec,
    marketRegime: best.marketRegime,
    btcRegime,
    marketStructure: structure.structure,
    crowd,
    marketMood,
    reasons: [
      `Bestes Setup im 50-Coin-Universum (${best.coin.symbol}) erreicht nur ${best.passedCount}/${best.totalCount} Bestätigungen.`,
      `Trade-Schwelle: ≥${MIN_PASSED_FOR_TRADE} Bestätigungen.`,
      contextReason,
      ...failedChecks.slice(0, 3).map((c) => `Fehlt: ${c.label} (${c.detail})`)
    ],
    mode,
    candidates: rankedCandidates,
    generatedAt: new Date().toISOString()
  };
}

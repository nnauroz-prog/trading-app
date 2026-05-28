export function sma(values: number[], period: number): number[] {
  if (period <= 0 || values.length < period) return [];
  const out: number[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out.push(sum / period);
  }
  return out;
}

export function ema(values: number[], period: number): number[] {
  if (period <= 0 || values.length < period) return [];
  const k = 2 / (period + 1);
  const out: number[] = [];
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out.push(prev);
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

export function rsi(values: number[], period = 14): number[] {
  if (values.length < period + 1) return [];
  const gains: number[] = [];
  const losses: number[] = [];
  for (let i = 1; i < values.length; i++) {
    const change = values[i] - values[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);
  }
  const out: number[] = [];
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
  const firstRs = avgLoss === 0 ? Infinity : avgGain / avgLoss;
  out.push(100 - 100 / (1 + firstRs));
  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    const rs = avgLoss === 0 ? Infinity : avgGain / avgLoss;
    out.push(100 - 100 / (1 + rs));
  }
  return out;
}

export interface MacdResult {
  macd: number[];
  signal: number[];
  histogram: number[];
}

export function macd(values: number[], fast = 12, slow = 26, signalPeriod = 9): MacdResult {
  if (values.length < slow + signalPeriod) return { macd: [], signal: [], histogram: [] };
  const fastEma = ema(values, fast);
  const slowEma = ema(values, slow);
  const offset = slow - fast;
  const macdLine: number[] = [];
  for (let i = 0; i < slowEma.length; i++) {
    macdLine.push(fastEma[i + offset] - slowEma[i]);
  }
  const signalLine = ema(macdLine, signalPeriod);
  const sigOffset = macdLine.length - signalLine.length;
  const histogram: number[] = [];
  for (let i = 0; i < signalLine.length; i++) {
    histogram.push(macdLine[i + sigOffset] - signalLine[i]);
  }
  return { macd: macdLine.slice(sigOffset), signal: signalLine, histogram };
}

export function macdState(result: MacdResult): 'bullish_cross' | 'bearish_cross' | 'bullish' | 'bearish' | 'neutral' {
  const { histogram } = result;
  if (histogram.length < 2) return 'neutral';
  const last = histogram[histogram.length - 1];
  const prev = histogram[histogram.length - 2];
  if (prev <= 0 && last > 0) return 'bullish_cross';
  if (prev >= 0 && last < 0) return 'bearish_cross';
  if (last > 0) return 'bullish';
  if (last < 0) return 'bearish';
  return 'neutral';
}

export function last<T>(arr: T[]): T | undefined {
  return arr.length > 0 ? arr[arr.length - 1] : undefined;
}

export interface Bar {
  high: number;
  low: number;
  close: number;
}

export function atr(bars: Bar[], period = 14): number[] {
  if (bars.length < period + 1) return [];
  const trs: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    const high = bars[i].high;
    const low = bars[i].low;
    const prevClose = bars[i - 1].close;
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    trs.push(tr);
  }
  const out: number[] = [];
  let prev = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out.push(prev);
  for (let i = period; i < trs.length; i++) {
    prev = (prev * (period - 1) + trs[i]) / period;
    out.push(prev);
  }
  return out;
}

export interface AdxResult {
  adx: number[];
  plusDi: number[];
  minusDi: number[];
}

export function adx(bars: Bar[], period = 14): AdxResult {
  if (bars.length < period * 2) return { adx: [], plusDi: [], minusDi: [] };
  const plusDM: number[] = [];
  const minusDM: number[] = [];
  const trs: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    const upMove = bars[i].high - bars[i - 1].high;
    const downMove = bars[i - 1].low - bars[i].low;
    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
    const tr = Math.max(
      bars[i].high - bars[i].low,
      Math.abs(bars[i].high - bars[i - 1].close),
      Math.abs(bars[i].low - bars[i - 1].close)
    );
    trs.push(tr);
  }
  const smooth = (arr: number[]): number[] => {
    const out: number[] = [];
    let sum = arr.slice(0, period).reduce((a, b) => a + b, 0);
    out.push(sum);
    for (let i = period; i < arr.length; i++) {
      sum = sum - sum / period + arr[i];
      out.push(sum);
    }
    return out;
  };
  const sPlus = smooth(plusDM);
  const sMinus = smooth(minusDM);
  const sTR = smooth(trs);
  const plusDi: number[] = [];
  const minusDi: number[] = [];
  for (let i = 0; i < sPlus.length; i++) {
    plusDi.push(sTR[i] > 0 ? (100 * sPlus[i]) / sTR[i] : 0);
    minusDi.push(sTR[i] > 0 ? (100 * sMinus[i]) / sTR[i] : 0);
  }
  const dx: number[] = [];
  for (let i = 0; i < plusDi.length; i++) {
    const sum = plusDi[i] + minusDi[i];
    dx.push(sum > 0 ? (100 * Math.abs(plusDi[i] - minusDi[i])) / sum : 0);
  }
  const adxOut: number[] = [];
  if (dx.length >= period) {
    let prev = dx.slice(0, period).reduce((a, b) => a + b, 0) / period;
    adxOut.push(prev);
    for (let i = period; i < dx.length; i++) {
      prev = (prev * (period - 1) + dx[i]) / period;
      adxOut.push(prev);
    }
  }
  return { adx: adxOut, plusDi, minusDi };
}

export interface BollingerResult {
  middle: number[];
  upper: number[];
  lower: number[];
}

export function bollinger(values: number[], period = 20, k = 2): BollingerResult {
  if (values.length < period) return { middle: [], upper: [], lower: [] };
  const middle = sma(values, period);
  const upper: number[] = [];
  const lower: number[] = [];
  for (let i = 0; i < middle.length; i++) {
    const slice = values.slice(i, i + period);
    const mean = middle[i];
    const variance = slice.reduce((s, v) => s + (v - mean) ** 2, 0) / period;
    const sd = Math.sqrt(variance);
    upper.push(mean + k * sd);
    lower.push(mean - k * sd);
  }
  return { middle, upper, lower };
}

export interface StochasticResult {
  k: number[];
  d: number[];
}

export function stochastic(bars: Bar[], kPeriod = 14, dPeriod = 3): StochasticResult {
  if (bars.length < kPeriod) return { k: [], d: [] };
  const kVals: number[] = [];
  for (let i = kPeriod - 1; i < bars.length; i++) {
    const slice = bars.slice(i - kPeriod + 1, i + 1);
    const highest = Math.max(...slice.map((b) => b.high));
    const lowest = Math.min(...slice.map((b) => b.low));
    const close = bars[i].close;
    const k = highest === lowest ? 50 : ((close - lowest) / (highest - lowest)) * 100;
    kVals.push(k);
  }
  const dVals = sma(kVals, dPeriod);
  return { k: kVals, d: dVals };
}

export function detectSwingLow(bars: Bar[], lookback = 3): number | null {
  if (bars.length < lookback * 2 + 1) return null;
  for (let i = bars.length - 1 - lookback; i >= lookback; i--) {
    const b = bars[i];
    let isLow = true;
    for (let j = 1; j <= lookback; j++) {
      if (bars[i - j].low < b.low || bars[i + j].low < b.low) {
        isLow = false;
        break;
      }
    }
    if (isLow) return b.low;
  }
  return null;
}

export function detectSwingHigh(bars: Bar[], lookback = 3): number | null {
  if (bars.length < lookback * 2 + 1) return null;
  for (let i = bars.length - 1 - lookback; i >= lookback; i--) {
    const b = bars[i];
    let isHigh = true;
    for (let j = 1; j <= lookback; j++) {
      if (bars[i - j].high > b.high || bars[i + j].high > b.high) {
        isHigh = false;
        break;
      }
    }
    if (isHigh) return b.high;
  }
  return null;
}

// Reine technische Indikatoren auf Tageskerzen. Keine Fetches, keine Seiteneffekte.
// Verwendet auf der Aktien-Detail-Seite. Eingaben dürfen kurz sein — die Funktionen
// geben dann konservativ null zurück statt zu raten.

import type { PriceCandle } from '@/lib/market/yahoo-history';

export function sma(values: number[], period: number): number | null {
  if (values.length < period || period <= 0) return null;
  let sum = 0;
  for (let i = values.length - period; i < values.length; i++) sum += values[i];
  return sum / period;
}

export function ema(values: number[], period: number): number | null {
  if (values.length < period || period <= 0) return null;
  const k = 2 / (period + 1);
  let e = values.slice(0, period).reduce((s, v) => s + v, 0) / period;
  for (let i = period; i < values.length; i++) e = values[i] * k + e * (1 - k);
  return e;
}

// Wilder-RSI auf Closes. Standard 14-Tage.
export function rsi(values: number[], period = 14): number | null {
  if (values.length < period + 1) return null;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = values[i] - values[i - 1];
    if (d >= 0) gain += d; else loss -= d;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  for (let i = period + 1; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

// Average True Range (Wilder). Gibt die Volatilität in Preis-Einheiten.
export function atr(candles: PriceCandle[], period = 14): number | null {
  if (candles.length < period + 1) return null;
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const prev = candles[i - 1];
    trs.push(Math.max(c.high - c.low, Math.abs(c.high - prev.close), Math.abs(c.low - prev.close)));
  }
  let a = trs.slice(0, period).reduce((s, v) => s + v, 0) / period;
  for (let i = period; i < trs.length; i++) a = (a * (period - 1) + trs[i]) / period;
  return a;
}

export interface RangeStat {
  high: number;
  low: number;
  current: number;
  positionPct: number; // 0 = am Tief, 100 = am Hoch
}

// 52-Wochen-Range aus den letzten ~252 Handelstagen.
export function fiftyTwoWeekRange(candles: PriceCandle[]): RangeStat | null {
  if (candles.length === 0) return null;
  const window = candles.slice(-252);
  let hi = -Infinity;
  let lo = Infinity;
  for (const c of window) {
    if (c.high > hi) hi = c.high;
    if (c.low < lo) lo = c.low;
  }
  const current = window[window.length - 1].close;
  const positionPct = hi > lo ? ((current - lo) / (hi - lo)) * 100 : 50;
  return { high: hi, low: lo, current, positionPct: Math.max(0, Math.min(100, positionPct)) };
}

// Verhältnis Tagesvolumen zum 20-Tage-Schnitt. Über 1.5 = auffällig viel Interesse.
export function volumeRatio(candles: PriceCandle[], period = 20): number | null {
  if (candles.length < period + 1) return null;
  const recent = candles.slice(-period - 1, -1);
  const avg = recent.reduce((s, c) => s + c.volume, 0) / period;
  const today = candles[candles.length - 1].volume;
  return avg > 0 ? today / avg : null;
}

// Prozentuale Performance über n Handelstage zum aktuellen Close.
export function performancePct(candles: PriceCandle[], daysBack: number): number | null {
  if (candles.length < daysBack + 1) return null;
  const now = candles[candles.length - 1].close;
  const then = candles[candles.length - 1 - daysBack].close;
  return then > 0 ? ((now - then) / then) * 100 : null;
}

export type TrendVerdict = 'bullish' | 'bearish' | 'neutral';

// Klassischer MA-Status: Preis über MA50 UND MA50 über MA200 = bullisch.
export function trendVerdict(price: number, ma50: number | null, ma200: number | null): TrendVerdict {
  if (ma50 === null || ma200 === null) return 'neutral';
  if (price > ma50 && ma50 > ma200) return 'bullish';
  if (price < ma50 && ma50 < ma200) return 'bearish';
  return 'neutral';
}

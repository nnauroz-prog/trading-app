import type { PriceHistory } from '@/lib/market/yahoo-history';
import type { MarketQuote } from '@/lib/market/yahoo-quote';

export const FUND_PURCHASE_SYMBOL = 'VWCE.DE';

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_QUOTE_AGE_MS = 4 * DAY_MS;
const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;
const MAX_RETURN_DATE_GAP_MS = 7 * DAY_MS;

export type QuoteUnavailableReason =
  | 'missing-quote'
  | 'wrong-symbol'
  | 'wrong-currency'
  | 'invalid-price'
  | 'invalid-timestamp'
  | 'future-quote'
  | 'stale-quote'
  | 'unknown-source';

export type HistoryUnavailableReason =
  | 'missing-history'
  | 'wrong-symbol'
  | 'wrong-currency'
  | 'no-valid-prices'
  | 'insufficient-prices';

export interface ObservedPricePoint {
  time: number;
  close: number;
}

/** An observed price change between the two stated dates, never a forecast. */
export interface ObservedFundReturn {
  months: 1 | 3 | 12;
  returnPct: number;
  startAt: number;
  endAt: number;
  startClose: number;
  endClose: number;
}

/** Largest closing-price loss from an earlier observed peak in this dataset. */
export interface ObservedFundDrawdown {
  /** Positive loss magnitude: 20 means the observed fall was 20%. */
  drawdownPct: number;
  peakAt: number;
  troughAt: number;
  periodStartAt: number;
  periodEndAt: number;
}

export interface FundHistoryAnalysis {
  usable: boolean;
  unavailableReason: HistoryUnavailableReason | null;
  /** Valid EUR closes only, sorted by date and deduplicated by timestamp. */
  points: ObservedPricePoint[];
  asOf: number | null;
  startAt: number | null;
  return1m: ObservedFundReturn | null;
  return3m: ObservedFundReturn | null;
  return12m: ObservedFundReturn | null;
  maxDrawdown: ObservedFundDrawdown | null;
}

export interface FundPurchaseAnalysisInput {
  budget: number;
  quote: MarketQuote | null;
  history: PriceHistory | null;
  ongoingChargePct: number;
  now?: number;
}

export interface FundPurchaseAnalysis {
  /** Budget rounded down to whole cents; null for invalid/unsafe amounts. */
  budgetEur: number | null;
  budgetCents: number | null;
  quoteUsable: boolean;
  quoteUnavailableReason: QuoteUnavailableReason | null;
  quoteAsOf: number | null;
  /** Stooq's timestamp is retrieval time, not the time of the market price. */
  quoteTimestampKind: 'market-time' | 'retrieved-at' | null;
  /** Conservatively rounds a subcent quote up for purchase illustration. */
  unitPriceEur: number | null;
  wholeUnits: number | null;
  estimatedUnitsCost: number | null;
  estimatedUnitsCostCents: number | null;
  /** Before any unknown broker fees, spread, taxes, or execution changes. */
  remainder: number | null;
  remainderCents: number | null;
  /** Illustrative annual charge on a constant budget; not deducted from cash. */
  annualFundCost: number | null;
  /** Only available when an actual previous close is supplied by Yahoo. */
  lastSessionChangePct: number | null;
  lastSessionChangeAbs: number | null;
  history: FundHistoryAnalysis;
}

/**
 * Convert the decimal representation to cents without binary-float ceil/floor
 * errors (for example 1.1 * 100 can otherwise become 110.00000000000001).
 * Integer arithmetic also makes purchase cost + remainder conserve cents.
 */
function toWholeCents(value: number, direction: 'up' | 'down'): number | null {
  if (!Number.isFinite(value) || value < 0) return null;
  const [coefficient, exponentText = '0'] = value.toString().split('e');
  const [whole, fraction = ''] = coefficient.split('.');
  const numerator = BigInt(`${whole}${fraction}`);
  const exponent = Number(exponentText) + 2 - fraction.length;
  let cents: bigint;
  if (exponent >= 0) {
    cents = numerator * (10n ** BigInt(exponent));
  } else {
    const denominator = 10n ** BigInt(-exponent);
    cents = direction === 'up'
      ? (numerator + denominator - 1n) / denominator
      : numerator / denominator;
  }
  return cents <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(cents) : null;
}

function validTimestamp(value: number): boolean {
  return Number.isFinite(value) && value > 0 && Number.isFinite(new Date(value).getTime());
}

function quoteRejection(quote: MarketQuote | null, now: number): QuoteUnavailableReason | null {
  if (!quote) return 'missing-quote';
  if (quote.symbol !== FUND_PURCHASE_SYMBOL) return 'wrong-symbol';
  if (quote.currency !== 'EUR') return 'wrong-currency';
  if (!Number.isFinite(quote.last) || quote.last <= 0 || toWholeCents(quote.last, 'up') === null) {
    return 'invalid-price';
  }
  if (!validTimestamp(quote.ts)) return 'invalid-timestamp';
  if (quote.ts > now + MAX_FUTURE_SKEW_MS) return 'future-quote';
  if (quote.ts < now - MAX_QUOTE_AGE_MS) return 'stale-quote';
  if (quote.source !== 'yahoo' && quote.source !== 'stooq') return 'unknown-source';
  return null;
}

function calendarMonthsBefore(time: number, months: number): number {
  const date = new Date(time);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() - months);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date.getTime();
}

function observedReturn(points: ObservedPricePoint[], months: 1 | 3 | 12): ObservedFundReturn | null {
  const end = points.at(-1);
  if (!end || points.length < 2) return null;
  const target = calendarMonthsBefore(end.time, months);
  let start: ObservedPricePoint | null = null;
  let nearestGap = Infinity;
  // A missing market day may move the actual start by at most seven days.
  // Exact observation dates are returned so callers can label that interval.
  for (const point of points) {
    if (point.time >= end.time) break;
    const gap = Math.abs(point.time - target);
    if (gap < nearestGap && gap <= MAX_RETURN_DATE_GAP_MS) {
      start = point;
      nearestGap = gap;
    }
  }
  if (!start) return null;
  const returnPct = (end.close / start.close - 1) * 100;
  if (!Number.isFinite(returnPct)) return null;
  return { months, returnPct, startAt: start.time, endAt: end.time, startClose: start.close, endClose: end.close };
}

function observedDrawdown(points: ObservedPricePoint[]): ObservedFundDrawdown | null {
  if (points.length < 2) return null;
  let peak = points[0];
  let peakAt = peak.time;
  let troughAt = peak.time;
  let drawdownPct = 0;
  for (const point of points) {
    if (point.close > peak.close) peak = point;
    const lossPct = (1 - point.close / peak.close) * 100;
    if (lossPct > drawdownPct) {
      drawdownPct = lossPct;
      peakAt = peak.time;
      troughAt = point.time;
    }
  }
  return { drawdownPct, peakAt, troughAt, periodStartAt: points[0].time, periodEndAt: points[points.length - 1].time };
}

function analyzeHistory(history: PriceHistory | null, now: number): FundHistoryAnalysis {
  const empty = (unavailableReason: HistoryUnavailableReason): FundHistoryAnalysis => ({
    usable: false,
    unavailableReason,
    points: [],
    asOf: null,
    startAt: null,
    return1m: null,
    return3m: null,
    return12m: null,
    maxDrawdown: null,
  });
  if (!history) return empty('missing-history');
  if (history.symbol !== FUND_PURCHASE_SYMBOL) return empty('wrong-symbol');
  if (history.currency !== 'EUR') return empty('wrong-currency');
  if (!Array.isArray(history.candles)) return empty('no-valid-prices');
  const byTime = new Map<number, ObservedPricePoint>();
  for (const candle of history.candles) {
    if (!candle || !validTimestamp(candle.time) || candle.time > now + MAX_FUTURE_SKEW_MS) continue;
    if (!Number.isFinite(candle.close) || candle.close <= 0) continue;
    byTime.set(candle.time, { time: candle.time, close: candle.close });
  }
  const points = [...byTime.values()].sort((a, b) => a.time - b.time);
  if (points.length === 0) return empty('no-valid-prices');
  return {
    usable: points.length >= 2,
    unavailableReason: points.length >= 2 ? null : 'insufficient-prices',
    points,
    asOf: points[points.length - 1].time,
    startAt: points[0].time,
    return1m: observedReturn(points, 1),
    return3m: observedReturn(points, 3),
    return12m: observedReturn(points, 12),
    maxDrawdown: observedDrawdown(points),
  };
}

/** Pure, illustrative EUR purchase arithmetic and observed price-history facts. */
export function analyzeFundPurchase(input: FundPurchaseAnalysisInput): FundPurchaseAnalysis {
  const now = validTimestamp(input.now ?? NaN) ? input.now! : Date.now();
  const budgetCents = toWholeCents(input.budget, 'down');
  const budgetEur = budgetCents === null ? null : budgetCents / 100;
  const quoteUnavailableReason = quoteRejection(input.quote, now);
  const usableQuote = quoteUnavailableReason === null ? input.quote : null;
  const unitPriceCents = usableQuote ? toWholeCents(usableQuote.last, 'up') : null;
  const wholeUnits = budgetCents !== null && unitPriceCents !== null
    ? Number(BigInt(budgetCents) / BigInt(unitPriceCents))
    : null;
  const estimatedUnitsCostCents = wholeUnits !== null && unitPriceCents !== null ? wholeUnits * unitPriceCents : null;
  const remainderCents = budgetCents !== null && estimatedUnitsCostCents !== null ? budgetCents - estimatedUnitsCostCents : null;
  const validCharge = Number.isFinite(input.ongoingChargePct) && input.ongoingChargePct >= 0 && input.ongoingChargePct <= 100;
  const annualFundCost = budgetEur !== null && validCharge
    ? Math.round(budgetEur * input.ongoingChargePct) / 100
    : null;
  let lastSessionChangePct: number | null = null;
  let lastSessionChangeAbs: number | null = null;
  // Stooq's fallback uses today's open in previousClose, not a prior close.
  if (usableQuote?.source === 'yahoo' && Number.isFinite(usableQuote.previousClose) && usableQuote.previousClose > 0) {
    const changePct = (usableQuote.last / usableQuote.previousClose - 1) * 100;
    const changeAbs = usableQuote.last - usableQuote.previousClose;
    if (Number.isFinite(changePct) && Number.isFinite(changeAbs)) {
      lastSessionChangePct = changePct;
      lastSessionChangeAbs = changeAbs;
    }
  }
  return {
    budgetEur,
    budgetCents,
    quoteUsable: usableQuote !== null,
    quoteUnavailableReason,
    quoteAsOf: usableQuote?.ts ?? null,
    quoteTimestampKind: usableQuote ? (usableQuote.source === 'stooq' ? 'retrieved-at' : 'market-time') : null,
    unitPriceEur: unitPriceCents === null ? null : unitPriceCents / 100,
    wholeUnits,
    estimatedUnitsCost: estimatedUnitsCostCents === null ? null : estimatedUnitsCostCents / 100,
    estimatedUnitsCostCents,
    remainder: remainderCents === null ? null : remainderCents / 100,
    remainderCents,
    annualFundCost,
    lastSessionChangePct,
    lastSessionChangeAbs,
    history: analyzeHistory(input.history, now),
  };
}

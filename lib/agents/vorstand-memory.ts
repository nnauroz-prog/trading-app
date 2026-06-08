import { todayIsoBerlin } from '@/lib/agent-memory';
import { VorstandVerdict } from '@/lib/agents/vorstand';

export interface VorstandSnapshot {
  date: string;
  recordedAt: number;
  verdict: VorstandVerdict;
  consensusCoin: string | null;
  buyCount: number;
  conflictCount: number;
  headline: string;
}

const STORAGE_KEY = 'trading-app.vorstand-log-v1';
const MAX_ENTRIES = 365;
export const VORSTAND_LOG_CHANGED_EVENT = 'trading-app:vorstand-log-changed';

export function loadVorstandLog(): VorstandSnapshot[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as VorstandSnapshot[];
  } catch {
    return [];
  }
}

export function recordVorstand(snapshot: Omit<VorstandSnapshot, 'date' | 'recordedAt'>): void {
  if (typeof window === 'undefined') return;
  const log = loadVorstandLog();
  const date = todayIsoBerlin();
  const entry: VorstandSnapshot = { date, recordedAt: Date.now(), ...snapshot };
  const idx = log.findIndex((e) => e.date === date);
  if (idx >= 0) log[idx] = entry;
  else log.push(entry);
  log.sort((a, b) => a.date.localeCompare(b.date));
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(log.slice(-MAX_ENTRIES)));
  window.dispatchEvent(new CustomEvent(VORSTAND_LOG_CHANGED_EVENT));
}

export function clearVorstandLog(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(VORSTAND_LOG_CHANGED_EVENT));
}

export interface VorstandStats {
  totalDays: number;
  klarerKauf: number;
  kaufenVorsichtig: number;
  watchlist: number;
  cashHalten: number;
  consensusRate: number; // share of days with KLARER_KAUF or KAUFEN_VORSICHTIG
  mostFrequentCoin: { coin: string; days: number } | null;
  daysSinceLastBuy: number | null;
}

// Vorstand-Accuracy: gleicht jeden Vorstand-Verdict gegen die naechste BTC-
// Tagesbewegung ab. KLARER_KAUF / KAUFEN_VORSICHTIG sind „richtig", wenn BTC
// am naechsten Tag mindestens DIRECTION_THRESHOLD % gestiegen ist. CASH_HALTEN
// ist richtig, wenn BTC nicht klar gestiegen ist (Cash-Halten war ok).
// WATCHLIST ist neutral und wird nicht bewertet (kein klares Aktions-Versprechen).

const VORSTAND_DIRECTION_THRESHOLD = 0.5;

export interface VorstandAccuracy {
  evaluated: number;
  rightCalls: number;
  hitRatePct: number | null;
  // Pro Verdict-Typ aufgeschluesselt — interessant für Diagnose:
  // war der Vorstand bei KLARER_KAUF treffsicherer als bei KAUFEN_VORSICHTIG?
  perVerdict: Record<VorstandVerdict, { evaluated: number; rightCalls: number; hitRatePct: number | null }>;
}

export function computeVorstandAccuracy(log: VorstandSnapshot[], btcPriceFor: (date: string) => number | null): VorstandAccuracy {
  const sortedDates = log.map((e) => e.date).sort();
  const perVerdict: Record<VorstandVerdict, { evaluated: number; rightCalls: number; hitRatePct: number | null }> = {
    KLARER_KAUF: { evaluated: 0, rightCalls: 0, hitRatePct: null },
    KAUFEN_VORSICHTIG: { evaluated: 0, rightCalls: 0, hitRatePct: null },
    WATCHLIST: { evaluated: 0, rightCalls: 0, hitRatePct: null },
    CASH_HALTEN: { evaluated: 0, rightCalls: 0, hitRatePct: null }
  };
  let evaluated = 0;
  let right = 0;
  for (const e of log) {
    const todayPrice = btcPriceFor(e.date);
    if (todayPrice === null) continue;
    const nextDate = sortedDates.find((d) => d > e.date);
    if (!nextDate) continue;
    const nextPrice = btcPriceFor(nextDate);
    if (nextPrice === null) continue;
    const movePct = ((nextPrice - todayPrice) / todayPrice) * 100;
    const isUp = movePct >= VORSTAND_DIRECTION_THRESHOLD;
    let outcome: boolean | null;
    if (e.verdict === 'KLARER_KAUF' || e.verdict === 'KAUFEN_VORSICHTIG') outcome = isUp;
    else if (e.verdict === 'CASH_HALTEN') outcome = !isUp;
    else outcome = null; // WATCHLIST nicht bewerten
    if (outcome === null) continue;
    perVerdict[e.verdict].evaluated++;
    if (outcome) perVerdict[e.verdict].rightCalls++;
    evaluated++;
    if (outcome) right++;
  }
  for (const k of Object.keys(perVerdict) as VorstandVerdict[]) {
    const v = perVerdict[k];
    v.hitRatePct = v.evaluated > 0 ? Math.round((v.rightCalls / v.evaluated) * 100) : null;
  }
  return {
    evaluated,
    rightCalls: right,
    hitRatePct: evaluated > 0 ? Math.round((right / evaluated) * 100) : null,
    perVerdict
  };
}

export function summariseVorstand(log: VorstandSnapshot[]): VorstandStats {
  const total = log.length;
  const klar = log.filter((e) => e.verdict === 'KLARER_KAUF').length;
  const vorsicht = log.filter((e) => e.verdict === 'KAUFEN_VORSICHTIG').length;
  const watch = log.filter((e) => e.verdict === 'WATCHLIST').length;
  const cash = log.filter((e) => e.verdict === 'CASH_HALTEN').length;
  const consensusRate = total > 0 ? Math.round(((klar + vorsicht) / total) * 100) : 0;

  const coinCount = new Map<string, number>();
  for (const e of log) {
    if (!e.consensusCoin) continue;
    coinCount.set(e.consensusCoin, (coinCount.get(e.consensusCoin) ?? 0) + 1);
  }
  let mostFrequentCoin: VorstandStats['mostFrequentCoin'] = null;
  for (const [coin, days] of coinCount.entries()) {
    if (!mostFrequentCoin || days > mostFrequentCoin.days) mostFrequentCoin = { coin, days };
  }

  let daysSinceLastBuy: number | null = null;
  const sortedReverse = [...log].reverse();
  const lastBuyIdx = sortedReverse.findIndex((e) => e.verdict === 'KLARER_KAUF' || e.verdict === 'KAUFEN_VORSICHTIG');
  if (lastBuyIdx >= 0) daysSinceLastBuy = lastBuyIdx;

  return {
    totalDays: total,
    klarerKauf: klar,
    kaufenVorsichtig: vorsicht,
    watchlist: watch,
    cashHalten: cash,
    consensusRate,
    mostFrequentCoin,
    daysSinceLastBuy
  };
}

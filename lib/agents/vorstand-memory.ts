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

import { StrategyParams } from '@/lib/analysis/strategy-backtest';
import { todayIsoBerlin } from '@/lib/agent-memory';

export interface AkademieSnapshot {
  date: string; // YYYY-MM-DD (Europe/Berlin)
  recordedAt: number;

  // Lehrling
  bestVariantId: string;
  bestParams: StrategyParams;
  bestNetReturnPct: number;
  bestWinRatePct: number;
  bestTotalTrades: number;
  baselineId: string;
  baselineNetReturnPct: number;

  // Späher
  newsBullish: number;
  newsBearish: number;
  newsNeutral: number;
  newsTopTitle: string | null;
  newsTopScore: number | null;
  newsTopImpact: 'bullish' | 'bearish' | 'neutral' | null;
}

const STORAGE_KEY = 'trading-app.akademie-log-v1';
const MAX_ENTRIES = 365;

export const AKADEMIE_LOG_CHANGED_EVENT = 'trading-app:akademie-log-changed';

export function loadAkademieLog(): AkademieSnapshot[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as AkademieSnapshot[];
  } catch {
    return [];
  }
}

export function recordAkademieSnapshot(snapshot: AkademieSnapshot): void {
  if (typeof window === 'undefined') return;
  const log = loadAkademieLog();
  const idx = log.findIndex((e) => e.date === snapshot.date);
  if (idx >= 0) log[idx] = snapshot;
  else log.push(snapshot);
  log.sort((a, b) => a.date.localeCompare(b.date));
  const trimmed = log.slice(-MAX_ENTRIES);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  window.dispatchEvent(new CustomEvent(AKADEMIE_LOG_CHANGED_EVENT));
}

export function clearAkademieLog(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(AKADEMIE_LOG_CHANGED_EVENT));
}

export interface LehrlingStability {
  currentBestId: string | null;
  daysStable: number; // how many consecutive recent days the best variant was the same
  totalSwitches: number; // how many times the best variant changed across the log
  avgNetReturnPct: number;
  bestEverNetReturnPct: number;
}

export function lehrlingStability(log: AkademieSnapshot[]): LehrlingStability {
  if (log.length === 0) {
    return { currentBestId: null, daysStable: 0, totalSwitches: 0, avgNetReturnPct: 0, bestEverNetReturnPct: 0 };
  }
  const last = log[log.length - 1];
  let daysStable = 1;
  for (let i = log.length - 2; i >= 0; i--) {
    if (log[i].bestVariantId === last.bestVariantId) daysStable++;
    else break;
  }
  let switches = 0;
  for (let i = 1; i < log.length; i++) {
    if (log[i].bestVariantId !== log[i - 1].bestVariantId) switches++;
  }
  const avg = log.reduce((s, e) => s + e.bestNetReturnPct, 0) / log.length;
  const bestEver = log.reduce((s, e) => Math.max(s, e.bestNetReturnPct), -Infinity);
  return {
    currentBestId: last.bestVariantId,
    daysStable,
    totalSwitches: switches,
    avgNetReturnPct: Math.round(avg * 10) / 10,
    bestEverNetReturnPct: Math.round(bestEver * 10) / 10
  };
}

export interface SpaeherTrend {
  totalDays: number;
  avgBullish: number;
  avgBearish: number;
  bias: 'bullisch' | 'bärisch' | 'neutral';
  recentShift: 'stärker bullisch' | 'stärker bärisch' | 'stabil' | null;
}

export function spaeherTrend(log: AkademieSnapshot[]): SpaeherTrend {
  if (log.length === 0) {
    return { totalDays: 0, avgBullish: 0, avgBearish: 0, bias: 'neutral', recentShift: null };
  }
  const avgBull = log.reduce((s, e) => s + e.newsBullish, 0) / log.length;
  const avgBear = log.reduce((s, e) => s + e.newsBearish, 0) / log.length;
  const bias: SpaeherTrend['bias'] =
    avgBull > avgBear * 1.3 ? 'bullisch' :
    avgBear > avgBull * 1.3 ? 'bärisch' : 'neutral';

  let recentShift: SpaeherTrend['recentShift'] = null;
  if (log.length >= 4) {
    const recent = log.slice(-3);
    const prior = log.slice(-6, -3);
    if (prior.length > 0) {
      const recentBullShare = recent.reduce((s, e) => s + e.newsBullish, 0) / recent.length;
      const priorBullShare = prior.reduce((s, e) => s + e.newsBullish, 0) / prior.length;
      const recentBearShare = recent.reduce((s, e) => s + e.newsBearish, 0) / recent.length;
      const priorBearShare = prior.reduce((s, e) => s + e.newsBearish, 0) / prior.length;
      if (recentBullShare > priorBullShare + 1) recentShift = 'stärker bullisch';
      else if (recentBearShare > priorBearShare + 1) recentShift = 'stärker bärisch';
      else recentShift = 'stabil';
    }
  }

  return {
    totalDays: log.length,
    avgBullish: Math.round(avgBull * 10) / 10,
    avgBearish: Math.round(avgBear * 10) / 10,
    bias,
    recentShift
  };
}

export function buildSnapshot(input: Omit<AkademieSnapshot, 'date' | 'recordedAt'>): AkademieSnapshot {
  return { date: todayIsoBerlin(), recordedAt: Date.now(), ...input };
}

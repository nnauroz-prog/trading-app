export type AgentVerdict = 'BUY_NOW' | 'WAIT' | 'NO_SETUP';

export interface AgentDecision {
  date: string; // YYYY-MM-DD (Europe/Berlin)
  recordedAt: number;
  verdict: AgentVerdict;
  coin: string | null;
  entry: number | null;
  stopLoss: number | null;
  takeProfit1: number | null;
  passedCount: number | null;
  totalCount: number | null;
  safetyGrade: 'A' | 'B' | 'C' | 'D' | null;
  safetyScore: number | null;
  marketMood: 'risk-on' | 'risk-off' | 'neutral';
  btcRegime: 'bull' | 'bear' | 'sideways';
  reason: string;
}

const STORAGE_KEY = 'trading-app.agent-decisions-v1';
const MAX_ENTRIES = 365;

export const AGENT_DECISIONS_CHANGED_EVENT = 'trading-app:agent-decisions-changed';

export function todayIsoBerlin(now: Date = new Date()): string {
  // Use Europe/Berlin date as the bucket key so a decision is recorded once per
  // calendar day in the user's timezone.
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now);
  return parts; // already YYYY-MM-DD
}

export function loadDecisionLog(): AgentDecision[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as AgentDecision[];
  } catch {
    return [];
  }
}

export function recordDecision(d: AgentDecision): void {
  if (typeof window === 'undefined') return;
  const log = loadDecisionLog();
  const idx = log.findIndex((e) => e.date === d.date);
  if (idx >= 0) {
    // Replace today's entry — the latest read is the canonical record for today.
    log[idx] = d;
  } else {
    log.push(d);
  }
  // Keep chronological order and cap.
  log.sort((a, b) => a.date.localeCompare(b.date));
  const trimmed = log.slice(-MAX_ENTRIES);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  window.dispatchEvent(new CustomEvent(AGENT_DECISIONS_CHANGED_EVENT));
}

export function clearDecisionLog(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(AGENT_DECISIONS_CHANGED_EVENT));
}

export interface DecisionStats {
  total: number;
  buys: number;
  waits: number;
  uniqueCoinsRecommended: number;
  firstDate: string | null;
  lastDate: string | null;
}

export function summarize(log: AgentDecision[]): DecisionStats {
  const buys = log.filter((d) => d.verdict === 'BUY_NOW').length;
  const waits = log.length - buys;
  const coins = new Set(log.filter((d) => d.coin).map((d) => d.coin as string));
  return {
    total: log.length,
    buys,
    waits,
    uniqueCoinsRecommended: coins.size,
    firstDate: log.length > 0 ? log[0].date : null,
    lastDate: log.length > 0 ? log[log.length - 1].date : null
  };
}

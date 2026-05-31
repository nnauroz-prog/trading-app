import { todayIsoBerlin } from '@/lib/agent-memory';
import { IntelSignal } from '@/lib/intel/types';

export interface IntelSnapshot {
  date: string;             // YYYY-MM-DD (Europe/Berlin)
  recordedAt: number;
  netSignal: IntelSignal;
  riskOnCount: number;
  riskOffCount: number;
  neutralCount: number;
  lagebericht: string;
  // Was the market direction "right" for this Lagebericht the next day?
  // Resolved retroactively when the next snapshot is recorded: we look at
  // BTC's actual movement between this snapshot's day and the next one.
  // Resolution lives on the next-day snapshot, so this stays append-only.
  btcPriceAtRecord: number | null;
  // Individual specialist votes for accuracy attribution.
  specialistVotes: Array<{ id: string; title: string; signal: IntelSignal }>;
}

const STORAGE_KEY = 'trading-app.intel-log-v1';
const MAX_ENTRIES = 365;

export const INTEL_LOG_CHANGED_EVENT = 'trading-app:intel-log-changed';

export function loadIntelLog(): IntelSnapshot[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as IntelSnapshot[];
  } catch {
    return [];
  }
}

export function recordIntelSnapshot(snapshot: IntelSnapshot): void {
  if (typeof window === 'undefined') return;
  const log = loadIntelLog();
  const idx = log.findIndex((e) => e.date === snapshot.date);
  if (idx >= 0) log[idx] = snapshot;
  else log.push(snapshot);
  log.sort((a, b) => a.date.localeCompare(b.date));
  const trimmed = log.slice(-MAX_ENTRIES);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  window.dispatchEvent(new CustomEvent(INTEL_LOG_CHANGED_EVENT));
}

export function clearIntelLog(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(INTEL_LOG_CHANGED_EVENT));
}

export function buildIntelSnapshot(input: Omit<IntelSnapshot, 'date' | 'recordedAt'>): IntelSnapshot {
  return { date: todayIsoBerlin(), recordedAt: Date.now(), ...input };
}

// CEO accuracy: comparing each snapshot's netSignal to the BTC move between
// that day's record and the next day's record. risk-on is "right" if BTC
// went up by ≥ 0.5%, risk-off "right" if BTC went down ≥ 0.5%, neutral
// "right" if the move stayed inside ±0.5%.
export interface IntelAccuracy {
  evaluated: number;
  rightCalls: number;
  wrongCalls: number;
  hitRatePct: number | null;
  perSpecialist: Array<{ id: string; title: string; evaluated: number; rightCalls: number; hitRatePct: number | null }>;
}

const DIRECTION_THRESHOLD = 0.5;

function classifyMove(pct: number): 'up' | 'down' | 'flat' {
  if (pct >= DIRECTION_THRESHOLD) return 'up';
  if (pct <= -DIRECTION_THRESHOLD) return 'down';
  return 'flat';
}

function rightForSignal(signal: IntelSignal, move: 'up' | 'down' | 'flat'): boolean {
  if (signal === 'risk-on') return move === 'up';
  if (signal === 'risk-off') return move === 'down';
  if (signal === 'neutral') return move === 'flat';
  return false;
}

export function computeIntelAccuracy(log: IntelSnapshot[]): IntelAccuracy {
  const evaluatable: Array<{ snapshot: IntelSnapshot; nextPrice: number }> = [];
  for (let i = 0; i < log.length - 1; i++) {
    const cur = log[i];
    const next = log[i + 1];
    if (cur.btcPriceAtRecord !== null && next.btcPriceAtRecord !== null) {
      evaluatable.push({ snapshot: cur, nextPrice: next.btcPriceAtRecord });
    }
  }

  let rightCalls = 0;
  let wrongCalls = 0;
  const perSpec = new Map<string, { id: string; title: string; right: number; total: number }>();

  for (const { snapshot, nextPrice } of evaluatable) {
    if (snapshot.btcPriceAtRecord === null) continue;
    const pct = ((nextPrice - snapshot.btcPriceAtRecord) / snapshot.btcPriceAtRecord) * 100;
    const move = classifyMove(pct);
    if (snapshot.netSignal !== 'kein_signal') {
      if (rightForSignal(snapshot.netSignal, move)) rightCalls++;
      else wrongCalls++;
    }
    for (const sv of snapshot.specialistVotes) {
      if (!perSpec.has(sv.id)) perSpec.set(sv.id, { id: sv.id, title: sv.title, right: 0, total: 0 });
      const s = perSpec.get(sv.id)!;
      if (sv.signal !== 'kein_signal') {
        s.total++;
        if (rightForSignal(sv.signal, move)) s.right++;
      }
    }
  }

  return {
    evaluated: rightCalls + wrongCalls,
    rightCalls,
    wrongCalls,
    hitRatePct: rightCalls + wrongCalls > 0 ? Math.round((rightCalls / (rightCalls + wrongCalls)) * 100) : null,
    perSpecialist: Array.from(perSpec.values())
      .filter((s) => s.total >= 2)
      .map((s) => ({ id: s.id, title: s.title, evaluated: s.total, rightCalls: s.right, hitRatePct: Math.round((s.right / s.total) * 100) }))
      .sort((a, b) => (b.hitRatePct ?? 0) - (a.hitRatePct ?? 0))
  };
}

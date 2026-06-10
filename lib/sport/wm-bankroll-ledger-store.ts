// localStorage-Wrapper fuer das WM Bankroll-Ledger.
// Idempotent pro pickId — ein Pick kann nur EINMAL uebernommen werden
// (sonst wuerde Doppel-Klick die P&L-Statistik verzerren).

import type { StakeRecord } from '@/lib/sport/wm-bankroll-ledger';

const STORAGE_KEY = 'trading-app.wm-bankroll-ledger-v1';
const MAX_ENTRIES = 300;

export const WM_BANKROLL_LEDGER_CHANGED_EVENT = 'trading-app:wm-bankroll-ledger-changed';

export function loadStakeRecords(): StakeRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as StakeRecord[];
  } catch {
    return [];
  }
}

function save(entries: StakeRecord[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
  window.dispatchEvent(new CustomEvent(WM_BANKROLL_LEDGER_CHANGED_EVENT));
}

// Idempotent: existiert die pickId bereits, wird NICHT ueberschrieben.
export function recordStake(record: Omit<StakeRecord, 'recordedAt'>): StakeRecord {
  const list = loadStakeRecords();
  const existing = list.find((e) => e.id === record.id);
  if (existing) return existing;
  const created: StakeRecord = { ...record, recordedAt: Date.now() };
  list.push(created);
  save(list);
  return created;
}

export function removeStake(id: string): void {
  const list = loadStakeRecords().filter((e) => e.id !== id);
  save(list);
}

export function isStaked(id: string): boolean {
  return loadStakeRecords().some((e) => e.id === id);
}

export function clearLedger(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(WM_BANKROLL_LEDGER_CHANGED_EVENT));
}

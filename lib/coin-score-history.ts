// Tracks each coin's daily confluence score (passedCount) so we can show a
// 14-day trend per watched coin. Pure functions over a JSON blob in
// localStorage — same pattern as firma-memory.
export interface CoinScoreEntry {
  date: string; // YYYY-MM-DD (Europe/Berlin)
  passedCount: number;
}

export interface CoinScoreRecord {
  coinId: string;
  symbol: string;
  history: CoinScoreEntry[];
}

const STORAGE_KEY = 'trading-app.coin-score-history-v1';
const MAX_DAYS_PER_COIN = 60;
const MAX_COINS = 60;

export const COIN_SCORE_CHANGED_EVENT = 'trading-app:coin-score-changed';

export function loadCoinScoreHistory(): CoinScoreRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as CoinScoreRecord[];
  } catch {
    return [];
  }
}

// Pure merge step — kept exported for tests.
export function mergeScores(
  existing: CoinScoreRecord[],
  date: string,
  scores: { coinId: string; symbol: string; passedCount: number }[]
): CoinScoreRecord[] {
  const byCoin = new Map<string, CoinScoreRecord>(existing.map((r) => [r.coinId, r]));
  for (const s of scores) {
    const rec = byCoin.get(s.coinId) ?? { coinId: s.coinId, symbol: s.symbol, history: [] };
    const idx = rec.history.findIndex((h) => h.date === date);
    if (idx >= 0) {
      rec.history[idx] = { date, passedCount: s.passedCount };
    } else {
      rec.history.push({ date, passedCount: s.passedCount });
    }
    rec.history.sort((a, b) => a.date.localeCompare(b.date));
    if (rec.history.length > MAX_DAYS_PER_COIN) rec.history = rec.history.slice(-MAX_DAYS_PER_COIN);
    rec.symbol = s.symbol;
    byCoin.set(s.coinId, rec);
  }
  const out = Array.from(byCoin.values());
  // Keep most recently touched coins if we ever exceed the cap.
  if (out.length > MAX_COINS) {
    out.sort((a, b) => {
      const aLast = a.history[a.history.length - 1]?.date ?? '';
      const bLast = b.history[b.history.length - 1]?.date ?? '';
      return bLast.localeCompare(aLast);
    });
    return out.slice(0, MAX_COINS);
  }
  return out;
}

export function recordCoinScores(date: string, scores: { coinId: string; symbol: string; passedCount: number }[]): void {
  if (typeof window === 'undefined') return;
  const merged = mergeScores(loadCoinScoreHistory(), date, scores);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  window.dispatchEvent(new CustomEvent(COIN_SCORE_CHANGED_EVENT));
}

export interface CoinTrend {
  coinId: string;
  symbol: string;
  history: CoinScoreEntry[];
  latest: number | null;
  delta7d: number | null;
  delta14d: number | null;
}

export function summariseCoinTrend(records: CoinScoreRecord[], coinId: string): CoinTrend | null {
  const rec = records.find((r) => r.coinId === coinId);
  if (!rec || rec.history.length === 0) return null;
  const history = rec.history;
  const latest = history[history.length - 1].passedCount;
  const sevenAgo = history[history.length - 1 - 7]?.passedCount ?? null;
  const fourteenAgo = history[history.length - 1 - 14]?.passedCount ?? null;
  return {
    coinId: rec.coinId,
    symbol: rec.symbol,
    history,
    latest,
    delta7d: sevenAgo === null ? null : latest - sevenAgo,
    delta14d: fourteenAgo === null ? null : latest - fourteenAgo
  };
}

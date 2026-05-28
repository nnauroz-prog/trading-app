import { Candle } from '@/lib/types/domain';
import { IdeaJournalEntry, JournalOutcome } from '@/lib/types/positions';
import { TOP_50 } from '@/lib/coin-universe';

const HORIZON_HOURS = {
  outcome1d: 24,
  outcome3d: 72,
  outcome7d: 168,
  outcome30d: 720
} as const;

type HorizonKey = keyof typeof HORIZON_HOURS;

const POSITIVE_THRESHOLD_PCT = 2;
const NEGATIVE_THRESHOLD_PCT = -2;

export interface AutoEvalResult {
  entryId: string;
  patch: Partial<IdeaJournalEntry>;
  basis: 'crypto-price' | 'unverified';
  note: string;
}

function findAssetIdForUnderlying(underlying: string): string | null {
  const upper = underlying.toUpperCase().trim();
  const coin = TOP_50.find((c) => c.symbol === upper || c.id === upper.toLowerCase());
  return coin ? coin.id : null;
}

function classifyPctChange(pct: number): JournalOutcome {
  if (pct > POSITIVE_THRESHOLD_PCT) return 'positive';
  if (pct < NEGATIVE_THRESHOLD_PCT) return 'negative';
  return 'neutral';
}

function findCloseAt(candles: Candle[], targetTime: number): number | null {
  if (candles.length === 0) return null;
  let chosen: Candle | null = null;
  for (const c of candles) {
    if (c.openTime <= targetTime) chosen = c;
    else break;
  }
  return chosen ? chosen.close : null;
}

async function fetchDailyCandles(assetId: string, sinceMs: number): Promise<Candle[] | null> {
  try {
    const daysAgo = Math.ceil((Date.now() - sinceMs) / (24 * 60 * 60 * 1000));
    const limit = Math.min(Math.max(daysAgo + 10, 35), 1000);
    const res = await fetch(`/api/candles?assetId=${assetId}&interval=1d&limit=${limit}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.ok || !Array.isArray(data.candles)) return null;
    return data.candles as Candle[];
  } catch {
    return null;
  }
}

export async function evaluateEntryAutomatically(entry: IdeaJournalEntry): Promise<AutoEvalResult> {
  const parsedAtMs = new Date(entry.parsedAt).getTime();
  if (!Number.isFinite(parsedAtMs)) {
    return { entryId: entry.id, patch: {}, basis: 'unverified', note: 'parsedAt nicht parsebar' };
  }

  if (entry.ideaType !== 'crypto') {
    return {
      entryId: entry.id,
      patch: {},
      basis: 'unverified',
      note: 'Auto-Eval nur für Krypto verfügbar (Aktien-Daten brauchen Finnhub-Integration)'
    };
  }

  const assetId = findAssetIdForUnderlying(entry.underlying);
  if (!assetId) {
    return {
      entryId: entry.id,
      patch: {},
      basis: 'unverified',
      note: `Coin ${entry.underlying} nicht im Top-50-Universum`
    };
  }

  const candles = await fetchDailyCandles(assetId, parsedAtMs);
  if (!candles) {
    return { entryId: entry.id, patch: {}, basis: 'unverified', note: 'Kurs-Daten gerade nicht abrufbar' };
  }

  const basePrice = findCloseAt(candles, parsedAtMs);
  if (basePrice === null) {
    return { entryId: entry.id, patch: {}, basis: 'unverified', note: 'Kein Basis-Kurs zum Idea-Zeitpunkt verfügbar' };
  }

  const patch: Partial<IdeaJournalEntry> = {};
  const ageMs = Date.now() - parsedAtMs;
  for (const key of Object.keys(HORIZON_HOURS) as HorizonKey[]) {
    const horizonMs = HORIZON_HOURS[key] * 60 * 60 * 1000;
    if (ageMs < horizonMs) continue;
    const targetTime = parsedAtMs + horizonMs;
    const priceAt = findCloseAt(candles, targetTime);
    if (priceAt === null) continue;
    const pct = ((priceAt - basePrice) / basePrice) * 100;
    const current = entry[key];
    if (current === undefined || current === 'pending') {
      patch[key] = classifyPctChange(pct);
    }
  }

  const noteParts: string[] = [];
  if (patch.outcome1d) noteParts.push('1d');
  if (patch.outcome3d) noteParts.push('3d');
  if (patch.outcome7d) noteParts.push('7d');
  if (patch.outcome30d) noteParts.push('30d');
  const note = noteParts.length > 0
    ? `Auto-bewertet: ${noteParts.join(', ')} (Schwelle ±2%)`
    : 'Noch nicht alt genug für Auto-Bewertung';

  return { entryId: entry.id, patch, basis: 'crypto-price', note };
}

export interface AutoEvalSummary {
  attempted: number;
  updated: number;
  unverified: number;
  results: AutoEvalResult[];
}

export async function evaluateAllPending(entries: IdeaJournalEntry[]): Promise<AutoEvalSummary> {
  const pending = entries.filter((e) =>
    e.outcome1d === 'pending' || e.outcome1d === undefined ||
    e.outcome3d === 'pending' || e.outcome3d === undefined ||
    e.outcome7d === 'pending' || e.outcome7d === undefined ||
    e.outcome30d === 'pending' || e.outcome30d === undefined
  );

  const results: AutoEvalResult[] = [];
  for (const e of pending) {
    results.push(await evaluateEntryAutomatically(e));
  }

  return {
    attempted: pending.length,
    updated: results.filter((r) => Object.keys(r.patch).length > 0).length,
    unverified: results.filter((r) => r.basis === 'unverified').length,
    results
  };
}

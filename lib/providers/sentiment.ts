import { finnhubSymbolByAssetId, mockAssets } from '@/lib/data/mock';

const BASE = 'https://finnhub.io/api/v1';
const MAX_HEADLINES_PER_QUERY = 40;

const POSITIVE = new Set([
  'surge', 'surges', 'surged', 'beat', 'beats', 'beaten', 'gain', 'gains',
  'growth', 'rise', 'rises', 'rising', 'rally', 'rallies', 'upgrade',
  'upgraded', 'breakthrough', 'partnership', 'launch', 'launches',
  'record', 'strong', 'profit', 'profits', 'profitable', 'expansion',
  'expands', 'soar', 'soared', 'jump', 'jumped', 'optimism', 'bullish',
  'milestone', 'outperform', 'positive',
  'steigt', 'steigen', 'gestiegen', 'wachstum', 'gewinn', 'gewinne',
  'rekord', 'erfolg', 'erfolgreich', 'durchbruch', 'ausbau', 'stark',
  'positiv', 'partnerschaft', 'rally'
]);

const NEGATIVE = new Set([
  'miss', 'missed', 'downgrade', 'downgraded', 'layoff', 'layoffs',
  'lawsuit', 'fraud', 'decline', 'declines', 'declined', 'drop', 'drops',
  'dropped', 'fall', 'falls', 'fell', 'weak', 'weakness', 'loss', 'losses',
  'plunge', 'plunged', 'slump', 'slumped', 'recession', 'sell-off',
  'concern', 'concerns', 'warning', 'warns', 'fears', 'bearish', 'crash',
  'crashed', 'scandal', 'probe', 'investigation', 'fine', 'fined',
  'sinkt', 'sinken', 'gesunken', 'verlust', 'verluste', 'einbruch',
  'rückgang', 'schwach', 'sorgen', 'klage', 'skandal', 'ermittlung',
  'warnung', 'negativ', 'absturz'
]);

interface FinnhubNews {
  headline?: string;
  summary?: string;
  datetime?: number;
}

export async function fetchSentimentScores(): Promise<Record<string, number> | null> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return null;

  const today = new Date();
  const since = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const to = today.toISOString().slice(0, 10);
  const from = since.toISOString().slice(0, 10);

  const stockEntries = Object.entries(finnhubSymbolByAssetId);
  const cryptoIds = mockAssets.filter((a) => a.category === 'crypto').map((a) => a.id);

  const [stockScores, cryptoScore] = await Promise.all([
    Promise.all(stockEntries.map(async ([assetId, symbol]) => {
      const headlines = await fetchCompanyNews(symbol, from, to, apiKey);
      return [assetId, scoreHeadlines(headlines)] as const;
    })),
    fetchCryptoCategoryScore(apiKey)
  ]);

  const result: Record<string, number> = {};
  for (const [assetId, score] of stockScores) {
    if (score !== null) result[assetId] = score;
  }
  if (cryptoScore !== null) {
    for (const id of cryptoIds) result[id] = cryptoScore;
  }
  return Object.keys(result).length > 0 ? result : null;
}

async function fetchCompanyNews(symbol: string, from: string, to: string, apiKey: string): Promise<FinnhubNews[]> {
  const url = `${BASE}/company-news?symbol=${encodeURIComponent(symbol)}&from=${from}&to=${to}&token=${apiKey}`;
  return (await safeFetch<FinnhubNews[]>(url)) ?? [];
}

async function fetchCryptoCategoryScore(apiKey: string): Promise<number | null> {
  const url = `${BASE}/news?category=crypto&token=${apiKey}`;
  const headlines = await safeFetch<FinnhubNews[]>(url);
  if (!headlines) return null;
  return scoreHeadlines(headlines);
}

async function safeFetch<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { next: { revalidate: 900 } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function scoreHeadlines(items: FinnhubNews[]): number | null {
  const recent = items.slice(0, MAX_HEADLINES_PER_QUERY);
  if (recent.length === 0) return null;

  let net = 0;
  let counted = 0;
  for (const item of recent) {
    const text = `${item.headline ?? ''} ${item.summary ?? ''}`.toLowerCase();
    const score = scoreText(text);
    if (score !== 0) {
      net += score;
      counted += 1;
    }
  }
  if (counted === 0) return 50;
  const normalised = net / counted;
  return clamp(Math.round((normalised + 1) * 50));
}

function scoreText(text: string): number {
  let pos = 0;
  let neg = 0;
  const tokens = text.split(/[^\p{L}-]+/u);
  for (const token of tokens) {
    if (!token) continue;
    if (POSITIVE.has(token)) pos += 1;
    else if (NEGATIVE.has(token)) neg += 1;
  }
  if (pos === 0 && neg === 0) return 0;
  return pos > neg ? 1 : pos < neg ? -1 : 0;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

import { NewsItem } from '@/lib/news/news-agent';

export interface ScoredNews extends NewsItem {
  score: number; // 0..100 relevance
  impact: 'bullish' | 'bearish' | 'neutral';
  mentionedCoins: string[]; // BTC, ETH, SOL ... (display tickers)
  reasons: string[];
}

// Keyword tables. Kept small and explicit — easy to audit and tune.
const COIN_KEYWORDS: { display: string; aliases: string[] }[] = [
  { display: 'BTC', aliases: ['btc', 'bitcoin'] },
  { display: 'ETH', aliases: ['eth', 'ether', 'ethereum'] },
  { display: 'SOL', aliases: ['sol', 'solana'] },
  { display: 'XRP', aliases: ['xrp', 'ripple'] },
  { display: 'DOGE', aliases: ['doge', 'dogecoin'] },
  { display: 'ADA', aliases: ['ada', 'cardano'] },
  { display: 'BNB', aliases: ['bnb', 'binance coin'] },
  { display: 'AVAX', aliases: ['avax', 'avalanche'] },
  { display: 'LINK', aliases: ['link', 'chainlink'] }
];

const BULLISH = ['rally', 'rallye', 'allzeithoch', 'ath', 'breakout', 'pump', 'kaufsignal', 'aufwärts', 'steigt', 'bull', 'kursziel', 'kursrakete', 'rekordhoch', 'aufschwung', 'long', 'genehmigung', 'zulassung', 'etf-genehmigung', 'übernahme', 'kooperation', 'partnership'];
const BEARISH = ['crash', 'absturz', 'sturz', 'einbruch', 'verlust', 'sell-off', 'verkaufsdruck', 'hack', 'gehackt', 'pleite', 'insolvenz', 'liquidation', 'klage', 'sec-klage', 'verbot', 'regulierung', 'razzia', 'kursrutsch', 'fällt', 'fall', 'bear'];

const HIGH_IMPACT = ['etf', 'sec', 'fed', 'zinsentscheidung', 'halving', 'fork', 'upgrade', 'mainnet', 'whitehouse', 'bitcoin reserve', 'regulierung', 'mica', 'bafin'];

// Quality weight per source. Anchored by editorial-quality assumption.
const SOURCE_QUALITY: Record<string, number> = {
  'BTC-ECHO': 1.0,
  'Cointelegraph DE': 1.0,
  'CoinKurier': 0.85,
  'Kryptoszene': 0.85,
  'BlockchainWelt': 0.8
};

function normalize(s: string): string {
  return s.toLowerCase().replace(/[-_,;:!?()"„"]/g, ' ').replace(/\s+/g, ' ').trim();
}

function uniq<T>(arr: T[]): T[] { return Array.from(new Set(arr)); }

export function scoreNewsItem(item: NewsItem, now: number = Date.now()): ScoredNews {
  const text = normalize(item.title);
  const reasons: string[] = [];

  // Coin mentions.
  const mentionedCoins: string[] = [];
  for (const c of COIN_KEYWORDS) {
    if (c.aliases.some((a) => text.split(' ').includes(a) || text.includes(' ' + a + ' ') || text.startsWith(a + ' ') || text.endsWith(' ' + a))) {
      mentionedCoins.push(c.display);
    }
  }
  const coinPoints = Math.min(30, mentionedCoins.length * 12);
  if (mentionedCoins.length > 0) reasons.push(`erwähnt ${mentionedCoins.join(', ')}`);

  // Bull / Bear signals.
  const bullHits = BULLISH.filter((k) => text.includes(k));
  const bearHits = BEARISH.filter((k) => text.includes(k));
  let impact: ScoredNews['impact'] = 'neutral';
  if (bullHits.length > bearHits.length) impact = 'bullish';
  else if (bearHits.length > bullHits.length) impact = 'bearish';
  const directionPoints = Math.min(25, (bullHits.length + bearHits.length) * 10);
  if (impact === 'bullish') reasons.push(`bullische Wörter: ${uniq(bullHits).slice(0, 2).join(', ')}`);
  if (impact === 'bearish') reasons.push(`bärische Wörter: ${uniq(bearHits).slice(0, 2).join(', ')}`);

  // High-impact topics (regulation / ETF / Fed).
  const macroHits = HIGH_IMPACT.filter((k) => text.includes(k));
  const macroPoints = Math.min(25, macroHits.length * 15);
  if (macroHits.length > 0) reasons.push(`Schwergewicht: ${macroHits[0]}`);

  // Freshness — full points for ≤ 6h, decays linearly to 0 over 48h.
  const ageHours = Math.max(0, (now - item.publishedAt) / (1000 * 60 * 60));
  const freshnessPoints = Math.round(Math.max(0, Math.min(15, 15 - (ageHours - 6) * (15 / 42))));
  if (ageHours < 12) reasons.push(`frisch (${Math.round(ageHours)}h alt)`);

  // Source quality multiplier.
  const sourceWeight = SOURCE_QUALITY[item.source] ?? 0.7;

  const raw = (coinPoints + directionPoints + macroPoints + freshnessPoints) * sourceWeight;
  const score = Math.max(0, Math.min(100, Math.round(raw)));

  return { ...item, score, impact, mentionedCoins, reasons };
}

export interface SpaeherReport {
  items: ScoredNews[];
  topPick: ScoredNews | null;
  summary: string;
}

export function runSpaeher(items: NewsItem[], now: number = Date.now()): SpaeherReport {
  const scored = items.map((i) => scoreNewsItem(i, now)).sort((a, b) => b.score - a.score);
  const top = scored[0] ?? null;
  const bullishCount = scored.filter((s) => s.impact === 'bullish').length;
  const bearishCount = scored.filter((s) => s.impact === 'bearish').length;
  let summary: string;
  if (scored.length === 0) {
    summary = 'Späher findet aktuell keine News.';
  } else if (bullishCount > bearishCount * 1.5) {
    summary = `Späher sieht überwiegend bullische News (${bullishCount} bullisch vs ${bearishCount} bärisch).`;
  } else if (bearishCount > bullishCount * 1.5) {
    summary = `Späher sieht überwiegend bärische News (${bearishCount} bärisch vs ${bullishCount} bullisch).`;
  } else {
    summary = `Späher sieht gemischte Nachrichtenlage (${bullishCount} bullisch, ${bearishCount} bärisch, ${scored.length - bullishCount - bearishCount} neutral).`;
  }
  return { items: scored, topPick: top, summary };
}

// Trefferquote pro Markt-Typ aggregieren — heuristisch nach Schlüsselwörtern
// (Heimsieg, Auswärtssieg, Doppelchance, BTTS, Over/Under, exaktes Ergebnis).

import type { TipJournalEntry } from '@/lib/sport/tip-journal';

export type MarketCategory =
  | 'Heimsieg'
  | 'Auswärtssieg'
  | 'Remis'
  | 'Doppelchance'
  | 'Tor-Markt'
  | 'BTTS'
  | 'Exakter Score'
  | 'Sonstige';

export interface MarketStats {
  category: MarketCategory;
  resolved: number;
  wins: number;
  decisive: number;
  hitRatePct: number | null;
}

export function classifyMarket(market: string): MarketCategory {
  const m = market.toLowerCase();
  if (/\d+\s*:\s*\d+/.test(m) || m.startsWith('ergebnis ')) return 'Exakter Score';
  if (m.includes('over') || m.includes('under') || m.includes('über') || m.includes('unter')) return 'Tor-Markt';
  if (m.includes('btts') || m.includes('beide teams')) return 'BTTS';
  if (m.includes('1x') || m.includes('x2') || m.startsWith('12') || m.includes('doppelchance')) return 'Doppelchance';
  if (m.includes('unentschieden') || m === 'remis') return 'Remis';
  if (m.includes('auswärtssieg')) return 'Auswärtssieg';
  if (m.includes('heimsieg')) return 'Heimsieg';
  return 'Sonstige';
}

export function tipsByMarket(log: TipJournalEntry[]): MarketStats[] {
  const buckets = new Map<MarketCategory, { wins: number; resolved: number; decisive: number }>();
  for (const e of log) {
    if (e.outcome === 'pending') continue;
    const cat = classifyMarket(e.market);
    if (!buckets.has(cat)) buckets.set(cat, { wins: 0, resolved: 0, decisive: 0 });
    const b = buckets.get(cat)!;
    b.resolved += 1;
    if (e.outcome !== 'push') {
      b.decisive += 1;
      if (e.outcome === 'win') b.wins += 1;
    }
  }
  const out: MarketStats[] = [];
  for (const [category, b] of buckets) {
    out.push({
      category,
      resolved: b.resolved,
      wins: b.wins,
      decisive: b.decisive,
      hitRatePct: b.decisive > 0 ? Math.round((b.wins / b.decisive) * 100) : null
    });
  }
  return out.sort((a, b) => b.resolved - a.resolved);
}

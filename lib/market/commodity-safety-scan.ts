// Server-side scan: holt für jeden Rohstoff aus COMMODITY_UNIVERSE die
// Yahoo-History und berechnet das 8-Punkt-Sicherheits-Gate. Resultat 30 Min
// gecached, identisches Muster wie der Stock-Safety-Scan.

import { unstable_cache } from 'next/cache';
import { COMMODITY_UNIVERSE } from '@/lib/market/commodities';
import { fetchYahooQuote } from '@/lib/market/yahoo-quote';
import { fetchYahooHistory } from '@/lib/market/yahoo-history';
import { evaluateInstrumentSafety, type InstrumentSafetyAssessment } from '@/lib/market/instrument-safety';

export interface CommoditySafetyEntry {
  symbol: string;
  name: string;
  group: string;
  emoji?: string;
  price: number;
  assessment: InstrumentSafetyAssessment;
}

async function scanOne(symbol: string, name: string, group: string, emoji?: string): Promise<CommoditySafetyEntry | null> {
  const [quote, history] = await Promise.all([
    fetchYahooQuote(symbol, name),
    fetchYahooHistory(symbol)
  ]);
  if (!quote || !history) return null;
  const assessment = evaluateInstrumentSafety({ price: quote.last, candles: history.candles });
  return { symbol, name, group, emoji, price: quote.last, assessment };
}

async function compute(): Promise<CommoditySafetyEntry[]> {
  const results = await Promise.all(
    COMMODITY_UNIVERSE.map((c) => scanOne(c.symbol, c.name, c.group, c.emoji))
  );
  return results.filter((r): r is CommoditySafetyEntry => r !== null);
}

export const getCommoditySafetyScan = unstable_cache(compute, ['commodity-safety-scan-v1'], { revalidate: 1800 });

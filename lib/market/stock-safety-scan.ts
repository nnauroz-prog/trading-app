// Server-side scan: holt für jede Aktie aus STOCK_UNIVERSE die Yahoo-History
// und berechnet das 8-Punkt-Sicherheits-Gate. Das Ergebnis wird 30 Min lang
// gecached, damit die /aktien-Übersicht ohne große Latenz die Sicherheits-Grades
// pro Aktie zeigen kann.

import { unstable_cache } from 'next/cache';
import { STOCK_UNIVERSE } from '@/lib/market/stocks';
import { fetchYahooQuote } from '@/lib/market/yahoo-quote';
import { fetchYahooHistory } from '@/lib/market/yahoo-history';
import { evaluateInstrumentSafety, type InstrumentSafetyAssessment } from '@/lib/market/instrument-safety';

export interface StockSafetyEntry {
  symbol: string;
  name: string;
  group: string;
  price: number;
  assessment: InstrumentSafetyAssessment;
}

async function scanOne(symbol: string, name: string, group: string): Promise<StockSafetyEntry | null> {
  const [quote, history] = await Promise.all([
    fetchYahooQuote(symbol, name),
    fetchYahooHistory(symbol)
  ]);
  if (!quote || !history) return null;
  const assessment = evaluateInstrumentSafety({ price: quote.last, candles: history.candles });
  return { symbol, name, group, price: quote.last, assessment };
}

async function compute(): Promise<StockSafetyEntry[]> {
  const results = await Promise.all(
    STOCK_UNIVERSE.map((s) => scanOne(s.symbol, s.name, s.group))
  );
  return results.filter((r): r is StockSafetyEntry => r !== null);
}

// 30 Min Cache: lange genug für niedrige Latenz, kurz genug, dass die
// Grades nach Markt-Bewegung halbwegs aktuell bleiben.
export const getStockSafetyScan = unstable_cache(compute, ['stock-safety-scan-v1'], { revalidate: 1800 });

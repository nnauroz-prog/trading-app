// Aktien-Hauptseite. Live-Quotes via Yahoo Finance v8 Chart API,
// 5 Min Cache. Bei API-Ausfall ehrlicher Empty-State pro Zeile.

import Link from 'next/link';
import { QuoteRow } from '@/components/quote-row';
import { STOCK_INDEX_SYMBOLS, STOCK_UNIVERSE, type StockSymbol } from '@/lib/market/stocks';
import { fetchManyQuotes } from '@/lib/market/yahoo-quote';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

const GROUP_ORDER: StockSymbol['group'][] = [
  'US Tech', 'US Finanz', 'US Health', 'US Industrie', 'US Konsum', 'US Auto/EV', 'Deutschland'
];

export default async function AktienPage() {
  const [indices, stocks] = await Promise.all([
    fetchManyQuotes(STOCK_INDEX_SYMBOLS.map((i) => ({ symbol: i.symbol, name: i.name }))),
    fetchManyQuotes(STOCK_UNIVERSE.map((s) => ({ symbol: s.symbol, name: s.name })))
  ]);

  const stocksByGroup: Record<string, Array<{ stock: StockSymbol; quote: typeof stocks[number] }>> = {};
  STOCK_UNIVERSE.forEach((stock, i) => {
    if (!stocksByGroup[stock.group]) stocksByGroup[stock.group] = [];
    stocksByGroup[stock.group].push({ stock, quote: stocks[i] });
  });

  const liveCount = stocks.filter((q) => q !== null).length;
  const indexLiveCount = indices.filter((q) => q !== null).length;

  return (
    <main className="mx-auto max-w-5xl space-y-5 p-4 pb-20 md:p-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-emerald-300">
        ← zurück zur Übersicht
      </Link>

      <header className="space-y-1.5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-400">📈 Aktien</div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Aktien-Übersicht</h1>
        <p className="text-sm text-slate-400">
          Live-Quotes für Top-Indizes und 29 ausgewählte Mega-Caps + DAX-Top. Daten von Yahoo Finance, 5 Min Cache.
          {liveCount > 0 && <span> · <span className="text-emerald-300">{liveCount + indexLiveCount} Live-Quotes</span></span>}
        </p>
      </header>

      <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Top-Indizes</h2>
          <span className="text-[10px] text-slate-500">{indexLiveCount}/{STOCK_INDEX_SYMBOLS.length} live</span>
        </div>
        <ul className="space-y-1">
          {STOCK_INDEX_SYMBOLS.map((idx, i) => (
            <QuoteRow
              key={idx.symbol}
              quote={indices[i]}
              fallbackName={idx.name}
              fallbackSymbol={idx.symbol}
            />
          ))}
        </ul>
      </section>

      {GROUP_ORDER.map((group) => {
        const items = stocksByGroup[group];
        if (!items || items.length === 0) return null;
        const groupLive = items.filter((it) => it.quote !== null).length;
        return (
          <section key={group} className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">{group}</h2>
              <span className="text-[10px] text-slate-500">{groupLive}/{items.length} live</span>
            </div>
            <ul className="space-y-1">
              {items.map(({ stock, quote }) => (
                <QuoteRow
                  key={stock.symbol}
                  quote={quote}
                  fallbackName={stock.name}
                  fallbackSymbol={stock.symbol}
                />
              ))}
            </ul>
          </section>
        );
      })}

      <footer className="border-t border-slate-900 pt-4 text-[10px] leading-relaxed text-slate-600">
        Datenquelle: Yahoo Finance v8 Chart API · Cache: 5 Min · Anzeige im Browser-TZ.
        Quotes können bei API-Ausfall fehlen — werden dann pro Zeile als „gerade nicht verfügbar“ markiert,
        keine Schätzwerte. Keine Anlageberatung.
      </footer>
    </main>
  );
}

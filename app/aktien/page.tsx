// Aktien-Hauptseite. Live-Quotes via Yahoo Finance v8 Chart API,
// 5 Min Cache. Bei API-Ausfall ehrlicher Empty-State pro Zeile.

import Link from 'next/link';
import { QuoteRow } from '@/components/quote-row';
import { SectorHeatmap, aggregateBuckets } from '@/components/sector-heatmap';
import { STOCK_INDEX_SYMBOLS, STOCK_UNIVERSE, type StockSymbol } from '@/lib/market/stocks';
import { fetchManyQuotes } from '@/lib/market/yahoo-quote';
import { marketAverageChangePct, scoreUniverse } from '@/lib/market/stock-setup-score';
import { getStockSafetyScan } from '@/lib/market/stock-safety-scan';
import { SafeStockPicks } from '@/components/safe-stock-picks';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

const GROUP_ORDER: StockSymbol['group'][] = [
  'US Tech', 'US Finanz', 'US Health', 'US Industrie', 'US Konsum', 'US Auto/EV', 'Deutschland'
];

export default async function AktienPage() {
  const [indices, stocks, safetyScan] = await Promise.all([
    fetchManyQuotes(STOCK_INDEX_SYMBOLS.map((i) => ({ symbol: i.symbol, name: i.name }))),
    fetchManyQuotes(STOCK_UNIVERSE.map((s) => ({ symbol: s.symbol, name: s.name }))),
    getStockSafetyScan()
  ]);

  const stocksByGroup: Record<string, Array<{ stock: StockSymbol; quote: typeof stocks[number] }>> = {};
  STOCK_UNIVERSE.forEach((stock, i) => {
    if (!stocksByGroup[stock.group]) stocksByGroup[stock.group] = [];
    stocksByGroup[stock.group].push({ stock, quote: stocks[i] });
  });

  const liveCount = stocks.filter((q) => q !== null).length;
  const indexLiveCount = indices.filter((q) => q !== null).length;

  // Setup-Scoring: relative Stärke gegen Index-Schnitt + simple Filter.
  // Liefert die Top-Aktien des Tages für die Schnellansicht oben.
  const marketAvg = marketAverageChangePct(indices);
  const setups = scoreUniverse(stocks, marketAvg);
  const topSetups = setups.slice(0, 5);
  const strongCount = setups.filter((s) => s.tier === 'strong').length;

  // Tagesgewinner und -verlierer aus der Quote-Liste.
  const liveStocks = stocks
    .map((q, i) => ({ q, stock: STOCK_UNIVERSE[i] }))
    .filter((x): x is { q: NonNullable<typeof x.q>; stock: StockSymbol } => x.q !== null);
  // Nur echte Gewinner/Verlierer filtern — verhindert „+−0,14 %"-Doppel-
  // Vorzeichen wenn alle Aktien rot sind.
  const winners = [...liveStocks]
    .filter((x) => x.q.changePct > 0)
    .sort((a, b) => b.q.changePct - a.q.changePct)
    .slice(0, 3);
  const losers = [...liveStocks]
    .filter((x) => x.q.changePct < 0)
    .sort((a, b) => a.q.changePct - b.q.changePct)
    .slice(0, 3);

  // Sektor-Heatmap pro Branche.
  const sectorBuckets = aggregateBuckets(
    STOCK_UNIVERSE.map((s, i) => ({ group: s.group, quote: stocks[i] })),
    GROUP_ORDER
  );

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

      <SectorHeatmap buckets={sectorBuckets} title="Sektor-Heatmap (Aktien)" />

      <SafeStockPicks entries={safetyScan} />

      {topSetups.length > 0 && (
        <section className="space-y-2 rounded-2xl border border-emerald-400/30 bg-emerald-950/15 p-4">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">🎯 Top-Setups heute</h2>
            <span className="text-[10px] text-emerald-200/70">
              Markt-Schnitt: <span className="font-mono">{marketAvg >= 0 ? '+' : ''}{marketAvg.toFixed(2)} %</span>
              {strongCount > 0 && <> · <span className="text-emerald-200">{strongCount} stark</span></>}
            </span>
          </div>
          <p className="text-[10.5px] leading-snug text-emerald-100/70">
            6-Punkt-Konfluenz: positiver Tag, relative Stärke ggü. Markt, kein FOMO-Spike, kein fallendes Messer, Markt offen, valider Tickers-Header. Reine Tagesveränderungs-Heuristik — keine Mehr-Tages-Trend-Analyse.
          </p>
          <ul className="space-y-1">
            {topSetups.map((s) => {
              const tierTone = s.tier === 'strong' ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-100'
                : s.tier === 'standard' ? 'border-sky-400/40 bg-sky-500/10 text-sky-100'
                : 'border-slate-700 bg-slate-900/60 text-slate-400';
              return (
                <li key={s.symbol} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-md border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-[11.5px]">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-slate-100">{s.name}</span>
                    <span className="block text-[9.5px] text-slate-500">{s.symbol}</span>
                  </span>
                  <span className={`font-mono text-[10.5px] font-semibold ${s.changePct >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {s.changePct >= 0 ? '+' : ''}{s.changePct.toFixed(2)} %
                  </span>
                  <span className={`rounded border px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider ${tierTone}`}>
                    {s.passed}/{s.total} · {s.tier === 'strong' ? 'stark' : s.tier === 'standard' ? 'normal' : 'schwach'}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {liveStocks.length >= 6 && (winners.length > 0 || losers.length > 0) && (
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {winners.length > 0 ? (
            <div className="space-y-2 rounded-2xl border border-emerald-400/30 bg-slate-900/40 p-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Tagesgewinner</h2>
              <ul className="space-y-1">
                {winners.map((w) => (
                  <li key={w.stock.symbol} className="grid grid-cols-[1fr_auto] gap-2 rounded-md border border-slate-800 bg-slate-950/40 px-2.5 py-1.5 text-[11px]">
                    <span className="min-w-0 truncate text-slate-100">{w.stock.name}</span>
                    <span className="font-mono font-bold text-emerald-300">+{w.q.changePct.toFixed(2)} %</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tagesgewinner</h2>
              <p className="mt-2 text-[10.5px] leading-snug text-slate-500">Heute keine Aktie im Plus.</p>
            </div>
          )}
          {losers.length > 0 ? (
            <div className="space-y-2 rounded-2xl border border-rose-400/30 bg-slate-900/40 p-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-rose-300">Tagesverlierer</h2>
              <ul className="space-y-1">
                {losers.map((l) => (
                  <li key={l.stock.symbol} className="grid grid-cols-[1fr_auto] gap-2 rounded-md border border-slate-800 bg-slate-950/40 px-2.5 py-1.5 text-[11px]">
                    <span className="min-w-0 truncate text-slate-100">{l.stock.name}</span>
                    <span className="font-mono font-bold text-rose-300">{l.q.changePct.toFixed(2)} %</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tagesverlierer</h2>
              <p className="mt-2 text-[10.5px] leading-snug text-slate-500">Heute keine Aktie im Minus.</p>
            </div>
          )}
        </section>
      )}

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
                  href={`/aktien/${encodeURIComponent(stock.symbol)}`}
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

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AktienWatchlistToggle } from '@/components/aktien-watchlist-toggle';
import { STOCK_UNIVERSE } from '@/lib/market/stocks';
import { fetchYahooQuote, fmtCurrency, fmtChange } from '@/lib/market/yahoo-quote';
import { fetchYahooHistory, type PriceCandle } from '@/lib/market/yahoo-history';
import { performancePct } from '@/lib/market/indicators';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

interface PageProps {
  params: Promise<{ symbol: string }>;
}

const PERIODS = [
  { days: 21, label: '1 Monat' },
  { days: 63, label: '3 Monate' },
  { days: 252, label: '1 Jahr' }
];

export default async function AktienDetailPage({ params }: PageProps) {
  const { symbol: raw } = await params;
  const symbol = decodeURIComponent(raw).toUpperCase();
  const item = STOCK_UNIVERSE.find((entry) => entry.symbol.toUpperCase() === symbol);
  if (!item) notFound();
  const [quote, history] = await Promise.all([
    fetchYahooQuote(item.symbol, item.name),
    fetchYahooHistory(item.symbol)
  ]);
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 pb-20 md:p-6">
      <Link href="/aktien" className="text-sm text-slate-400 hover:text-cyan-200">
        ← Alle Aktien
      </Link>
      <header className="terminal-panel space-y-5 p-5 sm:p-7">
        <div>
          <p className="section-kicker">Aktie · {item.symbol}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{item.name}</h1>
        </div>
        {quote ? (
          <div>
            <p className="text-sm text-slate-400">Preis pro Aktie</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums text-white sm:text-4xl">
              {fmtCurrency(quote.last, quote.currency)}
            </p>
            <p className={`mt-3 text-sm ${quote.changePct >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
              {fmtChange(quote.changePct)} <span className="text-slate-400">{quote.source === 'stooq' ? 'seit Handelsstart' : 'zum letzten Börsenschluss'}</span>
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              {quote.source === 'stooq' ? 'Zuletzt abgefragt' : 'Kursstand'}: {formatDate(quote.ts, true)} Uhr · {quote.source === 'stooq' ? 'Stooq' : 'Yahoo Finance'}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-700/70 p-4">
            <p className="font-medium text-slate-200">Der aktuelle Preis ist gerade nicht verfügbar.</p>
            <p className="mt-1 text-sm text-slate-400">Versuche es später erneut.</p>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-4">
          <AktienWatchlistToggle symbol={item.symbol} name={item.name} currentPrice={quote?.last} />
          <Link href="/aktien/watchlist" className="text-sm text-slate-400 hover:text-cyan-200">Meine gespeicherten Aktien →</Link>
        </div>
      </header>
      {history && history.candles.length >= 2 ? (
        <section className="terminal-panel space-y-5 p-5 sm:p-7">
          <div>
            <h2 className="text-lg font-semibold text-white">So hat sich der Kurs entwickelt</h2>
            <p className="mt-1 text-sm text-slate-400">Die Linie zeigt die Preise am Ende der einzelnen Handelstage.</p>
          </div>
          <PriceChart candles={history.candles} currency={history.currency} />
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {PERIODS.map(({ days, label }) => {
              const change = performancePct(history.candles, days);
              return (
                <div key={label} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                  <p className="text-xs text-slate-400">{label}</p>
                  <p className={`mt-1 text-base font-semibold tabular-nums ${change === null ? 'text-slate-500' : change >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {change === null ? '—' : fmtChange(change)}
                  </p>
                </div>
              );
            })}
          </div>
          <p className="text-xs leading-relaxed text-slate-500">Die Veränderung bezieht sich auf die letzten verfügbaren Handelstage. Ein Strich bedeutet, dass der Zeitraum noch nicht vollständig vorliegt.</p>
        </section>
      ) : (
        <section className="terminal-panel p-5 text-sm leading-relaxed text-slate-400">
          Der Verlauf ist gerade nicht verfügbar. Sobald genügend Preise vorliegen, siehst du hier die Entwicklung.
        </section>
      )}
      <section className="terminal-panel p-5 sm:p-7">
        <h2 className="text-lg font-semibold text-white">Wie passt diese Aktie zu meinem Geld?</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">Mit einer Aktie besitzt du einen kleinen Anteil an einem Unternehmen. Dein Geldplan hilft dir zuerst festzulegen, wie viel du insgesamt anlegen kannst.</p>
        <Link href="/" className="terminal-button terminal-button-primary mt-4">Zu meiner Geldaufteilung →</Link>
      </section>
      <details className="text-sm text-slate-400">
        <summary className="cursor-pointer py-3">Woher kommen die Preise?</summary>
        <p className="pb-4 leading-relaxed">Die Kurse kommen von Yahoo Finance, ersatzweise von Stooq. Sie können verzögert sein. Der aktuelle Preis wird etwa alle fünf Minuten neu abgefragt, der Verlauf etwa stündlich. Angezeigt wird höchstens das letzte Jahr. Frühere Preissteigerungen sagen nicht voraus, wie sich der Preis weiterentwickelt.</p>
      </details>
    </main>
  );
}

function formatDate(time: number, withTime = false): string {
  return new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    day: '2-digit', month: '2-digit', year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {})
  }).format(time);
}

function PriceChart({ candles, currency }: { candles: PriceCandle[]; currency: string }) {
  const width = 480;
  const height = 160;
  const closes = candles.map((c) => c.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = Math.max(1e-6, max - min);
  const path = closes.map((value, i) => {
    const x = (i / (closes.length - 1)) * (width - 4) + 2;
    const y = height - 2 - ((value - min) / range) * (height - 4);
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
  return (
    <div className="space-y-3">
      <div className="flex justify-between gap-3 text-xs text-slate-400">
        <span>Niedrigster Wert: {fmtCurrency(min, currency)}</span>
        <span className="text-right">Höchster Wert: {fmtCurrency(max, currency)}</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="block w-full" role="img" aria-label={`Preisverlauf von ${formatDate(candles[0].time)} bis ${formatDate(candles[candles.length - 1].time)}`}>
        <path d={path} stroke={closes[closes.length - 1] >= closes[0] ? '#65e6ff' : '#fb7185'} strokeWidth={2} fill="none" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="flex justify-between text-xs text-slate-500">
        <span>{formatDate(candles[0].time)}</span>
        <span>{formatDate(candles[candles.length - 1].time)}</span>
      </div>
    </div>
  );
}

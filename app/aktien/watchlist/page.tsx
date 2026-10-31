import Link from 'next/link';
import { STOCK_UNIVERSE } from '@/lib/market/stocks';
import { fetchManyQuotes } from '@/lib/market/yahoo-quote';
import { AktienWatchlistPageClient } from '@/components/aktien-watchlist-page-client';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

export default async function AktienWatchlistPage() {
  const quotes = await fetchManyQuotes(STOCK_UNIVERSE.map(({ symbol, name }) => ({ symbol, name })));

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 pb-20 md:p-6">
      <Link href="/aktien" className="text-sm text-slate-400 hover:text-cyan-200">← Alle Aktien</Link>
      <header className="space-y-3">
        <p className="section-kicker">Meine Merkliste</p>
        <h1 className="text-3xl font-semibold tracking-tight text-white">Meine gespeicherten Aktien</h1>
        <p className="text-sm leading-relaxed text-slate-400">Deine gemerkten Unternehmen an einem Ort. Tippe auf eine Aktie, um ihren Kursverlauf anzusehen.</p>
      </header>
      <AktienWatchlistPageClient quotes={quotes} />
      <p className="text-xs leading-relaxed text-slate-500">Deine Liste ist in diesem Browser gespeichert. Preise kommen von Yahoo Finance oder Stooq und können verzögert sein.</p>
    </main>
  );
}

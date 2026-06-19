import type { Metadata } from 'next';
import Link from 'next/link';
import { OptionsscheineAnalyzer } from '@/components/optionsscheine-analyzer';
import { OptionsscheineWatchlistList } from '@/components/optionsscheine-watchlist-list';

export const metadata: Metadata = {
  title: 'Optionsscheine · Risiko, Hebel, Szenarien',
  description: 'Risiko-Analyse, Hebel-Schaetzung, Szenarien und Backtest fuer Optionsscheine und Knock-Outs auf Krypto und Aktien.'
};

interface PageProps {
  searchParams: Promise<{
    asset?: string;
    price?: string;
    klasse?: string;
    strike?: string;
    expiry?: string;
    direction?: string;
    sigma?: string;
  }>;
}

export default async function OptionsscheinePage({ searchParams }: PageProps) {
  const { asset, price, klasse, strike, expiry, direction, sigma } = await searchParams;
  const initialDirection: 'call' | 'put' = direction === 'put' ? 'put' : 'call';
  const sigmaPct = sigma ? Math.round(parseFloat(sigma) * 100) : null;
  const klasseBadge = klasse === 'krypto' ? 'Krypto' : klasse === 'aktie' ? 'Aktie' : null;

  return (
    <main className="mx-auto max-w-4xl space-y-5 p-4 pb-20 md:p-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-emerald-300">
        ← zurueck zur Uebersicht
      </Link>

      <header className="space-y-1">
        <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-400">Derivate · Krypto &amp; Aktien</div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Optionsscheine &amp; Knock-Outs</h1>
        <p className="max-w-2xl text-[12px] leading-snug text-slate-400">
          Eingabe-basiertes Analyse-Tool fuer Hebelprodukte auf Krypto und Aktien: Strike, Verfall, Basiswert — und die App berechnet Moneyness, Delta-Schaetzung, Theta-Druck, Hebel und Break-even. Markt-Premium und Bezugsverhaeltnis sind optional und schaerfen die Hebel-Anzeige. Keine Kauf-Empfehlung, kein Anlageratschlag.
        </p>
        {asset && (
          <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-emerald-400/40 bg-emerald-500/10 px-2 py-1 text-[10.5px] text-emerald-100">
            <span className="font-semibold">Vorgefuellt:</span>
            <span className="font-mono">{asset}</span>
            {klasseBadge && <span className="rounded border border-emerald-400/30 px-1.5 py-0.5 text-[9px] uppercase tracking-wider">{klasseBadge}</span>}
            {price && <span className="font-mono text-emerald-200/80">@ {price}</span>}
            {strike && <span className="font-mono text-emerald-200/80">· Strike {strike}</span>}
            {expiry && <span className="font-mono text-emerald-200/80">· Verfall {expiry}</span>}
            {direction && <span className="rounded border border-emerald-400/30 px-1.5 py-0.5 text-[9px] uppercase tracking-wider">{initialDirection}</span>}
            {sigmaPct !== null && <span className="font-mono text-emerald-200/80">· σ {sigmaPct} %</span>}
          </div>
        )}
      </header>

      <section className="rounded-xl border border-amber-500/30 bg-amber-950/15 p-3 text-[11px] leading-snug text-amber-100/85">
        <span className="font-semibold text-amber-300">Wichtig:</span> Optionsscheine koennen ihren gesamten Wert verlieren. Knock-Out-Zertifikate verlieren bei Erreichen der Knock-Out-Schwelle sofort den vollen Einsatz, auch unter Tag. Diese Seite ersetzt keine Wertpapier-Beratung. Krypto-Hebelprodukte sind in Deutschland besonders restriktiv reguliert.
      </section>

      <OptionsscheineAnalyzer
        defaultUnderlyingName={asset ?? ''}
        defaultUnderlyingPrice={price ?? ''}
        defaultStrike={strike ?? ''}
        defaultExpiryIso={expiry ?? ''}
        defaultDirection={initialDirection}
        defaultSigma={sigma ?? ''}
      />
      <OptionsscheineWatchlistList />
    </main>
  );
}

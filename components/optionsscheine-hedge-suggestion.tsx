// Schutz-Put-Vorschlag als kompakte Karte unter den offensiven
// Call-Vorschlaegen. Antwort auf "wenn ich KAUFE, wie schuetze ich
// mich gegen einen Crash?"

import Link from 'next/link';
import { suggestHedge } from '@/lib/optionsscheine/suggest-hedge';

interface Props {
  underlyingName: string;
  underlyingPrice: number;
  assetClass: 'aktie' | 'krypto';
  sigma?: number;
}

function fmtPrice(n: number, assetClass: 'aktie' | 'krypto'): string {
  if (assetClass === 'krypto') {
    if (n >= 1000) return n.toFixed(0);
    return n.toFixed(2);
  }
  return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export function OptionsscheineHedgeSuggestion({ underlyingName, underlyingPrice, assetClass, sigma }: Props) {
  const hedge = suggestHedge({ underlyingName, underlyingPrice, assetClass, sigma });
  if (!hedge) return null;

  const currency = assetClass === 'krypto' ? 'USD' : 'EUR';
  const costTone = hedge.costPctOfPosition < 5
    ? 'text-emerald-300'
    : hedge.costPctOfPosition < 12
      ? 'text-amber-300'
      : 'text-rose-300';

  const params = new URLSearchParams();
  params.set('asset', underlyingName);
  params.set('price', fmtPrice(underlyingPrice, assetClass));
  params.set('strike', String(hedge.strike));
  params.set('expiry', hedge.expiryIso);
  params.set('direction', 'put');
  params.set('klasse', assetClass);
  if (sigma) params.set('sigma', sigma.toFixed(3));
  const href = `/optionsscheine?${params.toString()}`;

  return (
    <section className="space-y-2 rounded-2xl border border-sky-400/40 bg-sky-950/15 p-4">
      <header className="space-y-1">
        <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-sky-300">
          Hedge-Vorschlag (Put auf {underlyingName})
        </div>
        <h3 className="text-[13.5px] font-bold tracking-tight text-white">
          Versicherung gegen einen Crash deiner Long-Position
        </h3>
        <p className="text-[10.5px] leading-snug text-slate-400">
          Falls du die Aktie kaufst und Schutz gegen ein groesseres Minus willst: ein OTM-Put deckt Verluste ab {Math.abs(hedge.protectionStartPct).toFixed(0)} % Underlying-Bewegung. Kosten = Versicherungspraemie, verfaellt wertlos wenn die Aktie ueber dem Strike bleibt — das ist der gewuenschte Normalfall.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        <HedgeStat label="Put-Strike" value={fmtPrice(hedge.strike, assetClass)} emphasis />
        <HedgeStat label="Verfall" value={fmtDate(hedge.expiryIso)} emphasis />
        <HedgeStat label="Laufzeit" value={`${hedge.monthsToExpiry} Mon.`} />
        <HedgeStat label="Schutz ab" value={`${hedge.protectionStartPct.toFixed(0)} %`} />
        <HedgeStat label="Praemie / Schein" value={`${fmtPrice(hedge.premiumPerScheinepreis, assetClass)} ${currency}`} />
        <HedgeStat label="Hedge-Kosten" value={`${fmtPrice(hedge.premiumPerAktienAequivalent, assetClass)} ${currency}`} />
        <HedgeStat
          label="% der Position"
          value={`${hedge.costPctOfPosition.toFixed(1)} %`}
          toneClass={costTone}
        />
        <HedgeStat label="Ratio" value={`${hedge.analysis.ratio}:1`} />
      </div>

      <p className="text-[10px] leading-snug text-slate-400">{hedge.rationale}</p>

      <div className="grid grid-cols-1 gap-1.5 rounded-md border border-sky-400/20 bg-slate-950/40 p-2 text-[10px] leading-snug text-sky-100/90 sm:grid-cols-2">
        <div>
          <span className="font-semibold text-sky-200">Wann hilft die Versicherung?</span><br />
          Aktie faellt unter <span className="font-mono">{fmtPrice(hedge.strike, assetClass)} {currency}</span> — pro Aktien-Aequivalent gewinnt der Put 1:1 mit dem weiteren Fall.
        </div>
        <div>
          <span className="font-semibold text-sky-200">Was kostet sie?</span><br />
          <span className="font-mono">{fmtPrice(hedge.premiumPerAktienAequivalent, assetClass)} {currency}</span> pro Aktien-Aequivalent. Versicherung verfaellt wertlos, wenn die Aktie ueber dem Strike bleibt.
        </div>
      </div>

      <Link
        href={href}
        className="inline-flex items-center gap-1 rounded-md border border-sky-400/40 bg-sky-500/15 px-3 py-1.5 text-[11px] font-semibold text-sky-100 transition hover:border-sky-300 hover:bg-sky-500/25"
      >
        Hedge im Analyzer oeffnen →
      </Link>

      <div className="border-t border-slate-800 pt-2 text-[9.5px] leading-snug text-slate-500">
        Standard-Konfiguration: 10 % Schutz, 6 Monate Laufzeit. Im Analyzer kannst du Strike und Verfall anpassen. Bezugsverhaeltnis {assetClass === 'krypto' ? '100' : '10'}:1 — bei einer Aktie musst du also {assetClass === 'krypto' ? '100' : '10'} Scheine kaufen, um ein voll-versichertes Aktien-Aequivalent zu haben.
      </div>
    </section>
  );
}

function HedgeStat({ label, value, emphasis, toneClass }: { label: string; value: string; emphasis?: boolean; toneClass?: string }) {
  return (
    <div className="rounded border border-slate-800 bg-slate-950/60 px-2 py-1">
      <div className="text-[8.5px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`mt-0.5 font-mono ${emphasis ? 'text-[12px] font-bold text-sky-200' : `text-[11px] ${toneClass ?? 'text-slate-100'}`}`}>
        {value}
      </div>
    </div>
  );
}

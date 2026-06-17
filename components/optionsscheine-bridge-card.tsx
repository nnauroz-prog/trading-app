// Kleine Brueckenkarte in den Aktien- und Krypto-Detail-Seiten:
// nimmt den aktuellen Basiswert + Preis und verlinkt mit vorgefuelltem
// Analyzer in /optionsscheine. Bewusst zurueckhaltend — Optionsscheine
// sind Hebelprodukte, dieser Hinweis ist kein Kauf-Trigger.

import Link from 'next/link';

interface Props {
  underlyingName: string;
  underlyingPrice: number | null;
  assetClass: 'krypto' | 'aktie';
}

function fmtPrice(price: number, assetClass: 'krypto' | 'aktie'): string {
  if (assetClass === 'krypto') {
    if (price >= 1000) return price.toFixed(0);
    if (price >= 1) return price.toFixed(2);
    return price.toFixed(4);
  }
  return price.toFixed(2);
}

export function OptionsscheineBridgeCard({ underlyingName, underlyingPrice, assetClass }: Props) {
  const params = new URLSearchParams();
  params.set('asset', underlyingName);
  if (underlyingPrice !== null && Number.isFinite(underlyingPrice)) {
    params.set('price', fmtPrice(underlyingPrice, assetClass));
  }
  params.set('klasse', assetClass);

  return (
    <Link
      href={`/optionsscheine?${params.toString()}`}
      className="block rounded-2xl border border-emerald-400/30 bg-emerald-950/15 p-3 transition hover:border-emerald-400/60 hover:bg-emerald-950/25"
      aria-label={`Optionsschein auf ${underlyingName} analysieren`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="space-y-0.5">
          <div className="text-[9.5px] font-semibold uppercase tracking-[0.25em] text-emerald-300">Hebelprodukte</div>
          <div className="text-[12px] font-semibold text-emerald-100">
            Optionsschein auf <span className="font-bold">{underlyingName}</span> analysieren →
          </div>
          <p className="text-[10.5px] leading-snug text-emerald-100/70">
            Strike + Verfall eintragen, Moneyness · Delta · Hebel · Break-even-Szenarien sehen. Basiswert ist vorausgefuellt.
          </p>
        </div>
        <span className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-200">
          → Analyzer
        </span>
      </div>
    </Link>
  );
}

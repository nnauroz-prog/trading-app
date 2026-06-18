// Knock-Out-Vorschlaege als Ergaenzung zu klassischen Optionsscheinen.
// Zeigt drei Stufen mit konkreten KO-Schwellen — bewusst getrennt von
// der Optionsschein-Sektion, weil Knock-Outs ein fundamental anderes
// Risiko-Profil haben (Totalverlust bei KO-Beruehrung, dafuer kaum
// Zeitwert-Verlust).

import Link from 'next/link';
import { suggestKnockOuts } from '@/lib/optionsscheine/suggest-knockout';

interface Props {
  underlyingName: string;
  underlyingPrice: number;
  direction?: 'call' | 'put';
  assetClass: 'aktie' | 'krypto';
  sigma?: number;
}

const RISK_TONE = {
  niedrig: {
    border: 'border-emerald-400/40',
    bg: 'bg-emerald-950/15',
    chip: 'border-emerald-400/50 bg-emerald-500/15 text-emerald-100',
    label: 'Niedrig',
    sub: '20 % Puffer · ~5× Hebel'
  },
  mittel: {
    border: 'border-amber-400/40',
    bg: 'bg-amber-950/15',
    chip: 'border-amber-400/50 bg-amber-500/15 text-amber-100',
    label: 'Mittel',
    sub: '10 % Puffer · ~10× Hebel'
  },
  hoch: {
    border: 'border-rose-400/50',
    bg: 'bg-rose-950/20',
    chip: 'border-rose-400/60 bg-rose-500/15 text-rose-100',
    label: 'Hoch',
    sub: '5 % Puffer · ~20× Hebel'
  }
} as const;

function fmtPrice(n: number, assetClass: 'aktie' | 'krypto'): string {
  if (assetClass === 'krypto') {
    if (n >= 1000) return n.toFixed(0);
    if (n >= 1) return n.toFixed(2);
    return n.toFixed(4);
  }
  return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function OptionsscheineKnockOutSuggestions({ underlyingName, underlyingPrice, direction = 'call', assetClass, sigma }: Props) {
  const suggestions = suggestKnockOuts({ underlyingName, underlyingPrice, direction, assetClass, sigma });
  if (suggestions.length === 0) return null;

  const directionLabel = direction === 'call' ? 'Long' : 'Short';
  const dirRail = direction === 'call' ? 'unter' : 'ueber';

  return (
    <section className="space-y-3 rounded-2xl border border-rose-400/30 bg-slate-900/40 p-4">
      <header className="space-y-1">
        <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-rose-300">
          Knock-Outs ({directionLabel} auf {underlyingName})
        </div>
        <h3 className="text-[13.5px] font-bold tracking-tight text-white">
          Alternative: konstanter Hebel mit harter Knock-Out-Schwelle
        </h3>
        <p className="text-[10.5px] leading-snug text-slate-400">
          Knock-Outs verhalten sich anders als klassische Optionsscheine: <span className="font-semibold text-rose-200">kaum Zeitwert-Verlust</span>, dafuer <span className="font-semibold text-rose-200">sofortiger Totalverlust</span>, sobald der Basiswert die KO-Schwelle ({dirRail} dem Kurs) erreicht — auch unter Tag. Stop-Loss VOR der KO-Schwelle ist Pflicht.
        </p>
      </header>

      <div className="grid gap-2 md:grid-cols-3">
        {suggestions.map((s) => {
          const tone = RISK_TONE[s.risk];
          const params = new URLSearchParams();
          params.set('asset', underlyingName);
          params.set('price', fmtPrice(underlyingPrice, assetClass));
          params.set('strike', String(s.strike));
          params.set('direction', s.direction);
          params.set('klasse', assetClass);
          if (sigma) params.set('sigma', sigma.toFixed(3));
          const href = `/optionsscheine?${params.toString()}`;
          return (
            <div key={s.risk} className={`flex flex-col gap-2 rounded-xl border-2 ${tone.border} ${tone.bg} p-3`}>
              <div className="flex items-baseline justify-between gap-2">
                <span className={`rounded-md border px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider ${tone.chip}`}>
                  {tone.label}
                </span>
                <span className="text-[9px] uppercase tracking-wider text-slate-400">{tone.sub}</span>
              </div>

              <dl className="grid grid-cols-2 gap-1.5 text-[10.5px]">
                <KoStat label="KO-Schwelle" value={fmtPrice(s.knockOutLevel, assetClass)} emphasis />
                <KoStat label="Puffer" value={`${s.bufferPct.toFixed(0)} %`} emphasis />
                <KoStat label="Hebel ~" value={`${s.estimatedLeverage.toFixed(1)}×`} />
                <KoStat label="Richtung" value={s.direction === 'call' ? 'Long' : 'Short'} />
              </dl>

              <p className="text-[10px] leading-snug text-slate-400">{s.rationale}</p>

              <Link
                href={href}
                className="mt-auto inline-flex items-center justify-center gap-1 rounded-md border border-rose-400/40 bg-rose-500/15 px-2 py-1.5 text-[11px] font-semibold text-rose-100 transition hover:border-rose-300 hover:bg-rose-500/25"
              >
                im Analyzer oeffnen →
              </Link>
            </div>
          );
        })}
      </div>

      <div className="rounded-md border border-rose-500/30 bg-rose-950/20 p-2.5 text-[10.5px] leading-snug text-rose-100/90">
        <span className="font-bold text-rose-200">Knock-Out-Regel:</span> wenn der Basiswert die KO-Schwelle nur EINMAL beruehrt, ist der Schein <span className="font-bold">sofort wertlos</span>. Auch Over-Night-Gaps oder Flash-Crashs koennen Stop-Loss-Orders ueberspringen. Knock-Outs nur fuer aktiv betreute Trades, nie als Buy-and-Hold.
      </div>
    </section>
  );
}

function KoStat({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="rounded border border-slate-800 bg-slate-950/60 px-2 py-1">
      <div className="text-[8.5px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`mt-0.5 font-mono ${emphasis ? 'text-[12px] font-bold text-rose-200' : 'text-[11px] text-slate-100'}`}>
        {value}
      </div>
    </div>
  );
}

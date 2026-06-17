// Tiefe Analyse-Sektion unterhalb der drei Optionsschein-Vorschlaege:
//   1. Vergleichstabelle Aktie vs. 3 Scheine bei Underlying-Bewegungen
//   2. Time-Decay-Simulation pro Stufe (was, wenn nichts passiert?)
//   3. Position-Sizer pro Stufe (bei 100 / 300 / 1000 EUR Einsatz)
//
// Bewusst expandierbar — wer schnell entscheiden will, sieht oben die
// drei Karten. Wer wirklich verstehen will, klappt das hier auf.

import { buildPayoffCompare } from '@/lib/optionsscheine/payoff-compare';
import { buildTimeDecay } from '@/lib/optionsscheine/time-decay';
import { buildPositionPlans } from '@/lib/optionsscheine/position-sizer';
import type { OptionsscheinSuggestion } from '@/lib/optionsscheine/suggest';

interface Props {
  underlyingName: string;
  underlyingPrice: number;
  suggestions: OptionsscheinSuggestion[];
  assetClass: 'aktie' | 'krypto';
  currency?: string;
}

const RISK_LABEL: Record<string, string> = {
  niedrig: 'Niedrig',
  mittel: 'Mittel',
  hoch: 'Hoch'
};

const RISK_HEADER_TONE: Record<string, string> = {
  niedrig: 'text-emerald-300',
  mittel: 'text-amber-300',
  hoch: 'text-rose-300'
};

function fmtSignedPct(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)} %`;
}

function fmtMoney(n: number, currency = 'EUR'): string {
  return `${n.toFixed(2)} ${currency}`;
}

function toneFor(n: number): string {
  if (n > 25) return 'text-emerald-300 font-bold';
  if (n > 0) return 'text-emerald-300';
  if (n < -25) return 'text-rose-300 font-bold';
  if (n < 0) return 'text-rose-300';
  return 'text-slate-400';
}

export function OptionsscheineDeepAnalysis({ underlyingPrice, suggestions, assetClass, currency = assetClass === 'krypto' ? 'USD' : 'EUR' }: Props) {
  if (suggestions.length === 0) return null;

  const payoffRows = buildPayoffCompare({ underlyingPrice, suggestions });
  const orderedRisks: Array<'niedrig' | 'mittel' | 'hoch'> = ['niedrig', 'mittel', 'hoch'];

  return (
    <details className="rounded-2xl border border-slate-800/80 bg-slate-900/30 p-4">
      <summary className="cursor-pointer list-none">
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-sky-300">Tiefe Analyse</div>
            <div className="text-[12.5px] font-semibold text-slate-100">
              Vergleich, Time-Decay und Positionsgroesse fuer die drei Setups ▸
            </div>
          </div>
          <span className="rounded-md border border-slate-700 px-2 py-0.5 text-[10px] text-slate-400">aufklappen</span>
        </div>
      </summary>

      <div className="mt-4 space-y-5">
        {/* 1. Vergleich Aktie vs. 3 Scheine */}
        <section className="space-y-1.5">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">
              Vergleich · Aktie vs. die drei Scheine
            </div>
            <p className="text-[10px] leading-snug text-slate-500">
              Wenn der Basiswert sich in den naechsten Wochen um X % bewegt — was passiert prozentual mit Aktie und Schein? <span className="text-amber-200">Der Hebel laeuft in BEIDE Richtungen.</span>
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead className="text-[9.5px] uppercase tracking-wider text-slate-500">
                <tr className="border-b border-slate-800">
                  <th className="px-2 py-1 text-left">Basiswert</th>
                  <th className="px-2 py-1 text-right">Aktie</th>
                  {orderedRisks.map((r) => (
                    <th key={r} className={`px-2 py-1 text-right ${RISK_HEADER_TONE[r]}`}>{RISK_LABEL[r]}-Schein</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payoffRows.map((row) => (
                  <tr key={row.underlyingDeltaPct} className={`border-b border-slate-800/60 ${row.underlyingDeltaPct === 0 ? 'bg-slate-950/40' : ''}`}>
                    <td className="px-2 py-1 font-mono text-slate-400">{row.underlyingDeltaPct === 0 ? 'heute' : fmtSignedPct(row.underlyingDeltaPct)}</td>
                    <td className={`px-2 py-1 text-right font-mono ${toneFor(row.aktiePct)}`}>{fmtSignedPct(row.aktiePct)}</td>
                    {orderedRisks.map((r) => (
                      <td key={r} className={`px-2 py-1 text-right font-mono ${toneFor(row.schein[r] ?? 0)}`}>
                        {fmtSignedPct(row.schein[r] ?? 0)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 2. Time-Decay pro Stufe */}
        <section className="space-y-1.5">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">
              Time-Decay · Was passiert, wenn der Basiswert STILL bleibt?
            </div>
            <p className="text-[10px] leading-snug text-slate-500">
              Der Basiswert bewegt sich nicht — was machen die Scheine? Theta frisst den Zeitwert. Je kuerzer die Laufzeit, desto haerter ist der Verlust.
            </p>
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            {suggestions.map((s) => {
              const rows = buildTimeDecay(s);
              return (
                <div key={s.risk} className="space-y-1 rounded-lg border border-slate-800 bg-slate-950/40 p-2.5">
                  <div className={`text-[10px] font-bold uppercase tracking-wider ${RISK_HEADER_TONE[s.risk]}`}>
                    {RISK_LABEL[s.risk]}-Schein
                  </div>
                  <table className="w-full text-[10px]">
                    <thead className="text-[9px] uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="py-0.5 text-left">in Tagen</th>
                        <th className="py-0.5 text-right">Premium</th>
                        <th className="py-0.5 text-right">Veraenderung</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.days} className={`${r.days === 0 ? 'text-slate-300' : ''}`}>
                          <td className="py-0.5 font-mono">{r.days === 0 ? 'heute' : `+${r.days}d`}</td>
                          <td className="py-0.5 text-right font-mono">{fmtMoney(r.premium, currency)}</td>
                          <td className={`py-0.5 text-right font-mono ${toneFor(r.premiumDeltaPct)}`}>{fmtSignedPct(r.premiumDeltaPct)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
          <p className="text-[9.5px] text-slate-500">
            Annahme: Basiswert bleibt bei <span className="font-mono text-slate-300">{underlyingPrice.toFixed(2)} {currency}</span>, implizite Vola konstant 30 %.
          </p>
        </section>

        {/* 3. Position-Sizer pro Stufe */}
        <section className="space-y-1.5">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">
              Positionsgroesse · Bei 100 / 300 / 1000 {currency} Einsatz
            </div>
            <p className="text-[10px] leading-snug text-slate-500">
              Wieviele Scheine passen rein, was ist der maximale Verlust (= komplettes Investment), was waere der Gewinn bei +10 / +20 % Basiswert.
            </p>
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            {suggestions.map((s) => {
              const plans = buildPositionPlans(s);
              return (
                <div key={s.risk} className="space-y-1 rounded-lg border border-slate-800 bg-slate-950/40 p-2.5">
                  <div className={`text-[10px] font-bold uppercase tracking-wider ${RISK_HEADER_TONE[s.risk]}`}>
                    {RISK_LABEL[s.risk]}-Schein
                  </div>
                  <table className="w-full text-[10px]">
                    <thead className="text-[9px] uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="py-0.5 text-left">Budget</th>
                        <th className="py-0.5 text-right">Stueck</th>
                        <th className="py-0.5 text-right">+10 %</th>
                        <th className="py-0.5 text-right">+20 %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plans.map((p) => (
                        <tr key={p.budget}>
                          <td className="py-0.5 font-mono text-slate-300">{p.budget} {currency}</td>
                          <td className="py-0.5 text-right font-mono text-slate-200">{p.count}</td>
                          <td className="py-0.5 text-right font-mono text-emerald-300">+{fmtMoney(p.upsideAt10, currency)}</td>
                          <td className="py-0.5 text-right font-mono text-emerald-300">+{fmtMoney(p.upsideAt20, currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="text-[9px] text-rose-300">Max. Verlust pro Budget-Stufe = das volle Budget.</div>
                </div>
              );
            })}
          </div>
        </section>

        <p className="text-[9.5px] leading-snug text-slate-500 border-t border-slate-800 pt-3">
          Alle Werte sind Modell-Schaetzungen mit Standard-Vola 30 %. Echter Schein-Hebel und Premium beim Emittenten weichen je nach Spread, IV-Schwankung und Marktphase ab. Diese Analyse ersetzt keine Wertpapier-Beratung.
        </p>
      </div>
    </details>
  );
}

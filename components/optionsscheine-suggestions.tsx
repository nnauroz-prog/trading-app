// Drei konkrete Optionsschein-Vorschlaege fuer einen Basiswert — wird
// auf den Aktien- und Krypto-Detail-Seiten gezeigt, wenn die App den
// Basiswert zum Kauf empfiehlt. Niedrig / mittel / hoch Risiko, jedes
// mit Strike, Verfall, Approx-Hebel und Klick-zum-Analyzer mit
// vorgefuelltem Strike + Verfall.

import Link from 'next/link';
import { suggestOptionsscheine } from '@/lib/optionsscheine/suggest';

interface Props {
  underlyingName: string;
  underlyingPrice: number;
  direction?: 'call' | 'put';   // Default: 'call' (App hat zum KAUFEN empfohlen)
  assetClass: 'aktie' | 'krypto';
}

const RISK_TONE = {
  niedrig: {
    border: 'border-emerald-400/50',
    bg: 'bg-emerald-950/15',
    chip: 'border-emerald-400/60 bg-emerald-500/20 text-emerald-100',
    label: 'Niedriges Risiko',
    sub: 'tief im Geld · 18 Monate'
  },
  mittel: {
    border: 'border-amber-400/40',
    bg: 'bg-amber-950/15',
    chip: 'border-amber-400/60 bg-amber-500/20 text-amber-100',
    label: 'Mittleres Risiko',
    sub: 'am Geld · 9 Monate'
  },
  hoch: {
    border: 'border-rose-400/40',
    bg: 'bg-rose-950/15',
    chip: 'border-rose-400/60 bg-rose-500/20 text-rose-100',
    label: 'Hohes Risiko',
    sub: 'aus dem Geld · 3 Monate'
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

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function fmtPct(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)} %`;
}

export function OptionsscheineSuggestions({ underlyingName, underlyingPrice, direction = 'call', assetClass }: Props) {
  const suggestions = suggestOptionsscheine({ underlyingName, underlyingPrice, direction, assetClass });
  if (suggestions.length === 0) return null;

  const directionLabel = direction === 'call' ? 'Call' : 'Put';

  return (
    <section className="space-y-3 rounded-2xl border-2 border-emerald-400/40 bg-slate-900/60 p-4">
      <header className="space-y-1">
        <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-300">
          Optionsschein-Vorschlaege ({directionLabel} auf {underlyingName})
        </div>
        <h3 className="text-[13.5px] font-bold tracking-tight text-white">
          Drei konkrete Setups — niedrig / mittel / hoch Risiko
        </h3>
        <p className="text-[10.5px] leading-snug text-slate-400">
          App hat <span className="font-semibold text-emerald-200">{underlyingName}</span> zum Kauf qualifiziert. Wer statt der Aktie selbst mit Hebel arbeiten will, findet hier drei vorgerechnete Setups mit Strike und Verfall. Bei deinem Broker (Trade Republic, Scalable, …) den WKN mit diesen Parametern suchen — den exakten Schein listet die App nicht, weil keine Live-Daten der Emittenten verfuegbar sind.
        </p>
      </header>

      <div className="grid gap-2 md:grid-cols-3">
        {suggestions.map((s) => {
          const tone = RISK_TONE[s.risk];
          const params = new URLSearchParams();
          params.set('asset', underlyingName);
          params.set('price', fmtPrice(underlyingPrice, assetClass));
          params.set('strike', String(s.strike));
          params.set('expiry', s.expiryIso);
          params.set('direction', s.direction);
          params.set('klasse', assetClass);
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
                <SuggestStat label="Strike" value={fmtPrice(s.strike, assetClass)} emphasis />
                <SuggestStat label="Verfall" value={fmtDate(s.expiryIso)} emphasis />
                <SuggestStat label="Moneyness" value={s.moneynessLabel} />
                <SuggestStat label="Laufzeit" value={`${s.monthsToExpiry} Mon.`} />
                <SuggestStat
                  label="Hebel ~"
                  value={s.analysis.estimatedLeverage !== null ? `${s.analysis.estimatedLeverage.toFixed(1)}×` : '—'}
                />
                <SuggestStat label="Delta ~" value={s.analysis.estimatedDelta?.toFixed(2) ?? '—'} />
                <SuggestStat label="Break-even" value={s.analysis.approxBreakeven !== null ? fmtPrice(s.analysis.approxBreakeven, assetClass) : '—'} />
                <SuggestStat label="BE-Move" value={fmtPct(s.analysis.breakevenMovePct)} />
              </dl>

              <p className="text-[10px] leading-snug text-slate-400">{s.rationale}</p>

              {s.analysis.warnings.length > 0 && (
                <ul className="space-y-0.5 rounded border border-amber-500/30 bg-amber-950/20 p-1.5 text-[9.5px] leading-snug text-amber-100/90">
                  {s.analysis.warnings.slice(0, 2).map((w, i) => <li key={i}>· {w}</li>)}
                </ul>
              )}

              <Link
                href={href}
                className="mt-auto inline-flex items-center justify-center gap-1 rounded-md border border-emerald-400/40 bg-emerald-500/15 px-2 py-1.5 text-[11px] font-semibold text-emerald-100 transition hover:border-emerald-300 hover:bg-emerald-500/25"
              >
                im Analyzer oeffnen →
              </Link>
            </div>
          );
        })}
      </div>

      <p className="text-[9.5px] leading-snug text-slate-500">
        Modell-Schaetzung mit Standard-Vola 30 %, Bezugsverhaeltnis {assetClass === 'krypto' ? '100' : '10'}:1. Echter Schein-Hebel beim Emittenten kann abweichen. Optionsscheine koennen total verlieren — Position max. 1-3 % des Kapitals.
      </p>
    </section>
  );
}

function SuggestStat({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="rounded border border-slate-800 bg-slate-950/60 px-2 py-1">
      <div className="text-[8.5px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`mt-0.5 font-mono ${emphasis ? 'text-[12px] font-bold text-emerald-200' : 'text-[11px] text-slate-100'}`}>
        {value}
      </div>
    </div>
  );
}

import Link from 'next/link';
import type { CryptoPrecisionResult } from '@/lib/analysis/crypto-precision-gate';
import type { RankedCandidate, TradeMode } from '@/lib/analysis/master-signal-engine';

interface Props {
  picks: CryptoPrecisionResult[];
  candidates: RankedCandidate[];
  generatedAt: string;
  mode: TradeMode;
  now?: number;
}

const price = (value: number) => `${value.toLocaleString('de-DE', { maximumSignificantDigits: 7 })} USDT`;

export function CryptoBuySignals({ picks, candidates, generatedAt, mode, now = Date.now() }: Props) {
  const age = now - Date.parse(generatedAt);
  const fresh = Number.isFinite(age) && age >= 0 && age <= 5 * 60_000;
  const byCoin = new Map(candidates.map(c => [c.coinId, c]));
  const seen = new Set<string>();
  const signals = fresh ? [...picks]
    .filter(p => p.verdict === 'FREIGABE' && p.blockers.length === 0 && p.warnings.length === 0)
    .sort((a, b) => b.precisionScore - a.precisionScore)
    .flatMap(p => {
      const c = byCoin.get(p.coinId);
      if (!c || seen.has(p.coinId) || ![c.entry, c.stopLoss, c.takeProfit1, c.takeProfit2].every(Number.isFinite)
        || c.stopLoss <= 0 || c.stopLoss >= c.entry || c.takeProfit1 <= c.entry || c.takeProfit2 < c.takeProfit1) return [];
      seen.add(p.coinId);
      return [{ pick: p, candidate: c }];
    }).slice(0, 3) : [];
  const noData = candidates.length === 0 || !fresh;

  return (
    <section aria-label="Krypto-Kaufsignale" className="space-y-4 rounded-2xl border border-emerald-500/40 bg-slate-900/70 p-5">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Krypto · klare Signale</p>
          <h2 className="mt-1 text-xl font-bold text-white">{signals.length ? 'Diese Coins haben ein Kauf-Signal' : 'Heute kein Kauf-Signal'}</h2>
        </div>
        <span className="text-xs text-slate-400">{mode === 'daytrade' ? 'Daytrading · bis ca. 6 Stunden' : 'Swing · bis ca. 3 Tage'}</span>
      </header>
      {signals.length === 0 ? (
        <div className="rounded-xl border border-amber-400/30 bg-amber-950/10 p-4">
          <p className="font-semibold text-amber-200">ABWARTEN</p>
          <p className="mt-1 text-sm text-slate-300">{noData
            ? 'Aktuelle Kurs- und Analysedaten fehlen oder sind veraltet. Ohne diese Daten lässt sich kein Coin zum Kauf freigeben.'
            : 'Kein Coin erfüllt derzeit alle Kauf-Kriterien. Beobachtungssignale sind noch keine Kauf-Signale.'}</p>
        </div>
      ) : (
        <ol className="grid gap-3 md:grid-cols-3">
          {signals.map(({ pick: p, candidate: c }, i) => (
            <li key={p.coinId} className="min-w-0 space-y-3 rounded-xl border border-emerald-500/40 bg-emerald-950/15 p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-bold text-white">{i + 1}. {p.symbol}</h3>
                <span className="rounded bg-emerald-500/15 px-2 py-1 text-xs font-bold text-emerald-200">KAUF-SIGNAL</span>
              </div>
              <p className="text-xs text-slate-400">Modell-Score {p.precisionScore}/100 · keine Gewinnwahrscheinlichkeit</p>
              <dl className="space-y-2 text-sm">
                {[['Einstieg (Referenz)', c.entry], ['Stop-Loss', c.stopLoss], ['Ziel 1', c.takeProfit1], ['Ziel 2', c.takeProfit2]].map(([label, value]) => (
                  <div key={label} className="flex flex-wrap justify-between gap-x-2"><dt className="text-slate-400">{label}</dt><dd className="font-mono text-slate-100">{price(value as number)}</dd></div>
                ))}
              </dl>
              <p className="text-xs text-slate-300">{p.reasons[0] ?? c.oneLineReason}</p>
              <p className="text-xs text-amber-200">Stop-Abstand: {((c.entry - c.stopLoss) / c.entry * 100).toFixed(1)} % · Kurse und Ausführung können abweichen.</p>
              <Link href={`/assets/${encodeURIComponent(p.symbol.toLowerCase())}`} className="inline-block text-sm font-semibold text-emerald-300 underline">Analyse zu {p.symbol} öffnen →</Link>
            </li>
          ))}
        </ol>
      )}
      <p className="text-xs text-slate-500">{fresh ? `Analyse erstellt: ${new Date(generatedAt).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })} (Berlin). ` : ''}Modellbasierte Handelssignale, keine persönliche Anlageberatung. Ein Stop-Loss garantiert keinen Ausführungskurs.</p>
    </section>
  );
}

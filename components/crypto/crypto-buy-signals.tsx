import Link from 'next/link';
import { CryptoPlanBudget } from '@/components/crypto/crypto-plan-budget';
import { ArrowRight, Clock3, Pause, ShieldCheck } from 'lucide-react';
import type { CryptoPrecisionResult } from '@/lib/analysis/crypto-precision-gate';
import type { RankedCandidate, TradeMode } from '@/lib/analysis/master-signal-engine';

interface Props {
  picks: CryptoPrecisionResult[];
  candidates: RankedCandidate[];
  generatedAt: string;
  mode: TradeMode;
  now?: number;
  pausedReason?: string | null;
  pricesAvailable?: boolean;
}
const price = (value: number) => `${value.toLocaleString('de-DE', { maximumSignificantDigits: 7 })} USDT`;

export function CryptoBuySignals({ picks, candidates, generatedAt, mode, now = Date.now(), pausedReason = null, pricesAvailable = candidates.length > 0 }: Props) {
  const age = now - Date.parse(generatedAt);
  const fresh = Number.isFinite(age) && age >= 0 && age <= 5 * 60_000;
  const byCoin = new Map(candidates.map(c => [c.coinId, c]));
  const seen = new Set<string>();
  const signals = fresh && !pausedReason ? [...picks]
    .filter(p => p.verdict === 'FREIGABE' && p.blockers.length === 0 && p.warnings.length === 0)
    .sort((a, b) => b.precisionScore - a.precisionScore)
    .flatMap(p => {
      const c = byCoin.get(p.coinId);
      if (!c || seen.has(p.coinId) || ![c.entry, c.stopLoss, c.takeProfit1, c.takeProfit2].every(Number.isFinite)
        || c.stopLoss <= 0 || c.stopLoss >= c.entry || c.takeProfit1 <= c.entry || c.takeProfit2 < c.takeProfit1) return [];
      seen.add(p.coinId);
      return [{ pick: p, candidate: c }];
    }).slice(0, 3) : [];
  const waitingReason = !fresh
    ? 'Die letzte Prüfung ist zu alt. Wir brauchen aktuelle Angaben, bevor wir einen Kauf vorschlagen.'
    : candidates.length === 0
      ? pricesAvailable ? 'Die Preise sind da. Für einen Kaufvorschlag fehlen aber noch ausreichend verlässliche Angaben.' : 'Aktuelle Kurse fehlen gerade. Deshalb können wir dir keinen Kauf vorschlagen.'
      : pausedReason ?? 'Bei den geprüften Coins passt der Einstieg gerade nicht. Du musst heute nichts kaufen.';

  return <section aria-label="Krypto-Kaufsignale" className="terminal-panel overflow-hidden">
    <header className="border-b border-slate-800 p-5 sm:p-6">
      <p className="mb-2 text-sm text-slate-400">{mode === 'daytrade' ? 'Für den heutigen Tag' : 'Für die nächsten Tage'}</p>
      <h2 className="text-2xl font-semibold leading-tight text-white sm:text-3xl">{signals.length ? 'Diese Coins kannst du näher ansehen' : 'Heute kein Kauf-Signal'}</h2>
    </header>
    <CryptoPlanBudget hasBuySignal={signals.length > 0} />
    {signals.length === 0 ? <div className="flex items-start gap-3 p-5 sm:p-6">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-amber-400/30 bg-amber-400/5 text-amber-200"><Pause size={18} aria-hidden /></span>
      <div><h3 className="font-semibold text-amber-200">Abwarten ist heute in Ordnung.</h3><p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">{waitingReason}</p></div>
    </div> : <ol className="grid gap-px bg-slate-800 md:grid-cols-3">{signals.map(({ pick, candidate }) => <li key={pick.coinId} className="space-y-5 bg-[#0c151e] p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3"><h3 className="font-display text-3xl font-semibold text-white">{pick.symbol}</h3><span className="rounded border border-emerald-400/30 bg-emerald-400/5 px-2 py-1 text-xs font-semibold text-emerald-200">KAUF-SIGNAL</span></div>
      <p className="text-sm leading-relaxed text-slate-300">{candidate.nearSupport ? 'Der Kurs steigt. Der geplante Kauf liegt nahe an einer Preiszone, an der er zuletzt Halt gefunden hat.' : 'Der Kurs steigt. Die geplanten Preise zeigen dir vorab, wo du kaufen und wieder aussteigen würdest.'}</p>
      <dl className="divide-y divide-slate-800 border-y border-slate-800">
        {[['Geplanter Kaufpreis', candidate.entry], ['Ausstieg bei Verlust', candidate.stopLoss], ['Ziel 1', candidate.takeProfit1], ['Ziel 2', candidate.takeProfit2]].map(([label, value]) => <div key={label} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><dt className="text-slate-400">{label}</dt><dd className="font-mono text-white">{price(value as number)}</dd></div>)}
      </dl>
      <p className="flex items-start gap-2 text-xs leading-relaxed text-amber-200"><ShieldCheck size={15} className="mt-0.5 shrink-0" aria-hidden /><span>Bis zum geplanten Ausstieg kann der Kurs um etwa {((candidate.entry - candidate.stopLoss) / candidate.entry * 100).toFixed(1)} % fallen. Bei schnellen Bewegungen kann der Verlust größer sein.</span></p>
      <Link href={`/assets/${encodeURIComponent(pick.symbol.toLowerCase())}`} className="terminal-button w-full justify-between">{pick.symbol} genauer ansehen<ArrowRight size={16} aria-hidden /></Link>
    </li>)}</ol>}
    <footer className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-800 px-5 py-4 text-xs text-slate-500 sm:px-6">
      {fresh && <p className="flex items-center gap-1.5"><Clock3 size={13} aria-hidden />Stand: {new Date(generatedAt).toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' })} Uhr (Berlin)</p>}
      <p>Die Preise sind ein Plan, keine Garantie. Kauf und Schutzauftrag setzt du selbst.</p>
    </footer>
  </section>;
}

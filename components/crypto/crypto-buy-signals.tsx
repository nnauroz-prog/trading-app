import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Clock3, Crosshair, Pause, ShieldAlert, Target } from 'lucide-react';
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
    <section aria-label="Krypto-Kaufsignale" className="terminal-panel relative overflow-hidden border border-[#344b44] bg-[#101822]">
      <div aria-hidden className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-[#d8ff62]/70 via-[#d8ff62]/20 to-transparent" />
      <header className="border-b border-[#253340] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="section-kicker flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#d8ff62]"><Crosshair aria-hidden className="h-4 w-4" />Krypto / klare Signale</p>
          <span className="flex items-center gap-1.5 font-mono text-[9px] text-[#92a7b9]"><Clock3 aria-hidden className="h-3 w-3" />{mode === 'daytrade' ? 'Daytrading · bis ca. 6 Stunden' : 'Swing · bis ca. 3 Tage'}</span>
        </div>
        <div className="mt-4 flex items-end justify-between gap-4">
          <h2 className="terminal-heading max-w-2xl text-[24px] font-semibold leading-[1.2] tracking-[-0.04em] text-white sm:text-[29px]">{signals.length ? 'Diese Coins haben ein Kauf-Signal' : 'Heute kein Kauf-Signal'}</h2>
          {signals.length > 0 && <span aria-label={`${signals.length} Kauf-Signale`} className="hidden font-mono text-4xl font-light tracking-tight text-[#d8ff62] sm:block">{signals.length.toString().padStart(2, '0')}</span>}
        </div>
      </header>

      {signals.length === 0 ? (
        <div className="m-5 grid grid-cols-[auto_1fr] items-start gap-3 border border-[#334554] bg-[#0b121b] p-4 sm:m-6 sm:gap-4 sm:p-5">
          <span className="flex h-10 w-10 items-center justify-center border border-[#d8a95d]/35 bg-[#d8a95d]/[0.05] text-[#e3bc7e]"><Pause aria-hidden className="h-4 w-4" /></span>
          <div className="min-w-0"><p className="font-mono text-[11px] font-semibold tracking-[0.18em] text-[#e3bc7e]">ABWARTEN</p><p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-[#a8bacb]">{noData
            ? 'Aktuelle Kurs- und Analysedaten fehlen oder sind veraltet. Ohne diese Daten lässt sich kein Coin zum Kauf freigeben.'
            : 'Kein Coin erfüllt derzeit alle Kauf-Kriterien. Beobachtungssignale sind noch keine Kauf-Signale.'}</p></div>
        </div>
      ) : (
        <ol className="grid gap-px bg-[#2a3c43] md:grid-cols-3">
          {signals.map(({ pick: p, candidate: c }, i) => (
            <li key={p.coinId} className="relative min-w-0 space-y-4 bg-[#0c151e] p-5 sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] text-[#6f899d]">/{(i + 1).toString().padStart(2, '0')}</span>
                <span className="flex items-center gap-1.5 border border-[#d8ff62]/35 bg-[#d8ff62]/[0.06] px-2 py-1 font-mono text-[9px] font-semibold tracking-wider text-[#d8ff62]"><ArrowUpRight aria-hidden className="h-3 w-3" />KAUF-SIGNAL</span>
              </div>
              <div className="flex items-baseline justify-between gap-3"><h3 className="terminal-heading text-[32px] font-semibold leading-none tracking-[-0.05em] text-white">{p.symbol}</h3><span className="font-mono text-xs text-[#65e6ff]">{p.precisionScore}<span className="text-[#70889d]">/100</span></span></div>
              <p className="!mt-1 text-[9px] leading-relaxed text-[#859bad]">Modell-Score · keine Gewinnwahrscheinlichkeit</p>
              <dl className="divide-y divide-[#233541] border-y border-[#233541]">
                {[['Einstieg (Referenz)', c.entry], ['Stop-Loss', c.stopLoss], ['Ziel 1', c.takeProfit1], ['Ziel 2', c.takeProfit2]].map(([label, value], level) => (
                  <div key={label} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 py-2.5 text-xs"><dt className="flex items-center gap-1.5 text-[#92a9bb]">{level > 1 && <Target aria-hidden className="h-3 w-3 text-[#65e6ff]/70" />}{label}</dt><dd className={`font-mono ${level === 1 ? 'text-[#e3bc7e]' : level > 1 ? 'text-[#d8ff62]' : 'text-white'}`}>{price(value as number)}</dd></div>
                ))}
              </dl>
              <p className="text-xs leading-relaxed text-[#b1c3d1]">{p.reasons[0] ?? c.oneLineReason}</p>
              <p className="flex items-start gap-1.5 text-[10px] leading-relaxed text-[#bba982]"><ShieldAlert aria-hidden className="mt-0.5 h-3 w-3 shrink-0" /><span>Stop-Abstand: {((c.entry - c.stopLoss) / c.entry * 100).toFixed(1)} % · Kurse und Ausführung können abweichen.</span></p>
              <Link href={`/assets/${encodeURIComponent(p.symbol.toLowerCase())}`} className="terminal-button group flex items-center justify-between gap-3 border border-[#486159] px-3 py-2.5 text-xs font-semibold text-[#d8ff62] transition-colors hover:border-[#d8ff62] hover:bg-[#d8ff62]/[0.06]">Analyse zu {p.symbol} öffnen<ArrowRight aria-hidden className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></Link>
            </li>
          ))}
        </ol>
      )}
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2 border-t border-[#253340] px-5 py-3.5 sm:px-6">
        {fresh && <p className="flex shrink-0 items-center gap-1.5 font-mono text-[9px] leading-relaxed text-[#8da3b6]"><Clock3 aria-hidden className="h-3 w-3" />Analyse erstellt: {new Date(generatedAt).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })} (Berlin)</p>}
        <p className="max-w-2xl text-[10px] leading-relaxed text-[#7f95a8]">Modellbasierte Handelssignale, keine persönliche Anlageberatung. Ein Stop-Loss garantiert keinen Ausführungskurs.</p>
      </div>
    </section>
  );
}

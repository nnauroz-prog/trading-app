import Link from 'next/link';
import { AgentVerdict } from '@/lib/agents/personas';
import { CoinSentiment } from '@/lib/akademie/spaeher';
import { SetupSimilarity } from '@/lib/analysis/setup-similarity';
import { EventWindowState } from '@/lib/calendar/event-window';
import { IntelSignal } from '@/lib/intel/types';
import { computeConfidence } from '@/lib/heute-confidence';
import { HeuteStreak } from '@/components/heute-streak';

function fmtPrice(v: number): string {
  if (v >= 1000) return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (v >= 1) return v.toFixed(2);
  if (v >= 0.01) return v.toFixed(4);
  return v.toFixed(7);
}

interface Props {
  personas: AgentVerdict[];
  perCoinSentiment: CoinSentiment[];
  setupSimilarity: SetupSimilarity | null;
  eventWindow: EventWindowState | null;
  intelSignal: IntelSignal | null;
}

// One-glance verdict for the home page. Synthesises the three firma decisions
// into a single headline plus the most important reason. Anything deeper sits
// in the details below.
export function HeuteEntscheidung({ personas, perCoinSentiment, setupSimilarity, eventWindow, intelSignal }: Props) {
  const buys = personas.filter((p) => p.verdict === 'BUY');
  const buyCount = buys.length;

  // Headline coin: prefer the conservative firma's pick if they BUY,
  // otherwise the most-recommended coin among buyers, otherwise the first
  // candidate the balanced firma considered.
  const conservative = personas.find((p) => p.persona === 'conservative');
  const balanced = personas.find((p) => p.persona === 'balanced');
  const headlineFirma = buys.find((p) => p.persona === 'conservative') ?? buys.find((p) => p.persona === 'balanced') ?? buys[0];
  const target = headlineFirma?.target ?? null;

  let verdict: 'STRONG_BUY' | 'BUY' | 'CAREFUL_BUY' | 'WAIT';
  let headline: string;
  let subline: string;
  let toneClass: string;
  let badgeClass: string;
  let badgeText: string;

  if (buyCount === 3) {
    verdict = 'STRONG_BUY';
    headline = target ? `HEUTE KAUFEN: ${target.symbol}` : 'HEUTE KAUFEN';
    subline = 'Alle drei Firmen sind sich einig — starkes Setup, sauberes Risiko, Markt passt.';
    toneClass = 'border-emerald-400/70 bg-emerald-950/40';
    badgeClass = 'border-emerald-400/60 bg-emerald-500/20 text-emerald-100';
    badgeText = 'KLARER KAUF';
  } else if (buyCount === 2 && (buys.some((b) => b.persona === 'conservative') || buys.some((b) => b.persona === 'balanced'))) {
    verdict = 'BUY';
    headline = target ? `HEUTE KAUFEN: ${target.symbol}` : 'HEUTE KAUFEN';
    const waiter = personas.find((p) => p.verdict === 'WAIT');
    subline = waiter ? `Mehrheit will kaufen — nur ${waiter.name} wartet. ${waiter.rationale.replace(/^Ich warte: /, '').replace(/\.$/, '')}.` : 'Zwei von drei Firmen wollen kaufen.';
    toneClass = 'border-emerald-400/50 bg-emerald-950/25';
    badgeClass = 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100';
    badgeText = 'KAUFEN';
  } else if (buyCount === 1 || (buyCount === 2 && !buys.some((b) => b.persona === 'conservative' || b.persona === 'balanced'))) {
    verdict = 'CAREFUL_BUY';
    headline = target ? `RISKANT: nur ${target.symbol}` : 'GEMISCHTES BILD';
    const buyer = buys[0];
    subline = `Nur ${buys.map((b) => b.name).join(' und ')} will kaufen. Konservativ wartet — also vorsichtig, kleine Position oder lieber abwarten.`;
    void buyer;
    toneClass = 'border-amber-400/50 bg-amber-950/20';
    badgeClass = 'border-amber-400/60 bg-amber-500/15 text-amber-100';
    badgeText = 'VORSICHT';
  } else {
    verdict = 'WAIT';
    headline = 'HEUTE WARTEN';
    // Find the most-cited blocker reason across firmas.
    const reasons = personas.map((p) => p.rationale.replace(/^Ich warte: /, '').replace(/\.$/, ''));
    const common = reasons[1] ?? reasons[0] ?? 'kein klares Setup';
    subline = `Keine Firma will heute kaufen. Hauptgrund: ${common}.`;
    toneClass = 'border-slate-700 bg-slate-900/60';
    badgeClass = 'border-slate-700 bg-slate-900 text-slate-300';
    badgeText = 'KEIN TRADE';
  }

  // Optional: a sentiment hint if the headline coin has clear news tilt.
  let newsHint: string | null = null;
  let newsTilt: 'bullisch' | 'bärisch' | 'neutral' | 'none' = 'none';
  if (target) {
    const sentiment = perCoinSentiment.find((c) => c.coin === target.symbol.toUpperCase());
    if (sentiment) {
      newsTilt = sentiment.tilt;
      if (sentiment.tilt !== 'neutral') {
        newsHint = sentiment.tilt === 'bullisch'
          ? `Späher: ${target.symbol} hat heute bullische News (${sentiment.bullishCount} ↑ / ${sentiment.bearishCount} ↓).`
          : `Späher: ${target.symbol} hat heute bärische News (${sentiment.bearishCount} ↓ / ${sentiment.bullishCount} ↑) — kritisch prüfen.`;
      }
    }
  }

  const confidence = computeConfidence(buyCount, newsTilt, setupSimilarity, eventWindow, intelSignal);

  void verdict;
  void conservative;
  void balanced;

  return (
    <section className={`space-y-3 rounded-2xl border-2 p-5 ${toneClass}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Heute</span>
        <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badgeClass}`}>{badgeText}</span>
      </div>
      {eventWindow?.imminent && eventWindow.nextHighImpact && (
        <div className={`rounded-lg border px-3 py-2 text-[12px] ${eventWindow.veryImminent ? 'border-rose-400/60 bg-rose-950/40 text-rose-100' : 'border-amber-400/60 bg-amber-950/30 text-amber-100'}`}>
          <span className="font-bold">{eventWindow.veryImminent ? 'Achtung — Termin sehr nah' : 'Termin in Sicht'}:</span>{' '}
          {eventWindow.nextHighImpact.title} in ca. {eventWindow.hoursUntilNextHighImpact} Stunden ({eventWindow.nextHighImpact.region}, {eventWindow.nextHighImpact.time} Uhr). {eventWindow.veryImminent ? 'Konservativ und Balanciert warten — Volatilität nach Release kann jeden Stop überspringen.' : 'Konservativ wartet bis nach dem Termin. Andere Firmen schauen noch normal aufs Setup.'}
        </div>
      )}
      <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">{headline}</h1>
      {target && (verdict === 'STRONG_BUY' || verdict === 'BUY' || verdict === 'CAREFUL_BUY') && (
        <div className="grid grid-cols-3 gap-2 rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-center">
          <div>
            <div className="text-[9px] uppercase tracking-wider text-slate-500">Einstieg</div>
            <div className="font-mono text-sm font-bold text-slate-100">${fmtPrice(target.entry)}</div>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-wider text-rose-400">Stop</div>
            <div className="font-mono text-sm font-bold text-rose-200">${fmtPrice(target.stopLoss)}</div>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-wider text-emerald-400">Ziel</div>
            <div className="font-mono text-sm font-bold text-emerald-200">${fmtPrice(target.takeProfit1)}</div>
          </div>
        </div>
      )}
      <p className="text-sm leading-relaxed text-slate-200">{subline}</p>

      <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Konfidenz</span>
          <span className={`font-mono text-sm font-bold ${confidence.toneClass}`}>
            {confidence.score}/100 · {confidence.label}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-800">
          <div
            className={`h-full ${confidence.score >= 75 ? 'bg-emerald-400/80' : confidence.score >= 55 ? 'bg-amber-400/80' : 'bg-rose-400/80'}`}
            style={{ width: `${confidence.score}%` }}
          />
        </div>
        <div className="mt-2 space-y-1 text-[11px] text-slate-400">
          <div>· Firma-Mehrheit: {buyCount}/3 wollen kaufen</div>
          {setupSimilarity && (
            <div>· Vergangenheit: {setupSimilarity.oneLineVerdict}</div>
          )}
          {newsHint && <div>· {newsHint}</div>}
          {intelSignal && intelSignal !== 'neutral' && intelSignal !== 'kein_signal' && (
            <div>· Recherche-Chefredakteur sieht Tendenz {intelSignal}.</div>
          )}
        </div>
      </div>

      <HeuteStreak />

      <div className="flex flex-wrap items-baseline gap-3 text-[10px] uppercase tracking-wider text-slate-500">
        <Link href="/agent" className="text-sky-300 hover:text-sky-200 normal-case tracking-normal">Wer und warum →</Link>
      </div>
    </section>
  );
}

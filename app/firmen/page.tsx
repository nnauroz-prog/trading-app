import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { getMasterSignal, TradeMode } from '@/lib/analysis/master-signal-engine';

export const metadata: Metadata = {
  title: 'Firmen-Vergleich',
  description: 'Drei Firmen-Profile (konservativ, balanciert, aggressiv) Seite an Seite — wer sagt heute was und warum.'
};
import { getBacktestSummary } from '@/lib/analysis/backtest-summary';
import { evaluatePersonas } from '@/lib/agents/personas';
import { runSpaeher } from '@/lib/akademie/spaeher';
import { getCryptoNews } from '@/lib/news/news-agent';
import { listMacroEventsThisWeek } from '@/lib/calendar/macro-events';
import { computeEventWindow } from '@/lib/calendar/event-window';
import { getFirmaBacktest } from '@/lib/agents/firma-backtest';
import { CEO_BIOS, SUBAGENT_BIOS } from '@/lib/agents/personalities';
import { FIRMA_STRATEGY_PARAMS } from '@/lib/agents/firma-params';
import { generateTradeMemo } from '@/lib/agents/trade-memo';
import { compareFirmaVerdicts } from '@/lib/agents/firma-diff';
import { FirmaSubAgentVotes } from '@/components/firma-sub-agent-votes';
import { FirmaTradeMemoPanel } from '@/components/firma-trade-memo-panel';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function FirmenPage() {
  const tradeMode: TradeMode = (await cookies()).get('trade-mode')?.value === 'daytrade' ? 'daytrade' : 'swing';
  const [report, backtest, newsItems, firmaBacktest] = await Promise.all([
    getMasterSignal(tradeMode), getBacktestSummary(), getCryptoNews(), getFirmaBacktest()
  ]);
  const spaeher = runSpaeher(newsItems);
  const eventWindow = computeEventWindow(listMacroEventsThisWeek());
  const personas = evaluatePersonas(report, backtest, spaeher, eventWindow);
  const diff = compareFirmaVerdicts(personas);

  const diffTone = diff.unanimous && diff.majorityVerdict === 'BUY'
    ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100'
    : diff.unanimous && diff.majorityVerdict === 'WAIT'
      ? 'border-slate-600 bg-slate-900/60 text-slate-200'
      : 'border-amber-400/50 bg-amber-500/10 text-amber-100';

  return (
    <main className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-emerald-300">
        ← zurück zum Signal Desk
      </Link>

      <header className="space-y-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400">Firmen-Vergleich</div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Konservativ vs. Balanciert vs. Aggressiv</h1>
        <p className="text-sm text-slate-400">
          Drei Firmen Seite an Seite. Sub-Agenten-Stimmen mit Begründung, volle Trade-Memos bei BUY-Verdict, Backtest-Performance und Strategie-Parameter. Verstehe, was jede Firma anders macht — und wer heute den Mut hat zu kaufen.
        </p>
      </header>

      <section className={`rounded-2xl border-2 p-4 ${diffTone}`}>
        <div className="text-[10px] font-semibold uppercase tracking-[0.25em] opacity-80">Heute zwischen den Firmen</div>
        <p className="mt-1 text-[13px] font-bold leading-snug">{diff.observation}</p>
        {diff.uniqueTargets > 1 && (
          <p className="mt-1 text-[10.5px] opacity-80">
            Verschiedene Targets:{' '}
            {Object.entries(diff.targetsByFirma).filter(([, v]) => v !== null).map(([k, v]) => `${k}: ${v}`).join(' · ')}
          </p>
        )}
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {personas.map((p) => {
          const ceo = CEO_BIOS[p.persona];
          const subAgents = Object.values(SUBAGENT_BIOS[p.persona]);
          const params = FIRMA_STRATEGY_PARAMS[p.persona];
          const bt = firmaBacktest.rows.find((r) => r.firma === p.persona);
          const memo = generateTradeMemo(p);
          const isBuy = p.verdict === 'BUY';
          const tone = isBuy ? 'border-emerald-400/60 bg-emerald-950/30' : 'border-slate-700 bg-slate-900/40';
          return (
            <article key={p.persona} className={`space-y-3 rounded-2xl border-2 p-4 ${tone}`}>
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-[9px] uppercase tracking-[0.2em] text-slate-500">Firma</div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-white">{p.name}</h2>
                </div>
                <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${isBuy ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-100' : 'border-slate-700 bg-slate-900 text-slate-400'}`}>
                  {isBuy ? 'KAUFEN' : 'WARTEN'}
                </span>
              </div>
              <p className="text-[11px] italic text-slate-400">„{p.motto}“</p>

              <div className="rounded-md border border-slate-800 bg-slate-950/40 p-2 text-[11px]">
                <div className="text-[9px] uppercase tracking-wider text-slate-500">Philosophie</div>
                <p className="mt-0.5 leading-relaxed text-slate-300">{p.manifest}</p>
              </div>

              <div className="rounded-md border border-slate-800 bg-slate-950/40 p-2 text-[11px]">
                <div className="text-[9px] uppercase tracking-wider text-slate-500">CEO</div>
                <div className="mt-0.5 font-semibold text-slate-200">{ceo.name}</div>
                <p className="text-[10px] italic text-slate-400">{ceo.bio}</p>
                <p className="mt-1 text-[10px] text-emerald-300">„{ceo.quote}“</p>
              </div>

              <div className="rounded-md border border-slate-800 bg-slate-950/40 p-2 text-[11px]">
                <div className="text-[9px] uppercase tracking-wider text-slate-500">Strategie-Parameter</div>
                <div className="mt-1 grid grid-cols-3 gap-1 text-center text-[10px]">
                  <div><div className="text-slate-500">Häkchen</div><div className="font-mono text-slate-200">≥{params.minConfluence}</div></div>
                  <div><div className="text-slate-500">Stop</div><div className="font-mono text-slate-200">{params.stopAtrMult.toFixed(1)}× ATR</div></div>
                  <div><div className="text-slate-500">Ziel</div><div className="font-mono text-slate-200">{params.tp1AtrMult.toFixed(1)}× ATR</div></div>
                </div>
              </div>

              {bt && (
                <div className="rounded-md border border-slate-800 bg-slate-950/40 p-2 text-[11px]">
                  <div className="text-[9px] uppercase tracking-wider text-slate-500">Backtest ({bt.periodDays}d)</div>
                  <div className="mt-1 grid grid-cols-3 gap-1 text-center text-[10px]">
                    <div><div className="text-slate-500">Trades</div><div className="font-mono text-slate-200">{bt.trades}</div></div>
                    <div><div className="text-slate-500">Treffer</div><div className="font-mono text-slate-200">{bt.winRatePct !== null ? `${bt.winRatePct.toFixed(0)}%` : '—'}</div></div>
                    <div><div className="text-slate-500">Netto</div><div className={`font-mono ${bt.netReturnPct >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{bt.netReturnPct >= 0 ? '+' : ''}{bt.netReturnPct.toFixed(1)}%</div></div>
                  </div>
                </div>
              )}

              <FirmaSubAgentVotes team={p.team} />

              {memo && <FirmaTradeMemoPanel memo={memo} />}

              <details className="rounded-md border border-slate-800 bg-slate-950/40 p-2 text-[10.5px]">
                <summary className="cursor-pointer text-[9px] font-semibold uppercase tracking-wider text-slate-400 hover:text-emerald-300">
                  ▸ Personen-Profile ({subAgents.length} Sub-Agenten)
                </summary>
                <ul className="mt-1.5 space-y-1">
                  {subAgents.map((sa) => (
                    <li key={sa.name} className="rounded border border-slate-800 bg-slate-950/40 p-1.5">
                      <div className="font-semibold text-slate-200">{sa.name}</div>
                      <div className="text-[9.5px] text-slate-500">{sa.role}</div>
                      <p className="mt-0.5 text-[9.5px] italic leading-snug text-slate-400">{sa.bio}</p>
                    </li>
                  ))}
                </ul>
              </details>

              <p className="text-[11px] leading-relaxed text-slate-300">{p.rationale}</p>
              <p className="rounded-md border border-slate-700/60 bg-slate-950/40 p-2 text-[10px] italic leading-relaxed text-slate-400">
                CEO-Schlusswort: {p.ceoFinalWord}
              </p>
            </article>
          );
        })}
      </div>

      <Link href="/agent" className="inline-block text-[11px] text-sky-300 hover:text-sky-200">
        → Volle interne Diskussion auf /agent
      </Link>
    </main>
  );
}

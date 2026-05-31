import Link from 'next/link';
import { cookies } from 'next/headers';
import { buildMasterSignal, TradeMode } from '@/lib/analysis/master-signal-engine';
import { getBacktestSummary } from '@/lib/analysis/backtest-summary';
import { evaluatePersonas } from '@/lib/agents/personas';
import { SubAgentReport, VoteTone } from '@/lib/agents/sub-agents';
import { buildInternalDialog, InternalMessage } from '@/lib/agents/internal-messages';
import { vorstandMediation, VorstandVerdict } from '@/lib/agents/vorstand';
import { VorstandRecorder } from '@/components/vorstand-recorder';
import { VorstandLog } from '@/components/vorstand-log';
import { getFirmaBacktest } from '@/lib/agents/firma-backtest';
import { FirmaBacktestTable } from '@/components/firma-backtest-table';
import { generateTradeMemo } from '@/lib/agents/trade-memo';
import { TradeMemoCard } from '@/components/trade-memo-card';
import { runSpaeher } from '@/lib/akademie/spaeher';
import { getCryptoNews } from '@/lib/news/news-agent';
import { listMacroEventsThisWeek } from '@/lib/calendar/macro-events';
import { computeEventWindow } from '@/lib/calendar/event-window';
import { AgentLog } from '@/components/agent-log';
import { FirmaRecorder } from '@/components/firma-recorder';
import { FirmaStandings } from '@/components/firma-standings';
import { FirmaRankingPanel } from '@/components/firma-ranking';
import { FirmaAccuracyPanel } from '@/components/firma-accuracy-panel';
import { FirmaCoinHeatmap } from '@/components/firma-coin-heatmap';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function fmtPrice(v: number): string {
  if (v >= 1000) return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (v >= 1) return v.toFixed(2);
  if (v >= 0.01) return v.toFixed(4);
  return v.toFixed(7);
}

function toneClasses(tone: VoteTone): string {
  if (tone === 'good') return 'border-emerald-400/50 bg-emerald-500/10 text-emerald-200';
  if (tone === 'bad') return 'border-rose-400/50 bg-rose-500/10 text-rose-200';
  return 'border-slate-700 bg-slate-900 text-slate-300';
}

function vorstandClasses(v: VorstandVerdict): string {
  if (v === 'KLARER_KAUF') return 'border-emerald-400/60 bg-emerald-950/30';
  if (v === 'KAUFEN_VORSICHTIG') return 'border-emerald-400/40 bg-emerald-950/20';
  if (v === 'WATCHLIST') return 'border-amber-400/40 bg-amber-950/20';
  return 'border-slate-700 bg-slate-900/60';
}

function vorstandBadgeClasses(v: VorstandVerdict): string {
  if (v === 'KLARER_KAUF') return 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100';
  if (v === 'KAUFEN_VORSICHTIG') return 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200';
  if (v === 'WATCHLIST') return 'border-amber-400/50 bg-amber-500/15 text-amber-200';
  return 'border-slate-700 bg-slate-900 text-slate-300';
}

function TeamRow({ report }: { report: SubAgentReport }) {
  return (
    <li className="flex flex-col gap-1 rounded-md border border-slate-800 bg-slate-950/40 p-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{report.title}</span>
        <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${toneClasses(report.voteTone)}`}>
          {report.vote}
        </span>
      </div>
      <p className="text-[11px] leading-snug text-slate-300">{report.reason}</p>
    </li>
  );
}

function MessageRow({ msg }: { msg: InternalMessage }) {
  const accent =
    msg.tone === 'warn' ? 'border-l-rose-400/60' :
    msg.tone === 'agree' ? 'border-l-emerald-400/60' :
    'border-l-slate-600';
  const speaker = msg.from === 'ceo' ? 'text-emerald-200' : 'text-slate-300';
  return (
    <li className={`border-l-2 ${accent} pl-2`}>
      <div className={`text-[10px] font-semibold uppercase tracking-wider ${speaker}`}>{msg.fromTitle}</div>
      <p className="text-[11px] leading-snug text-slate-300">„{msg.body}“</p>
    </li>
  );
}

export default async function AgentPage() {
  const tradeMode: TradeMode = (await cookies()).get('trade-mode')?.value === 'daytrade' ? 'daytrade' : 'swing';
  const [report, backtest, newsItems, firmaBacktest] = await Promise.all([buildMasterSignal(tradeMode), getBacktestSummary(), getCryptoNews(), getFirmaBacktest()]);
  const spaeher = runSpaeher(newsItems);
  const eventWindow = computeEventWindow(listMacroEventsThisWeek());
  const personas = evaluatePersonas(report, backtest, spaeher, eventWindow);

  return (
    <main className="mx-auto max-w-5xl space-y-5 p-4 md:p-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-emerald-300">
        ← zurück zum Signal Desk
      </Link>

      <header className="space-y-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400">Agent-Spielwiese</div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Drei Firmen, drei Teams, eine Entscheidung pro Tag</h1>
        <p className="text-sm text-slate-400">
          Jede der drei Firmen hat einen CEO mit eigener Risikoneigung und ein Team aus drei Sub-Agenten: ein Markt-Analyst (große Marktlage), ein Setup-Scout (das konkrete Setup) und ein Risiko-Manager (Stop, Liquidität, Broker, Pump-Schutz). Der CEO hört allen zu und entscheidet KAUFEN oder WARTEN. Ehrlich gesagt: alle drei Firmen nutzen dieselbe Daten-Engine — sie unterscheiden sich nur darin, wie streng der CEO ist.
        </p>
        <details className="rounded-md border border-slate-800 bg-slate-950/40 p-2 text-[11px] text-slate-400">
          <summary className="cursor-pointer text-slate-300">Was bedeutet „X von 12 Häkchen“?</summary>
          <p className="mt-2 leading-relaxed">
            Die Engine prüft für jeden Coin 12 Dinge: Trend (EMA20/50/200), Momentum (RSI, MACD, Stochastik), Trendstärke (ADX), Volumen-Bestätigung, Volatilität (ATR), Marktstruktur, Position zwischen Unterstützung & Widerstand. Jedes erfüllte Kriterium ist ein Häkchen. Ab 7 grünen Häkchen schlägt der Aggressive Trade vor, ab 9 nennt es der Konservative ein „starkes Setup“.
          </p>
        </details>
      </header>

      {(() => {
        const vorstand = vorstandMediation(personas);
        const vorstandTone = vorstandClasses(vorstand.verdict);
        const vorstandBadge = vorstandBadgeClasses(vorstand.verdict);
        return (
          <section className={`space-y-2 rounded-2xl border-2 p-5 ${vorstandTone}`}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Vorstand</span>
              <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${vorstandBadge}`}>
                {vorstand.verdict.replace(/_/g, ' ')}
              </span>
            </div>
            <h2 className="text-lg font-bold text-white">{vorstand.headline}</h2>
            <p className="text-[13px] leading-relaxed text-slate-200">{vorstand.body}</p>
            {vorstand.conflictNotes.length > 0 && (
              <details className="rounded-md border border-slate-800 bg-slate-950/40 p-2 text-[11px]">
                <summary className="cursor-pointer text-slate-300">Wo das Gremium uneins ist ({vorstand.conflictNotes.length})</summary>
                <ul className="mt-1.5 space-y-1 text-slate-400">
                  {vorstand.conflictNotes.map((c, i) => <li key={i}>· {c}</li>)}
                </ul>
              </details>
            )}
          </section>
        );
      })()}

      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {personas.map((p) => {
          const isBuy = p.verdict === 'BUY';
          const tone = isBuy ? 'border-emerald-400/60 bg-emerald-950/30' : 'border-slate-700 bg-slate-900/40';
          return (
            <div key={p.persona} className={`space-y-3 rounded-2xl border-2 p-4 ${tone}`}>
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-[9px] uppercase tracking-[0.2em] text-slate-500">Firma</div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-white">{p.name}</h2>
                </div>
                <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${isBuy ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-100' : 'border-slate-700 bg-slate-900 text-slate-400'}`}>
                  CEO: {isBuy ? 'KAUFEN' : 'WARTEN'}
                </span>
              </div>
              <p className="text-[11px] italic text-slate-400">„{p.motto}“</p>

              <details className="rounded-md border border-slate-800 bg-slate-950/40 p-2 text-[10px]">
                <summary className="cursor-pointer text-slate-300">Firmen-Manifest</summary>
                <p className="mt-1.5 leading-relaxed text-slate-400">{p.manifest}</p>
              </details>

              {p.target && (
                <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-2 text-[11px]">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-base font-bold text-white">{p.target.symbol}</span>
                    <span className="font-mono text-[10px] text-slate-500" title="Anzahl erfüllter Kriterien (Trend, RSI, MACD, Volumen, Struktur usw.) von insgesamt 12.">{p.target.passedCount} von 12 Häkchen</span>
                    {p.safety && (
                      <span className={`rounded border px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider ${p.safety.grade === 'A' ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200' : p.safety.grade === 'B' ? 'border-amber-400/50 bg-amber-500/15 text-amber-200' : 'border-rose-400/50 bg-rose-500/15 text-rose-200'}`}>
                        Note {p.safety.grade}
                      </span>
                    )}
                  </div>
                  {isBuy && (
                    <div className="mt-1 grid grid-cols-3 gap-1 font-mono text-[10px]">
                      <div><span className="text-slate-500">Entry </span><span className="text-slate-100">${fmtPrice(p.target.entry)}</span></div>
                      <div><span className="text-rose-400">Stop </span><span className="text-rose-200">${fmtPrice(p.target.stopLoss)}</span></div>
                      <div><span className="text-emerald-400">Ziel </span><span className="text-emerald-200">${fmtPrice(p.target.takeProfit1)}</span></div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-500">Team</div>
                <ul className="space-y-1.5">
                  {p.team.map((member) => (
                    <TeamRow key={member.role} report={member} />
                  ))}
                </ul>
              </div>

              <div className="space-y-1.5">
                <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-500">Interne Diskussion</div>
                <ul className="space-y-1.5 rounded-md border border-slate-800 bg-slate-950/60 p-2">
                  {buildInternalDialog(p.persona, p.name, p.team, p.verdict).map((msg, i) => (
                    <MessageRow key={`${msg.from}-${i}`} msg={msg} />
                  ))}
                </ul>
              </div>

              <p className="text-[11px] leading-relaxed text-slate-300">{p.rationale}</p>
            </div>
          );
        })}
      </section>

      <FirmaRecorder personas={personas} generatedAt={report.generatedAt} />
      <VorstandRecorder report={vorstandMediation(personas)} generatedAt={report.generatedAt} />

      {(() => {
        const memos = personas.map(generateTradeMemo).filter((m): m is NonNullable<ReturnType<typeof generateTradeMemo>> => m !== null);
        if (memos.length === 0) return null;
        return (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Trade-Memos der kaufenden Firmen</h2>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {memos.map((m) => <TradeMemoCard key={m.firma} memo={m} />)}
            </div>
          </section>
        );
      })()}

      <FirmaBacktestTable report={firmaBacktest} />
      <FirmaAccuracyPanel />
      <FirmaCoinHeatmap />
      <FirmaRankingPanel />
      <FirmaStandings />
      <VorstandLog />

      <AgentLog />

      <p className="rounded-xl border border-slate-700/60 bg-slate-950/40 p-3 text-[10px] leading-relaxed text-slate-500">
        Die Agenten „lernen“ im technischen Sinn nicht — sie folgen festen Regeln. Was wächst, ist dein persönliches Tagebuch unten: jede Tagesempfehlung wird lokal in deinem Browser gespeichert (nicht auf einem Server). So baust du über Wochen einen ehrlichen Track-Record auf, den du jederzeit prüfen kannst.
      </p>
    </main>
  );
}

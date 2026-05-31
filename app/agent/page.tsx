import Link from 'next/link';
import { cookies } from 'next/headers';
import { buildMasterSignal, TradeMode } from '@/lib/analysis/master-signal-engine';
import { getBacktestSummary } from '@/lib/analysis/backtest-summary';
import { evaluatePersonas } from '@/lib/agents/personas';
import { SubAgentReport, VoteTone } from '@/lib/agents/sub-agents';
import { AgentLog } from '@/components/agent-log';

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

export default async function AgentPage() {
  const tradeMode: TradeMode = (await cookies()).get('trade-mode')?.value === 'daytrade' ? 'daytrade' : 'swing';
  const [report, backtest] = await Promise.all([buildMasterSignal(tradeMode), getBacktestSummary()]);
  const personas = evaluatePersonas(report, backtest);

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
      </header>

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

              {p.target && (
                <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-2 text-[11px]">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-base font-bold text-white">{p.target.symbol}</span>
                    <span className="font-mono text-[10px] text-slate-500">{p.target.passedCount}/12</span>
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

              <div className="rounded-md border border-slate-800 bg-slate-950/60 p-2">
                <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-500">CEO-Schlusswort</div>
                <p className="mt-1 text-[11px] leading-snug text-slate-200">{p.ceoFinalWord}</p>
              </div>

              <p className="text-[11px] leading-relaxed text-slate-300">{p.rationale}</p>
            </div>
          );
        })}
      </section>

      <AgentLog />

      <p className="rounded-xl border border-slate-700/60 bg-slate-950/40 p-3 text-[10px] leading-relaxed text-slate-500">
        Die Agenten „lernen“ im technischen Sinn nicht — sie folgen festen Regeln. Was wächst, ist dein persönliches Tagebuch unten: jede Tagesempfehlung wird lokal in deinem Browser gespeichert (nicht auf einem Server). So baust du über Wochen einen ehrlichen Track-Record auf, den du jederzeit prüfen kannst.
      </p>
    </main>
  );
}

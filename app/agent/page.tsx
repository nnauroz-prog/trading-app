import Link from 'next/link';
import { cookies } from 'next/headers';
import { buildMasterSignal, TradeMode } from '@/lib/analysis/master-signal-engine';
import { getBacktestSummary } from '@/lib/analysis/backtest-summary';
import { evaluatePersonas } from '@/lib/agents/personas';
import { AgentLog } from '@/components/agent-log';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function fmtPrice(v: number): string {
  if (v >= 1000) return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (v >= 1) return v.toFixed(2);
  if (v >= 0.01) return v.toFixed(4);
  return v.toFixed(7);
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
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Mehrere Agenten, eine Wahrheit</h1>
        <p className="text-sm text-slate-400">
          Drei Persona-Agenten schauen sich dieselben Marktdaten an und entscheiden mit unterschiedlicher Strenge. Ehrlich gesagt: alle drei nutzen dieselbe Engine — sie unterscheiden sich nur darin, wie viel Risiko sie akzeptieren. Keiner ist „smarter als jeder Trader der Welt“. Aber zusammen geben sie dir ein Spektrum, nicht nur eine Meinung.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {personas.map((p) => {
          const isBuy = p.verdict === 'BUY';
          const tone = isBuy ? 'border-emerald-400/60 bg-emerald-950/30' : 'border-slate-700 bg-slate-900/40';
          return (
            <div key={p.persona} className={`space-y-2 rounded-2xl border-2 p-4 ${tone}`}>
              <div className="flex items-baseline justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-white">{p.name}</h2>
                <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${isBuy ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-100' : 'border-slate-700 bg-slate-900 text-slate-400'}`}>
                  {isBuy ? 'KAUFEN' : 'WARTEN'}
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

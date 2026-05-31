import Link from 'next/link';
import { AgentVerdict } from '@/lib/agents/personas';

function fmtPrice(v: number): string {
  if (v >= 1000) return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (v >= 1) return v.toFixed(2);
  if (v >= 0.01) return v.toFixed(4);
  return v.toFixed(7);
}

function gradeClasses(g: 'A' | 'B' | 'C' | 'D' | null | undefined): string {
  if (g === 'A') return 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200';
  if (g === 'B') return 'border-amber-400/50 bg-amber-500/15 text-amber-200';
  if (g === 'C' || g === 'D') return 'border-rose-400/50 bg-rose-500/15 text-rose-200';
  return 'border-slate-700 bg-slate-900 text-slate-400';
}

// Compact strip showing today's three CEO verdicts at a glance on the home page.
// Each tile links to /agent for the full team view.
export function FirmaStrip({ personas }: { personas: AgentVerdict[] }) {
  const buyCount = personas.filter((p) => p.verdict === 'BUY').length;
  return (
    <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Drei Firmen — heute
        </h2>
        <Link href="/agent" className="text-[10px] text-sky-300 hover:text-sky-200">
          Details →
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {personas.map((p) => {
          const isBuy = p.verdict === 'BUY';
          const tone = isBuy ? 'border-emerald-400/60 bg-emerald-950/30' : 'border-slate-700 bg-slate-900/60';
          return (
            <Link key={p.persona} href="/agent" className={`block space-y-1 rounded-lg border-2 p-2 transition hover:border-sky-400/60 ${tone}`}>
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white">{p.name}</span>
                <span className={`rounded border px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider ${isBuy ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-100' : 'border-slate-700 bg-slate-900 text-slate-400'}`}>
                  {isBuy ? 'KAUFEN' : 'WARTEN'}
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                {p.target ? (
                  <>
                    <span className="font-mono text-sm font-bold text-white">{p.target.symbol}</span>
                    <span className="font-mono text-[10px] text-slate-500">{p.target.passedCount}/12</span>
                    {p.safety && (
                      <span className={`rounded border px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider ${gradeClasses(p.safety.grade)}`}>
                        {p.safety.grade}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-[10px] text-slate-500">kein Setup</span>
                )}
              </div>
              {isBuy && p.target && (
                <div className="font-mono text-[9px] text-slate-500">
                  ${fmtPrice(p.target.entry)} → ${fmtPrice(p.target.takeProfit1)}
                </div>
              )}
            </Link>
          );
        })}
      </div>
      <p className="text-[10px] text-slate-500">
        {buyCount === 0 ? 'Keine Firma will heute kaufen — Konsens auf „warten".' :
         buyCount === 3 ? 'Alle drei Firmen wollen kaufen — starker Konsens.' :
         buyCount === 1 ? 'Nur eine Firma will kaufen — gemischtes Bild.' :
         'Zwei von drei Firmen wollen kaufen — solider Konsens.'}
      </p>
    </section>
  );
}

import type { TradeTier90Result } from '@/lib/agents/trade-tier-90';
import type { AgentVerdict } from '@/lib/agents/personas';
import { Tier90HeadlineStat } from '@/components/tier-90-headline-stat';

interface Props {
  result: TradeTier90Result;
  // Wenn qualifiziert: das Setup einer der drei Firmen, das wir bewerben
  showcaseVerdict?: AgentVerdict | null;
}

// Höchste Trading-Sicherheitsstufe — analog zu Sport Tier 90. Goldener
// Rahmen wenn alle 5 Säulen grün sind. Sonst klar warum nicht.
export function TradeTier90Card({ result, showcaseVerdict }: Props) {
  return (
    <section className={`space-y-3 rounded-2xl border-2 p-4 ${result.qualified ? 'border-yellow-300/60 bg-gradient-to-br from-yellow-950/30 via-slate-900/70 to-slate-900/70' : 'border-slate-800/80 bg-slate-900/40'}`}>
      <header className="space-y-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-yellow-300">⚜ Tier 90 · Trading</span>
          <span className="rounded-md border border-yellow-300/60 bg-yellow-500/15 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-yellow-100">
            Ziel-Quote ≥ 90 %
          </span>
          <Tier90HeadlineStat />
        </div>
        <h2 className="text-lg font-bold tracking-tight text-white">
          {result.qualified ? 'Höchstes Vertrauen — alle 5 Säulen grün' : `${result.pillarsHit}/${result.pillarsTotal} Säulen erfüllt`}
        </h2>
        <p className="text-[11px] leading-snug text-slate-300">
          Tier 90 verlangt: Sicherheits-Grade A · Konservativ kauft · Balanciert kauft · Aggressiv kauft · jede Firma intern &gt; 65 % Konsens. <span className="font-semibold text-amber-300">Auf das Einzelspiel ist 90 % Sicherheit nicht möglich</span> — der Filter zielt auf Trefferquote über viele Trades.
        </p>
      </header>

      <ul className="space-y-1">
        {result.pillars.map((p) => (
          <li key={p.id} className={`grid grid-cols-[auto_1fr_auto] gap-2 rounded border ${p.passed ? 'border-emerald-400/30 bg-emerald-950/15' : 'border-slate-800 bg-slate-950/40'} px-2.5 py-1.5 text-[11px]`}>
            <span className={`font-mono text-[10px] uppercase tracking-wider ${p.passed ? 'text-emerald-300' : 'text-rose-300'}`}>
              {p.passed ? '✓' : '✗'}
            </span>
            <div>
              <div className="font-semibold text-slate-200">{p.label}</div>
              <div className="text-[10px] text-slate-500">{p.detail}</div>
            </div>
            <span className={`font-mono text-[9px] uppercase tracking-wider ${p.passed ? 'text-emerald-400' : 'text-slate-500'}`}>{p.passed ? 'GREEN' : 'OFFEN'}</span>
          </li>
        ))}
      </ul>

      {result.qualified && showcaseVerdict?.target && (() => {
        const entry = showcaseVerdict.target.entry;
        const stop = showcaseVerdict.target.stopLoss;
        const tp = showcaseVerdict.target.takeProfit1;
        const riskPct = entry > 0 ? Math.abs(((entry - stop) / entry) * 100) : 0;
        const rewardPct = entry > 0 ? Math.abs(((tp - entry) / entry) * 100) : 0;
        const rr = riskPct > 0 ? rewardPct / riskPct : 0;
        return (
          <div className="space-y-1 rounded-xl border-2 border-yellow-300/60 bg-yellow-950/15 p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-yellow-300">⚜ Empfehlung: {showcaseVerdict.target.symbol}</div>
              <span className="rounded-md border border-yellow-300/40 bg-yellow-500/10 px-1.5 py-0.5 font-mono text-[10px] text-yellow-200">
                R:R 1:{rr.toFixed(1)}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
              <div><span className="text-slate-500">Einstieg </span><span className="text-yellow-100">${entry.toFixed(2)}</span></div>
              <div><span className="text-rose-400">Stop </span><span className="text-rose-200">${stop.toFixed(2)} <span className="text-rose-400/70">(-{riskPct.toFixed(1)} %)</span></span></div>
              <div><span className="text-emerald-400">Ziel </span><span className="text-emerald-200">${tp.toFixed(2)} <span className="text-emerald-400/70">(+{rewardPct.toFixed(1)} %)</span></span></div>
            </div>
            <p className="text-[10px] leading-snug text-yellow-100/80">
              Drei unabhängige Firmen + Konsensschwelle + Grade A. Position so groß, dass der Stop &lt; 1 % deines Gesamtdepots ist. Setze nur was du verlieren kannst — Restrisiko bleibt.
            </p>
          </div>
        );
      })()}

      {!result.qualified && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-950/15 p-2.5 text-[10.5px] leading-snug text-amber-100/90">
          Tier 90 nicht erreicht — genau so soll es sein wenn die Daten nicht eindeutig sind. Heute lieber abwarten. Genau diese Strenge ist der Wert.
        </p>
      )}
    </section>
  );
}

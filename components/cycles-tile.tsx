import { FundingRateSnapshot } from '@/lib/providers/funding-rates';
import { HalvingCyclePosition } from '@/lib/cycles/halving-cycle';

function phaseColor(phase: HalvingCyclePosition['phase']): { ring: string; bg: string; text: string; bar: string } {
  switch (phase) {
    case 'post-halving-rally':
      return { ring: 'border-emerald-500/40', bg: 'bg-emerald-950/15', text: 'text-emerald-300', bar: 'bg-emerald-400' };
    case 'bull-peak':
      return { ring: 'border-amber-500/40', bg: 'bg-amber-950/15', text: 'text-amber-300', bar: 'bg-amber-400' };
    case 'bear-cooldown':
      return { ring: 'border-rose-500/40', bg: 'bg-rose-950/15', text: 'text-rose-300', bar: 'bg-rose-400' };
    case 'pre-halving-accumulation':
      return { ring: 'border-sky-500/40', bg: 'bg-sky-950/15', text: 'text-sky-300', bar: 'bg-sky-400' };
  }
}

function fundingColor(annualizedPct: number): string {
  if (annualizedPct > 30) return 'text-rose-300';
  if (annualizedPct > 10) return 'text-amber-300';
  if (annualizedPct > -10) return 'text-slate-300';
  return 'text-emerald-300';
}

function fundingInterpretation(rate: number): string {
  if (rate > 30) return 'Overheating — Longs zahlen viel, Markt euphorisch, Liquidation-Cascade-Risiko bei Korrektur.';
  if (rate > 10) return 'Bullish bias — Longs dominieren leicht, neutral bis leicht überhitzt.';
  if (rate > -10) return 'Neutral — Funding nahe Null, kein Sentiment-Extrem in Perpetuals.';
  return 'Bearish bias — Shorts zahlen Premium, oft Kontra-Indikator (Short-Squeeze möglich).';
}

export function CyclesTile({
  halving,
  fundingBtc,
  fundingEth
}: {
  halving: HalvingCyclePosition;
  fundingBtc: FundingRateSnapshot | null;
  fundingEth: FundingRateSnapshot | null;
}) {
  const phase = phaseColor(halving.phase);
  return (
    <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Macro Cycles</h2>
        <span className="font-mono text-[10px] text-slate-600">echte Zyklen · keine Folklore</span>
      </div>

      <div className={`rounded-xl border ${phase.ring} ${phase.bg} p-4`}>
        <div className="flex items-baseline justify-between">
          <span className="text-[10px] uppercase tracking-widest text-slate-400">BTC-Halving-Cycle</span>
          <span className={`text-[10px] font-bold uppercase tracking-wider ${phase.text}`}>{halving.phaseLabel}</span>
        </div>
        <div className="mt-2 flex items-baseline gap-3">
          <span className="font-mono text-2xl font-bold text-white">Tag {halving.daysSinceLastHalving}</span>
          <span className="font-mono text-xs text-slate-500">seit {halving.lastHalvingEvent} ({halving.lastHalvingDate})</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-950">
          <div className={`h-full ${phase.bar}`} style={{ width: `${halving.cyclePct}%` }} />
        </div>
        <div className="mt-1 flex justify-between font-mono text-[10px] text-slate-500">
          <span>0 (Halving)</span>
          <span>Nächstes Halving ~{halving.nextEstimatedHalvingDate} ({halving.daysUntilNextHalving} Tage)</span>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-300">{halving.phaseDescription}</p>
        <p className="mt-1 text-[10px] leading-relaxed text-slate-500 italic">{halving.historicalContext}</p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {fundingBtc && (
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
            <div className="text-[10px] uppercase tracking-widest text-slate-400">BTC Funding (Bybit Perp)</div>
            <div className={`mt-1 font-mono text-lg font-bold ${fundingColor(fundingBtc.fundingRateAnnualizedPct)}`}>
              {fundingBtc.fundingRateAnnualizedPct >= 0 ? '+' : ''}{fundingBtc.fundingRateAnnualizedPct.toFixed(1)}% APR
            </div>
            <div className="font-mono text-[10px] text-slate-500">
              Per Funding-Period: {(fundingBtc.fundingRate * 100).toFixed(4)}%
            </div>
            <p className="mt-1 text-[10px] leading-relaxed text-slate-400">{fundingInterpretation(fundingBtc.fundingRateAnnualizedPct)}</p>
          </div>
        )}
        {fundingEth && (
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
            <div className="text-[10px] uppercase tracking-widest text-slate-400">ETH Funding (Bybit Perp)</div>
            <div className={`mt-1 font-mono text-lg font-bold ${fundingColor(fundingEth.fundingRateAnnualizedPct)}`}>
              {fundingEth.fundingRateAnnualizedPct >= 0 ? '+' : ''}{fundingEth.fundingRateAnnualizedPct.toFixed(1)}% APR
            </div>
            <div className="font-mono text-[10px] text-slate-500">
              Per Funding-Period: {(fundingEth.fundingRate * 100).toFixed(4)}%
            </div>
            <p className="mt-1 text-[10px] leading-relaxed text-slate-400">{fundingInterpretation(fundingEth.fundingRateAnnualizedPct)}</p>
          </div>
        )}
      </div>
    </section>
  );
}

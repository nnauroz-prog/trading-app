import { CommandCenterReport, MarketMode, BestAssetClass } from '@/lib/command-center';

function modeClasses(mode: MarketMode): string {
  if (mode === 'risk-on') return 'border-emerald-400/50 bg-emerald-500/15 text-emerald-100';
  if (mode === 'risk-off') return 'border-rose-400/50 bg-rose-500/15 text-rose-100';
  return 'border-slate-700 bg-slate-900 text-slate-200';
}

function modeLabel(mode: MarketMode): string {
  if (mode === 'risk-on') return 'Risk-On';
  if (mode === 'risk-off') return 'Risk-Off';
  return 'Neutral';
}

function assetLabel(klass: BestAssetClass): string {
  if (klass === 'crypto') return 'Krypto';
  if (klass === 'stocks') return 'Aktien';
  if (klass === 'gold') return 'Gold';
  return 'Cash halten';
}

function assetClasses(klass: BestAssetClass): string {
  if (klass === 'crypto') return 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200';
  if (klass === 'stocks') return 'border-sky-400/40 bg-sky-500/10 text-sky-200';
  if (klass === 'gold') return 'border-amber-400/40 bg-amber-500/10 text-amber-200';
  return 'border-slate-700 bg-slate-900 text-slate-300';
}

export function DailyCommandCenter({ report }: { report: CommandCenterReport }) {
  return (
    <section className="space-y-3 rounded-2xl border-2 border-slate-700 bg-gradient-to-br from-slate-950 to-slate-900/60 p-5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Heute wichtig</span>
        <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${modeClasses(report.marketMode)}`}>
          Markt: {modeLabel(report.marketMode)}
        </span>
      </div>
      <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">{report.decisionLabel}</h1>
      <div className="flex flex-wrap items-baseline gap-2 text-[11px]">
        <span className="text-slate-500">Beste Asset-Klasse heute:</span>
        <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${assetClasses(report.bestAssetClass)}`}>
          {assetLabel(report.bestAssetClass)}
        </span>
      </div>
      <p className="text-[13px] leading-relaxed text-slate-200">{report.reason}</p>
    </section>
  );
}

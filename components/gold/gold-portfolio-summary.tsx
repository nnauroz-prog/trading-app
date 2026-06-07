// Aggregat-Karte: gesamter Bestand, Summe, blended cost, Steuer-Status.
// Presentational — bekommt fertige Summary als Prop.

import type { PortfolioSummary } from '@/lib/gold/gold-portfolio-aggregator';

function fmtUsd(value: number | null, opts: { withSign?: boolean } = {}): string {
  if (value === null || !Number.isFinite(value)) return '—';
  const sign = opts.withSign && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} $`;
}

function fmtPct(value: number | null, opts: { withSign?: boolean } = {}): string {
  if (value === null || !Number.isFinite(value)) return '—';
  const sign = opts.withSign && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)} %`;
}

function fmtGrams(value: number): string {
  return `${value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} g`;
}

function fmtOunces(value: number): string {
  return `${value.toFixed(3)} oz`;
}

export function GoldPortfolioSummary({ summary }: { summary: PortfolioSummary }) {
  if (summary.positions.length === 0) return null;
  const pnlTone = summary.totalAbsolutePnL >= 0 ? 'good' : 'bad';
  return (
    <section className="space-y-3 rounded-2xl border border-amber-400/40 bg-amber-950/15 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">
          🟡 Gold-Portfolio · {summary.positions.length} Position{summary.positions.length === 1 ? '' : 'en'}
        </h3>
        {summary.taxFreeCount > 0 && (
          <span className="rounded border border-emerald-400/50 bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-200">
            {summary.taxFreeCount}× steuerfrei
          </span>
        )}
      </div>
      <p className="text-[10.5px] leading-snug text-amber-100/80">
        Aggregat über alle gespeicherten Käufe. Beträge in USD, Steuer-Status nach §23 EStG (Spekulationsfrist 365 Tage).
        {summary.incompleteCount > 0 && (
          <> {summary.incompleteCount} Position{summary.incompleteCount === 1 ? ' ist' : 'en sind'} unvollständig — bitte Kaufpreis ergänzen.</>
        )}
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Tile label="Feingold gesamt" value={fmtGrams(summary.totalPureGoldGrams)} sub={fmtOunces(summary.totalPureGoldOunces)} />
        <Tile label="Einstand gesamt" value={fmtUsd(summary.totalPurchaseValue)} sub={summary.blendedCostPerOz !== null ? `${fmtUsd(summary.blendedCostPerOz)} / oz blended` : undefined} />
        <Tile label="Aktueller Wert" value={fmtUsd(summary.totalCurrentValue)} />
        <Tile
          label="Gewinn / Verlust"
          value={fmtUsd(summary.totalAbsolutePnL, { withSign: true })}
          sub={fmtPct(summary.totalPercentPnL, { withSign: true })}
          tone={pnlTone}
        />
      </div>
    </section>
  );
}

function Tile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'good' | 'bad' | 'neutral' }) {
  const cls = tone === 'good' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
    : tone === 'bad' ? 'border-rose-500/30 bg-rose-500/10 text-rose-200'
    : 'border-slate-700 bg-slate-950/40 text-slate-100';
  return (
    <div className={`rounded-lg border p-2 ${cls}`}>
      <div className="text-[9px] uppercase tracking-wider opacity-80">{label}</div>
      <div className="mt-0.5 font-mono text-sm font-bold">{value}</div>
      {sub && <div className="mt-0.5 text-[9.5px] opacity-70">{sub}</div>}
    </div>
  );
}

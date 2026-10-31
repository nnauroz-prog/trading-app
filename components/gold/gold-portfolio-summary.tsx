// Aggregat-Karte: gesamter Bestand, Summe, blended cost, Steuer-Status.
// Presentational — bekommt fertige Summary als Prop.

import type { PortfolioSummary } from '@/lib/gold/gold-portfolio-aggregator';

function fmtUsd(value: number | null, opts: { withSign?: boolean } = {}): string {
  if (value === null || !Number.isFinite(value)) return '—';
  const sign = opts.withSign && value > 0 ? '+' : '';
  return `${sign}${value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`;
}

function fmtPct(value: number | null, opts: { withSign?: boolean } = {}): string {
  if (value === null || !Number.isFinite(value)) return '—';
  const sign = opts.withSign && value > 0 ? '+' : '';
  return `${sign}${value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;
}

function fmtGrams(value: number): string {
  return `${value.toLocaleString('de-DE', { maximumFractionDigits: 2 })} g`;
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
        <h3 className="text-base font-semibold text-amber-300">
          Dein Gold zusammen · {summary.positions.length} {summary.positions.length === 1 ? 'Kauf' : 'Käufe'}
        </h3>
        {summary.taxFreeCount > 0 && (
          <span className="rounded border border-emerald-400/50 bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-200">
            {summary.taxFreeCount} seit mindestens 1 Jahr
          </span>
        )}
      </div>
      <p className="text-sm leading-relaxed text-amber-100/80">
        Hier siehst du den gemeinsamen Wert deiner gespeicherten Goldkäufe in US-Dollar ($).
        {summary.incompleteCount > 0 && (
          <> Für {summary.incompleteCount} {summary.incompleteCount === 1 ? 'Kauf fehlt' : 'Käufe fehlen'} noch Preise. Ergänze sie, damit die Gesamtsumme vollständig ist.</>
        )}
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Tile label="Reines Gold zusammen" value={fmtGrams(summary.totalPureGoldGrams)} sub={fmtOunces(summary.totalPureGoldOunces)} />
        <Tile label="Was du insgesamt bezahlt hast" value={fmtUsd(summary.totalPurchaseValue)} sub={summary.blendedCostPerOz !== null ? `${fmtUsd(summary.blendedCostPerOz)} durchschnittlich pro Feinunze` : undefined} />
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
      <div className="text-xs leading-relaxed opacity-80">{label}</div>
      <div className="mt-0.5 font-mono text-sm font-bold">{value}</div>
      {sub && <div className="mt-0.5 text-xs leading-relaxed opacity-70">{sub}</div>}
    </div>
  );
}

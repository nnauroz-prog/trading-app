// Relative Stärke gegen den richtigen Benchmark-Index. Pro Periode (1M / 3M / 1J)
// die Performance dieser Aktie vs. der eines Index. Hilft zu sehen, ob die
// Aktie nur dem Markt folgt oder ihn schlägt.

interface PerfPoint {
  label: string;
  stockPct: number | null;
  indexPct: number | null;
}

export function RelativeStrengthCard({ stockName, indexName, points }: {
  stockName: string;
  indexName: string;
  points: PerfPoint[];
}) {
  const validPoints = points.filter((p) => p.stockPct !== null && p.indexPct !== null);
  if (validPoints.length === 0) return null;

  return (
    <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Relative Stärke vs. {indexName}</h2>
        <p className="mt-1 text-[10.5px] leading-snug text-slate-500">
          {stockName} vs. Benchmark — schlägt die Aktie ihren Markt? Positive Differenz = Outperformance,
          negative = die Aktie zieht den Markt nur mit.
        </p>
      </div>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {validPoints.map((p) => {
          const diff = (p.stockPct ?? 0) - (p.indexPct ?? 0);
          return (
            <li key={p.label} className="rounded-lg border border-slate-800 bg-slate-950/40 p-2">
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] uppercase tracking-wider text-slate-500">{p.label}</span>
                <span className={`font-mono text-[10.5px] font-bold ${diff >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {diff >= 0 ? '+' : ''}{diff.toFixed(1)} %
                </span>
              </div>
              <div className="mt-1 flex items-baseline justify-between text-[10px] text-slate-400">
                <span>{stockName}: <span className={`font-mono ${(p.stockPct ?? 0) >= 0 ? 'text-emerald-200' : 'text-rose-200'}`}>{(p.stockPct ?? 0) >= 0 ? '+' : ''}{(p.stockPct ?? 0).toFixed(1)} %</span></span>
                <span>{indexName}: <span className={`font-mono ${(p.indexPct ?? 0) >= 0 ? 'text-emerald-200' : 'text-rose-200'}`}>{(p.indexPct ?? 0) >= 0 ? '+' : ''}{(p.indexPct ?? 0).toFixed(1)} %</span></span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

import { CrossExchangeReport } from '@/lib/analysis/cross-exchange-check';

export function CrossExchangeWarning({ report }: { report: CrossExchangeReport }) {
  // Stay silent if everything is fine — no noise.
  if (report.findings.length === 0) return null;

  const isSuspicious = report.suspiciousCount > 0;
  return (
    <section className={`space-y-2 rounded-2xl border-2 p-4 ${isSuspicious ? 'border-rose-400/60 bg-rose-950/30' : 'border-amber-400/50 bg-amber-950/20'}`}>
      <div className="flex items-baseline justify-between">
        <h2 className={`text-xs font-bold uppercase tracking-wider ${isSuspicious ? 'text-rose-200' : 'text-amber-200'}`}>
          {isSuspicious ? 'Preis-Quellen widersprechen sich' : 'Leichte Preis-Abweichung'}
        </h2>
        <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${isSuspicious ? 'border-rose-400/50 bg-rose-500/15 text-rose-100' : 'border-amber-400/50 bg-amber-500/15 text-amber-100'}`}>
          {report.findings.length} Coin{report.findings.length === 1 ? '' : 's'}
        </span>
      </div>
      <p className={`text-[11px] ${isSuspicious ? 'text-rose-100/80' : 'text-amber-100/80'}`}>{report.summary}</p>
      <ul className="space-y-1">
        {report.findings.slice(0, 5).map((f) => (
          <li key={f.symbol} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 rounded-md border border-slate-800 bg-slate-950/40 px-2 py-1.5 text-[11px]">
            <span className="font-mono font-bold text-white">{f.symbol.replace('USDT', '')}</span>
            <span className="text-[10px] text-slate-500">Binance ${f.binancePrice.toFixed(f.binancePrice >= 1000 ? 0 : f.binancePrice >= 1 ? 2 : 4)}</span>
            <span className="text-[10px] text-slate-500">Bybit ${f.bybitPrice.toFixed(f.bybitPrice >= 1000 ? 0 : f.bybitPrice >= 1 ? 2 : 4)}</span>
            <span className={`font-mono text-[10px] font-bold ${f.severity === 'verdächtig' ? 'text-rose-300' : 'text-amber-300'}`}>
              {f.divergencePct >= 0 ? '+' : ''}{f.divergencePct.toFixed(2)}%
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

import { FirmaBacktestReport } from '@/lib/agents/firma-backtest';
import { FIRMA_STRATEGY_PARAMS } from '@/lib/agents/firma-params';

export function FirmaBacktestTable({ report }: { report: FirmaBacktestReport }) {
  if (report.rows.length === 0) return null;
  const best = report.rows.reduce((a, b) => a.netReturnPct > b.netReturnPct ? a : b);
  return (
    <section className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Firmen-Backtest</h2>
        <p className="mt-1 text-[11px] text-slate-500">
          Jede Firma trägt ihre eigenen Strategie-Vorlieben in den Backtest: Konservativ enge Stops + lange Gewinnläufe, Balanciert die Mitte, Aggressiv niedrige Schwelle + nähere Ziele. Zeigt was jede Firma in den letzten {report.rows[0]?.periodDays ?? 0} Tagen mit BTC/ETH/SOL <span className="text-amber-400/80">simuliert</span> verdient hätte.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead className="border-b border-slate-800 text-[9px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-2 py-1.5 text-left">Firma</th>
              <th className="px-2 py-1.5 text-left">Mindest-Häkchen</th>
              <th className="px-2 py-1.5 text-left">Stop / Ziel</th>
              <th className="px-2 py-1.5 text-right">Trades</th>
              <th className="px-2 py-1.5 text-right">Treffer</th>
              <th className="px-2 py-1.5 text-right">Netto</th>
              <th className="px-2 py-1.5 text-right">Erwartung pro Trade</th>
            </tr>
          </thead>
          <tbody>
            {report.rows.map((r) => {
              const p = FIRMA_STRATEGY_PARAMS[r.firma];
              const isBest = r === best;
              const rowCls = isBest ? 'bg-emerald-950/20' : '';
              return (
                <tr key={r.firma} className={`border-b border-slate-900 last:border-b-0 ${rowCls}`}>
                  <td className="px-2 py-1.5 font-semibold text-white">
                    {r.firmaName}
                    {isBest && <span className="ml-1 text-[9px] text-emerald-300">★</span>}
                  </td>
                  <td className="px-2 py-1.5 font-mono text-slate-300">{p.minConfluence}/12</td>
                  <td className="px-2 py-1.5 font-mono text-slate-400">{p.stopAtrMult.toFixed(1)}× / {p.tp1AtrMult.toFixed(1)}× ATR</td>
                  <td className="px-2 py-1.5 text-right font-mono text-slate-300">{r.trades}</td>
                  <td className="px-2 py-1.5 text-right font-mono text-slate-300">{r.winRatePct !== null ? `${r.winRatePct.toFixed(0)}%` : '—'}</td>
                  <td className={`px-2 py-1.5 text-right font-mono ${r.netReturnPct >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {r.netReturnPct >= 0 ? '+' : ''}{r.netReturnPct.toFixed(1)}%
                  </td>
                  <td className={`px-2 py-1.5 text-right font-mono ${r.expectancyPct >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {r.expectancyPct >= 0 ? '+' : ''}{r.expectancyPct.toFixed(2)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] italic leading-relaxed text-slate-500">
        Simuliert auf der gleichen Engine, nur mit Firma-spezifischen Parametern. Vergangenheit ≠ Zukunft, und keine Trading-Gebühren über den Standard-0.1% hinaus. Wer in den letzten {report.rows[0]?.periodDays ?? 0} Tagen besser lag, ist nicht zwangsläufig morgen besser.
      </p>
    </section>
  );
}

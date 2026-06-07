// Beweist die Aktien-Safety-Strategie auf historischen Tageskerzen. Zeigt:
// - Gesamtzahl der Grade-A-Phasen über 1 Jahr quer durch alle Aktien
// - Trefferquote (% Trades mit positivem Exit)
// - Mittlerer PnL pro Trade
// - Vergleich gegen Buy-and-Hold
// - Top-Performer und Verlierer
// Aufrichtig: zeigt offen, ob die Strategie 1J-Buy-and-Hold geschlagen hat.

import type { SafetyBacktestSummary } from '@/lib/market/stock-safety-backtest-scan';

export function StockSafetyBacktestCard({ summary }: { summary: SafetyBacktestSummary }) {
  if (!summary.available) {
    return (
      <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Funktioniert die Aktien-Strategie? — Backtest</h2>
        <p className="text-xs text-slate-500">Backtest wird berechnet … (gleich verfügbar).</p>
      </section>
    );
  }

  const beatBnH = summary.combinedAvgPnlPct > summary.combinedBuyAndHoldPct / Math.max(1, summary.totalAssetsScanned);
  const positive = summary.combinedAvgPnlPct >= 0;

  return (
    <section className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          🧪 Backtest des Aktien-Sicherheits-Gates (12 Monate)
        </h2>
        <p className="text-[10.5px] leading-snug text-slate-500">
          Echte Tageskerzen, walk-forward: an jedem Tag das 8-Punkt-Gate ausgewertet, bei Grade A Einstieg simuliert,
          beim Verlust von Grade A wieder Exit. {summary.totalAssetsScanned} Aktien geprüft.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Stat label="Trades" value={summary.totalTrades.toString()} tone="neutral" />
        <Stat
          label="Treffer"
          value={summary.combinedWinRatePct !== null ? `${summary.combinedWinRatePct} %` : '—'}
          tone={summary.combinedWinRatePct !== null && summary.combinedWinRatePct >= 55 ? 'good' : 'neutral'}
        />
        <Stat
          label="Ø PnL/Trade"
          value={`${summary.combinedAvgPnlPct >= 0 ? '+' : ''}${summary.combinedAvgPnlPct.toFixed(2)} %`}
          tone={positive ? 'good' : 'bad'}
        />
        <Stat
          label="Buy-and-Hold ⌀"
          value={`${summary.combinedBuyAndHoldPct >= 0 ? '+' : ''}${summary.combinedBuyAndHoldPct.toFixed(1)} %`}
          tone="neutral"
        />
        <Stat
          label="vs. BnH"
          value={beatBnH ? 'geschlagen' : 'underperformed'}
          tone={beatBnH ? 'good' : 'bad'}
        />
      </div>
      {(summary.bestTradePct !== null || summary.worstTradePct !== null) && (
        <div className="grid grid-cols-2 gap-2">
          {summary.bestTradePct !== null && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/10 p-2">
              <div className="text-[9px] uppercase tracking-wider text-emerald-300">Bester Trade</div>
              <div className="font-mono text-base font-bold text-emerald-200">+{summary.bestTradePct.toFixed(2)} %</div>
            </div>
          )}
          {summary.worstTradePct !== null && (
            <div className="rounded-lg border border-rose-500/20 bg-rose-950/10 p-2">
              <div className="text-[9px] uppercase tracking-wider text-rose-300">Schlechtester Trade</div>
              <div className="font-mono text-base font-bold text-rose-200">{summary.worstTradePct.toFixed(2)} %</div>
            </div>
          )}
        </div>
      )}

      {summary.perAsset.length > 0 && (
        <details className="rounded-lg border border-slate-800 bg-slate-950/40">
          <summary className="cursor-pointer p-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200">
            ▸ Performance pro Aktie ({summary.perAsset.length})
          </summary>
          <div className="overflow-x-auto p-2.5 pt-0">
            <table className="w-full text-[10.5px]">
              <thead>
                <tr className="text-[9px] uppercase tracking-wider text-slate-500">
                  <th className="py-1 text-left">Symbol</th>
                  <th className="py-1 text-left">Name</th>
                  <th className="py-1 text-right">Trades</th>
                  <th className="py-1 text-right">Treffer</th>
                  <th className="py-1 text-right">Ø PnL</th>
                  <th className="py-1 text-right">Summe</th>
                  <th className="py-1 text-right">BnH</th>
                </tr>
              </thead>
              <tbody>
                {summary.perAsset.map((a) => (
                  <tr key={a.symbol} className="border-t border-slate-800/60">
                    <td className="py-1 font-mono text-[10px] text-slate-400">{a.symbol}</td>
                    <td className="py-1 truncate text-slate-200">{a.name}</td>
                    <td className="py-1 text-right font-mono text-slate-300">{a.totalTrades}</td>
                    <td className="py-1 text-right font-mono text-slate-300">
                      {a.winRatePct !== null ? `${a.winRatePct} %` : '—'}
                    </td>
                    <td className={`py-1 text-right font-mono ${a.avgPnlPct >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {a.avgPnlPct >= 0 ? '+' : ''}{a.avgPnlPct.toFixed(2)} %
                    </td>
                    <td className={`py-1 text-right font-mono ${a.totalReturnPct >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {a.totalReturnPct >= 0 ? '+' : ''}{a.totalReturnPct.toFixed(1)} %
                    </td>
                    <td className={`py-1 text-right font-mono ${a.buyAndHoldReturnPct >= 0 ? 'text-emerald-200' : 'text-rose-200'}`}>
                      {a.buyAndHoldReturnPct >= 0 ? '+' : ''}{a.buyAndHoldReturnPct.toFixed(1)} %
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
      <p className="text-[10px] leading-snug text-slate-500">
        Vergangenheit ≠ Zukunft. Backtest ohne Gebühren/Slippage; reale Trades wären etwas schlechter. Strategie schlägt nicht jedes Mal Buy-and-Hold — wichtig ist die Risiko-Adjustierung (Cash zwischen Grade-A-Phasen ist nicht im Markt).
      </p>
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: 'good' | 'bad' | 'neutral' }) {
  const cls = tone === 'good' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
    : tone === 'bad' ? 'border-rose-500/30 bg-rose-500/10 text-rose-200'
    : 'border-slate-700 bg-slate-950/40 text-slate-200';
  return (
    <div className={`rounded-lg border p-2 ${cls}`}>
      <div className="text-[9px] uppercase tracking-wider opacity-80">{label}</div>
      <div className="mt-0.5 font-mono text-sm font-bold">{value}</div>
    </div>
  );
}

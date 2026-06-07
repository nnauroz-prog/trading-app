// Kompakte Backtest-Karte pro Einzel-Asset (eine Aktie, ein Rohstoff). Zeigt
// die Performance der „Grade A → Einstieg / Grade B-C → Exit"-Strategie über
// die letzten 12 Monate, plus Buy-and-Hold-Vergleich.

import type { SafetyBacktestResult } from '@/lib/market/instrument-safety-backtest';

export function InstrumentSafetyBacktestMini({ result, name }: { result: SafetyBacktestResult; name: string }) {
  if (result.totalTrades === 0) {
    return (
      <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Backtest · {name}</h2>
        <p className="text-[11px] leading-snug text-slate-500">
          In den letzten 12 Monaten hat {name} nie Grade A erreicht. Das Sicherheits-Gate hätte hier nicht einsteigen lassen —
          gut, denn Buy-and-Hold lag bei{' '}
          <span className={`font-mono font-bold ${result.buyAndHoldReturnPct >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
            {result.buyAndHoldReturnPct >= 0 ? '+' : ''}{result.buyAndHoldReturnPct.toFixed(1)} %
          </span>.
        </p>
      </section>
    );
  }

  const beatBnH = result.totalReturnPct > result.buyAndHoldReturnPct;
  const positiveStrategy = result.totalReturnPct >= 0;

  return (
    <section className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">🧪 Backtest · {name}</h2>
        <p className="text-[10.5px] leading-snug text-slate-500">
          Walk-forward auf den letzten 252 Handelstagen — bei Grade A virtuell gekauft, bei Verlust wieder ausgestiegen.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Stat label="Trades" value={result.totalTrades.toString()} tone="neutral" />
        <Stat
          label="Treffer"
          value={result.winRatePct !== null ? `${result.winRatePct} %` : '—'}
          tone={result.winRatePct !== null && result.winRatePct >= 55 ? 'good' : 'neutral'}
        />
        <Stat
          label="Ø PnL/Trade"
          value={`${result.avgPnlPct >= 0 ? '+' : ''}${result.avgPnlPct.toFixed(2)} %`}
          tone={result.avgPnlPct >= 0 ? 'good' : 'bad'}
        />
        <Stat
          label="Summe"
          value={`${positiveStrategy ? '+' : ''}${result.totalReturnPct.toFixed(1)} %`}
          tone={positiveStrategy ? 'good' : 'bad'}
        />
        <Stat
          label="vs. Buy-and-Hold"
          value={`${beatBnH ? '+' : ''}${(result.totalReturnPct - result.buyAndHoldReturnPct).toFixed(1)} %`}
          tone={beatBnH ? 'good' : 'bad'}
        />
      </div>
      {result.medianHoldDays !== null && (
        <p className="text-[10px] leading-snug text-slate-500">
          Mittlere Haltedauer ≈ <span className="font-mono font-bold text-slate-300">{result.medianHoldDays} Tage</span>.
          {result.bestTradePct !== null && result.worstTradePct !== null && (
            <>
              {' '}Bester Trade: <span className="font-mono text-emerald-300">+{result.bestTradePct.toFixed(2)} %</span>,
              schlechtester: <span className="font-mono text-rose-300">{result.worstTradePct.toFixed(2)} %</span>.
            </>
          )}
        </p>
      )}
      <p className="text-[10px] leading-snug text-slate-500">
        Vergangenheit ≠ Zukunft. Backtest ohne Gebühren/Slippage — reale Trades wären etwas schlechter.
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

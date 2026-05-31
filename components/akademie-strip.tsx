import Link from 'next/link';
import { CoinSentiment, SpaeherReport } from '@/lib/akademie/spaeher';
import { LehrlingReport } from '@/lib/akademie/lehrling';

function tiltClasses(t: CoinSentiment['tilt']): string {
  if (t === 'bullisch') return 'border-emerald-400/50 bg-emerald-500/10 text-emerald-200';
  if (t === 'bärisch') return 'border-rose-400/50 bg-rose-500/10 text-rose-200';
  return 'border-slate-700 bg-slate-900 text-slate-300';
}

export function AkademieStrip({ spaeher, lehrling }: { spaeher: SpaeherReport; lehrling: LehrlingReport }) {
  const topCoins = spaeher.perCoin.slice(0, 5);
  const lehrlingDelta = lehrling.best && lehrling.baseline ? lehrling.best.netReturnPct - lehrling.baseline.netReturnPct : 0;
  return (
    <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Akademie — kompakt</h2>
        <Link href="/akademie" className="text-[10px] text-sky-300 hover:text-sky-200">
          Details →
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-2">
          <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-500">Späher heute</div>
          {spaeher.topPick ? (
            <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-slate-200">
              „{spaeher.topPick.title}“
            </p>
          ) : (
            <p className="mt-1 text-[11px] text-slate-500">Keine Headlines verfügbar.</p>
          )}
          {topCoins.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {topCoins.map((c) => (
                <span key={c.coin} className={`rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${tiltClasses(c.tilt)}`}>
                  {c.coin} {c.tilt === 'bullisch' ? '↑' : c.tilt === 'bärisch' ? '↓' : '·'} {c.bullishCount}/{c.bearishCount}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-2">
          <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-500">Lehrling-Empfehlung</div>
          {lehrling.best ? (
            <>
              <div className="mt-1 font-mono text-[11px] text-slate-200">
                Konfluenz {lehrling.best.params.minConfluence} · Stop {lehrling.best.params.stopAtrMult.toFixed(1)}×ATR · Ziel {lehrling.best.params.tp1AtrMult.toFixed(1)}×ATR
              </div>
              <div className="mt-1 flex items-baseline gap-2 text-[10px]">
                <span className="text-slate-500">Backtest:</span>
                <span className={`font-mono ${lehrling.best.netReturnPct >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {lehrling.best.netReturnPct >= 0 ? '+' : ''}{lehrling.best.netReturnPct.toFixed(1)}%
                </span>
                <span className="text-slate-500">·</span>
                <span className="font-mono text-slate-300">{lehrling.best.winRatePct.toFixed(0)}% Treffer</span>
                {lehrlingDelta !== 0 && lehrling.best.id !== lehrling.baseline?.id && (
                  <span className="font-mono text-emerald-300">+{lehrlingDelta.toFixed(1)}%-P vs aktiv</span>
                )}
              </div>
            </>
          ) : (
            <p className="mt-1 text-[11px] text-slate-500">Backtest offline.</p>
          )}
        </div>
      </div>
    </section>
  );
}

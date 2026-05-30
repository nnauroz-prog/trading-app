import Link from 'next/link';
import { getBacktestSummary, SafeTradeRecord } from '@/lib/analysis/backtest-summary';

export const dynamic = 'force-dynamic';
export const revalidate = 1800;

function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'Europe/Berlin' });
}

function fmtPrice(v: number): string {
  if (v >= 1000) return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (v >= 1) return v.toFixed(2);
  if (v >= 0.01) return v.toFixed(4);
  return v.toFixed(6);
}

function outcomeBadge(o: SafeTradeRecord['outcome']) {
  if (o === 'TP1') return <span className="rounded border border-emerald-400/50 bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-200">Gewinn</span>;
  if (o === 'SL') return <span className="rounded border border-rose-500/50 bg-rose-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-200">Stop</span>;
  return <span className="rounded border border-amber-400/50 bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-200">Timeout</span>;
}

export default async function StrategiePage({ searchParams }: { searchParams: Promise<{ coin?: string; sort?: string }> }) {
  const sp = await searchParams;
  const summary = await getBacktestSummary();
  const filterCoin = (sp.coin ?? 'all').toLowerCase();
  const sortKey = sp.sort ?? 'date-desc';

  let trades = summary.safeTrades;
  if (filterCoin !== 'all') trades = trades.filter((t) => t.assetId === filterCoin);

  const sorted = [...trades];
  if (sortKey === 'date-desc') sorted.sort((a, b) => b.entryTime - a.entryTime);
  else if (sortKey === 'date-asc') sorted.sort((a, b) => a.entryTime - b.entryTime);
  else if (sortKey === 'pnl-desc') sorted.sort((a, b) => b.netPnlPct - a.netPnlPct);
  else if (sortKey === 'pnl-asc') sorted.sort((a, b) => a.netPnlPct - b.netPnlPct);

  const wins = sorted.filter((t) => t.outcome === 'TP1').length;
  const winRate = sorted.length > 0 ? Math.round((wins / sorted.length) * 100) : null;
  const net = sorted.reduce((s, t) => s + t.netPnlPct, 0);

  const coins = ['all', 'btc', 'eth', 'sol'];

  return (
    <main className="mx-auto max-w-5xl space-y-5 p-4 md:p-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-emerald-300">
        ← zurück zum Signal Desk
      </Link>

      <header className="space-y-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400">Strategie · Detail</div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Alle sicheren Trades (Backtest)</h1>
        <p className="text-sm text-slate-400">
          Jeder einzelne Trade der strengen Stufe (≥9/12 Konfluenz) der letzten {summary.periodDays} Tage — echte historische Kerzen, Gebühren abgezogen, keine Slippage. Vergangenheit ≠ Zukunft.
        </p>
      </header>

      {!summary.available && (
        <p className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-400">Backtest-Daten werden geladen …</p>
      )}

      {summary.available && (
        <>
          <section className="grid grid-cols-3 gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 text-center">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Trades</div>
              <div className="font-mono text-xl font-bold text-slate-100">{sorted.length}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Trefferquote</div>
              <div className="font-mono text-xl font-bold text-emerald-200">{winRate !== null ? `${winRate}%` : '—'}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Netto</div>
              <div className={`font-mono text-xl font-bold ${net >= 0 ? 'text-emerald-200' : 'text-rose-300'}`}>{net >= 0 ? '+' : ''}{net.toFixed(1)}%</div>
            </div>
          </section>

          <section className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="text-slate-400">Coin:</span>
            {coins.map((c) => (
              <Link
                key={c}
                href={`/strategie?coin=${c}&sort=${sortKey}`}
                className={`rounded-md border px-2 py-1 font-mono uppercase tracking-wider transition ${filterCoin === c ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200' : 'border-slate-700 bg-slate-900/60 text-slate-400 hover:border-slate-600 hover:text-slate-200'}`}
              >
                {c === 'all' ? 'Alle' : c.toUpperCase()}
              </Link>
            ))}
            <span className="ml-3 text-slate-400">Sort:</span>
            {([
              { k: 'date-desc', label: 'Neueste' },
              { k: 'date-asc', label: 'Älteste' },
              { k: 'pnl-desc', label: 'Beste' },
              { k: 'pnl-asc', label: 'Schlechteste' }
            ] as const).map((s) => (
              <Link
                key={s.k}
                href={`/strategie?coin=${filterCoin}&sort=${s.k}`}
                className={`rounded-md border px-2 py-1 transition ${sortKey === s.k ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200' : 'border-slate-700 bg-slate-900/60 text-slate-400 hover:border-slate-600 hover:text-slate-200'}`}
              >
                {s.label}
              </Link>
            ))}
          </section>

          {sorted.length === 0 ? (
            <p className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-400">Keine Trades unter diesem Filter.</p>
          ) : (
            <section className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/40">
              <ul className="divide-y divide-slate-800">
                {sorted.map((t) => {
                  const pnlColor = t.netPnlPct >= 0 ? 'text-emerald-300' : 'text-rose-300';
                  return (
                    <li key={`${t.assetId}-${t.entryTime}`} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-2.5">
                      <span className="font-mono text-[10px] text-slate-500">{fmtDate(t.entryTime)}</span>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-slate-200">
                        <span className="font-mono font-bold text-white">{t.ticker}</span>
                        {outcomeBadge(t.outcome)}
                        <span className="text-slate-400">Entry <span className="font-mono text-slate-200">${fmtPrice(t.entry)}</span></span>
                        <span className="text-slate-400">Exit <span className="font-mono text-slate-200">${fmtPrice(t.exit)}</span></span>
                        <span className="text-slate-400">Hold <span className="font-mono text-slate-200">{t.holdBars}h</span></span>
                        <span className="text-slate-400">Konfluenz <span className="font-mono text-slate-200">{t.confluence}/12</span></span>
                      </div>
                      <span className={`font-mono text-sm font-bold ${pnlColor}`}>
                        {t.netPnlPct >= 0 ? '+' : ''}{t.netPnlPct.toFixed(2)}%
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </>
      )}

      <footer className="border-t border-slate-900 pt-4 text-[10px] leading-relaxed text-slate-600">
        Daten: Bybit/Binance · 1h-Kerzen · Gebühren 0.2% Round-Trip · Stops/Ziele ATR-basiert. Keine Finanzberatung.
      </footer>
    </main>
  );
}

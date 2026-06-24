// Krypto-Detail wartet auf Binance-Klines, Snapshots, Master-Signal,
// Backtest und News. Schwerste dynamische Route — Skelett ist hier
// besonders wichtig.

export default function Loading() {
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <div className="h-3 w-32 rounded bg-slate-800 animate-pulse" />

      <header className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <div className="space-y-1.5">
            <div className="h-2.5 w-20 rounded bg-emerald-500/30 animate-pulse" />
            <div className="h-8 w-72 rounded bg-slate-800 animate-pulse" />
          </div>
          <div className="h-9 w-24 rounded-md border border-slate-700 bg-slate-900/60 animate-pulse" />
        </div>
        <div className="h-12 w-48 rounded bg-slate-800 animate-pulse" />
      </header>

      {/* Chart-Skelett */}
      <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
        <div className="flex justify-between gap-2">
          <div className="h-3 w-32 rounded bg-slate-800 animate-pulse" />
          <div className="flex gap-1">
            {['1T', '1W', '1M', '3M', '1J'].map((l) => (
              <div key={l} className="h-6 w-8 rounded bg-slate-800 animate-pulse" />
            ))}
          </div>
        </div>
        <div className="h-48 w-full rounded-lg bg-slate-800/30 animate-pulse" />
      </section>

      {/* Asset-Safety-Card */}
      <section className="space-y-3 rounded-2xl border-2 border-slate-700 bg-slate-900/40 p-4">
        <div className="flex justify-between gap-2">
          <div className="h-3 w-36 rounded bg-slate-800 animate-pulse" />
          <div className="h-6 w-12 rounded bg-emerald-500/30 animate-pulse" />
        </div>
        <ul className="space-y-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="grid grid-cols-[auto_1fr_auto] gap-2">
              <div className="h-3 w-4 rounded bg-emerald-500/30 animate-pulse" />
              <div className="h-3 w-44 rounded bg-slate-800 animate-pulse" />
              <div className="h-3 w-16 rounded bg-slate-800/60 animate-pulse" />
            </li>
          ))}
        </ul>
      </section>

      {/* Optionsschein-Bridge */}
      <section className="rounded-2xl border border-emerald-400/30 bg-emerald-950/15 p-3">
        <div className="h-3 w-44 rounded bg-emerald-500/30 animate-pulse" />
      </section>

      {/* News + Headlines */}
      <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
        <div className="h-3 w-28 rounded bg-slate-800 animate-pulse" />
        <ul className="space-y-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="space-y-1 rounded-md border border-slate-800 bg-slate-950/40 p-2">
              <div className="h-3 w-full max-w-md rounded bg-slate-800 animate-pulse" />
              <div className="h-2.5 w-32 rounded bg-slate-800/60 animate-pulse" />
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

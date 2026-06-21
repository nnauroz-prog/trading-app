// Sport-Hauptseite ist zweite schwere Route — viele Sub-Sektionen mit
// Fußball-Live-Daten, WM-Sub-Blöcken, Heute/Morgen/Diese-Woche.

export default function Loading() {
  return (
    <main className="mx-auto max-w-5xl space-y-5 p-4 md:p-6">
      <div className="h-3 w-32 rounded bg-slate-800 animate-pulse" />

      <header className="space-y-2">
        <div className="flex justify-between gap-2">
          <div className="h-3 w-44 rounded bg-slate-800 animate-pulse" />
          <div className="h-4 w-36 rounded bg-amber-500/20 animate-pulse" />
        </div>
        <div className="h-9 w-80 rounded bg-slate-800 animate-pulse" />
        <div className="h-3 w-full max-w-xl rounded bg-slate-800/60 animate-pulse" />
      </header>

      {/* Heute-Live-Banner */}
      <section className="rounded-2xl border border-emerald-400/30 bg-emerald-950/15 p-3">
        <div className="h-4 w-48 rounded bg-emerald-500/30 animate-pulse" />
      </section>

      {/* Tipp des Tages */}
      <section className="space-y-3 rounded-2xl border-2 border-emerald-400/40 bg-slate-900/60 p-4">
        <div className="h-3 w-32 rounded bg-emerald-500/30 animate-pulse" />
        <div className="h-7 w-64 rounded bg-slate-800 animate-pulse" />
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 rounded bg-slate-800/50 animate-pulse" />
          ))}
        </div>
        <div className="h-3 w-full rounded bg-slate-800/40 animate-pulse" />
      </section>

      {/* Top-Liste */}
      {Array.from({ length: 3 }).map((_, sec) => (
        <section key={sec} className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
          <div className="h-3 w-40 rounded bg-slate-800 animate-pulse" />
          <ul className="space-y-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-md border border-slate-800 bg-slate-950/40 px-3 py-2">
                <div className="h-3 w-16 rounded bg-slate-800 animate-pulse" />
                <div className="h-3 w-44 rounded bg-slate-800 animate-pulse" />
                <div className="h-3 w-12 rounded bg-emerald-500/30 animate-pulse" />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}

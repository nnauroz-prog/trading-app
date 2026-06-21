// Krypto-Startseite ist die meistbesuchte Route. Skeleton spiegelt den
// Hero und den ersten Bildschirm-Inhalt — keine grosse weisse Flaeche
// beim ersten Aufruf auf langsamen Verbindungen.

export default function Loading() {
  return (
    <main className="mx-auto max-w-5xl space-y-5 p-4 md:space-y-6 md:p-6">
      {/* Hero-Skelett */}
      <header className="space-y-3 rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-900/60 to-slate-950/40 p-5 md:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="h-3 w-40 rounded bg-emerald-500/30 animate-pulse" />
          <div className="h-4 w-32 rounded bg-amber-500/20 animate-pulse" />
        </div>
        <div className="h-8 w-full max-w-xl rounded bg-slate-800 animate-pulse" />
        <div className="h-3 w-full max-w-2xl rounded bg-slate-800/60 animate-pulse" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl border border-slate-800 bg-slate-950/50 animate-pulse" />
          ))}
        </div>
      </header>

      {/* Ticker-Bar-Skelett */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/30 p-2.5">
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-6 w-28 shrink-0 rounded bg-slate-800 animate-pulse" />
          ))}
        </div>
      </section>

      {/* Tipp-des-Tages-Skelett */}
      <section className="space-y-3 rounded-2xl border-2 border-emerald-400/40 bg-slate-900/60 p-4">
        <div className="h-3 w-32 rounded bg-emerald-500/30 animate-pulse" />
        <div className="h-8 w-64 rounded bg-slate-800 animate-pulse" />
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-slate-800/50 animate-pulse" />
          ))}
        </div>
      </section>

      {/* Kandidaten-Liste */}
      {Array.from({ length: 2 }).map((_, sec) => (
        <section key={sec} className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
          <div className="h-3 w-40 rounded bg-slate-800 animate-pulse" />
          <ul className="space-y-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2 rounded-md border border-slate-800 bg-slate-950/40 px-3 py-2">
                <div className="h-3 w-12 rounded bg-slate-800 animate-pulse" />
                <div className="h-3 w-40 rounded bg-slate-800 animate-pulse" />
                <div className="h-3 w-16 rounded bg-slate-800 animate-pulse" />
                <div className="h-3 w-12 rounded bg-emerald-500/30 animate-pulse" />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}

// Aktien-Detail wartet auf Yahoo-Quote + 1-Jahres-History + Sicherheits-
// Berechnung. Auf mobilen Verbindungen mehrere Sekunden weisse Flaeche
// — Skelett zeigt sofort die spaetere Struktur.

export default function Loading() {
  return (
    <main className="mx-auto max-w-3xl space-y-5 p-4 pb-20 md:p-6">
      <div className="h-3 w-32 rounded bg-slate-800 animate-pulse" />

      {/* Header-Karte mit Quote */}
      <header className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
        <div className="flex items-baseline justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <div className="h-2.5 w-20 rounded bg-emerald-500/30 animate-pulse" />
            <div className="h-7 w-48 rounded bg-slate-800 animate-pulse" />
            <div className="h-3 w-16 rounded bg-slate-800/60 animate-pulse" />
          </div>
          <div className="shrink-0 space-y-1 text-right">
            <div className="h-8 w-24 rounded bg-slate-800 animate-pulse" />
            <div className="h-3 w-16 rounded bg-emerald-500/30 animate-pulse" />
          </div>
        </div>
        <div className="h-7 w-36 rounded bg-slate-800/50 animate-pulse" />
      </header>

      {/* Marktstatus */}
      <div className="flex gap-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-5 w-32 rounded bg-slate-800 animate-pulse" />
        ))}
      </div>

      {/* Optionsschein-Bridge-Card */}
      <section className="rounded-2xl border border-emerald-400/30 bg-emerald-950/15 p-3">
        <div className="h-3 w-40 rounded bg-emerald-500/30 animate-pulse" />
      </section>

      {/* Sicherheits-Check + Stats */}
      <section className="space-y-3 rounded-2xl border-2 border-slate-700 bg-slate-900/40 p-4">
        <div className="flex justify-between gap-2">
          <div className="h-3 w-32 rounded bg-slate-800 animate-pulse" />
          <div className="h-6 w-16 rounded bg-emerald-500/30 animate-pulse" />
        </div>
        <div className="h-12 w-full rounded bg-emerald-500/15 animate-pulse" />
        <ul className="space-y-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <li key={i} className="grid grid-cols-[auto_1fr_auto] gap-2">
              <div className="h-3 w-4 rounded bg-emerald-500/30 animate-pulse" />
              <div className="h-3 w-44 rounded bg-slate-800 animate-pulse" />
              <div className="h-3 w-16 rounded bg-slate-800/60 animate-pulse" />
            </li>
          ))}
        </ul>
      </section>

      {/* Suggested Levels */}
      <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
        <div className="h-3 w-40 rounded bg-slate-800 animate-pulse" />
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-slate-800/50 animate-pulse" />
          ))}
        </div>
      </section>

      {/* Performance-Grid */}
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 rounded-lg border border-slate-700/60 bg-slate-950/40 p-2">
            <div className="h-2.5 w-12 rounded bg-slate-800 animate-pulse" />
            <div className="mt-1 h-3 w-16 rounded bg-slate-800 animate-pulse" />
          </div>
        ))}
      </section>
    </main>
  );
}

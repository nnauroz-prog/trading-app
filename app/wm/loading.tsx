// WM-Seite ist mit Abstand die schwerste Route (5+ MB HTML, viele
// Sub-Sektionen mit Server-Berechnungen). Skeleton zeigt sofort, dass
// die Seite laedt, statt einen weissen Bildschirm zu hinterlassen.

export default function Loading() {
  return (
    <main className="mx-auto max-w-4xl space-y-5 p-4 md:p-6">
      <div className="h-3 w-32 rounded bg-slate-800 animate-pulse" />

      <header className="space-y-2">
        <div className="flex justify-between gap-2">
          <div className="h-3 w-40 rounded bg-slate-800 animate-pulse" />
          <div className="h-4 w-32 rounded bg-amber-500/20 animate-pulse" />
        </div>
        <div className="h-9 w-72 rounded bg-slate-800 animate-pulse" />
        <div className="h-3 w-full max-w-xl rounded bg-slate-800/60 animate-pulse" />
      </header>

      {/* Hero — Top-Favorit */}
      <section className="space-y-3 rounded-2xl border border-emerald-400/20 bg-slate-900/40 p-5">
        <div className="h-3 w-40 rounded bg-emerald-500/30 animate-pulse" />
        <div className="h-10 w-56 rounded bg-slate-800 animate-pulse" />
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 rounded bg-slate-800/60 animate-pulse" />
          ))}
        </div>
        <div className="h-3 w-full rounded bg-slate-800/40 animate-pulse" />
      </section>

      {/* Top-8-Ranking-Skelett (~ Sieger-Ranking) */}
      <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
        <div className="h-3 w-44 rounded bg-slate-800 animate-pulse" />
        <ul className="space-y-1.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <li key={i} className="grid grid-cols-[2rem_1fr_auto_auto] items-center gap-2 rounded border border-slate-800 bg-slate-950/40 px-2.5 py-2">
              <div className="h-3 w-6 rounded bg-slate-800 animate-pulse" />
              <div className="h-3.5 w-40 rounded bg-slate-800 animate-pulse" />
              <div className="h-3 w-12 rounded bg-emerald-500/30 animate-pulse" />
              <div className="h-2 w-2 rounded-full bg-slate-700 animate-pulse" />
            </li>
          ))}
        </ul>
      </section>

      {/* Naechste Spiele Skelett */}
      <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
        <div className="h-3 w-40 rounded bg-slate-800 animate-pulse" />
        <ul className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="space-y-1 rounded-md border border-slate-800 bg-slate-950/40 p-2">
              <div className="grid grid-cols-[auto_1fr_auto] gap-2">
                <div className="h-3 w-20 rounded bg-slate-800 animate-pulse" />
                <div className="h-3 w-48 rounded bg-slate-800 animate-pulse" />
                <div className="h-3 w-14 rounded bg-slate-800 animate-pulse" />
              </div>
              <div className="h-4 w-full rounded bg-slate-800/50 animate-pulse" />
            </li>
          ))}
        </ul>
      </section>

      <p className="text-center text-[10.5px] text-slate-600">
        Modell berechnet aktuelle Vorhersagen — die Seite ist sofort da, einen Moment.
      </p>
    </main>
  );
}

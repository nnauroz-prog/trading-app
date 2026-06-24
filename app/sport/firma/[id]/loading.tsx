export default function Loading() {
  return (
    <main className="mx-auto max-w-3xl space-y-5 p-4 md:p-6">
      <div className="h-3 w-32 rounded bg-slate-800 animate-pulse" />

      <header className="flex items-center gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
        <div className="h-14 w-14 shrink-0 rounded-full bg-slate-800 animate-pulse" />
        <div className="space-y-1.5">
          <div className="h-2.5 w-24 rounded bg-emerald-500/30 animate-pulse" />
          <div className="h-6 w-48 rounded bg-slate-800 animate-pulse" />
        </div>
      </header>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 rounded-lg border border-slate-800 bg-slate-950/40 p-2">
            <div className="h-2.5 w-12 rounded bg-slate-800 animate-pulse" />
            <div className="mt-1 h-4 w-16 rounded bg-slate-800 animate-pulse" />
          </div>
        ))}
      </section>

      {/* Aktuelle Tipps */}
      <section className="space-y-2 rounded-2xl border-2 border-emerald-400/40 bg-slate-900/40 p-4">
        <div className="h-3 w-44 rounded bg-emerald-500/30 animate-pulse" />
        <ul className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="h-12 rounded-lg border border-slate-800 bg-slate-950/40 animate-pulse" />
          ))}
        </ul>
      </section>

      {/* Coverage */}
      <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
        <div className="h-3 w-40 rounded bg-slate-800 animate-pulse" />
        <ul className="space-y-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="h-7 rounded border border-slate-800 bg-slate-950/40 animate-pulse" />
          ))}
        </ul>
      </section>
    </main>
  );
}

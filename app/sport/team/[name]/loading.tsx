export default function Loading() {
  return (
    <main className="mx-auto max-w-5xl space-y-5 p-4 md:p-6">
      <div className="h-3 w-32 rounded bg-slate-800 animate-pulse" />

      <header className="space-y-2">
        <div className="h-2.5 w-32 rounded bg-emerald-500/30 animate-pulse" />
        <div className="h-9 w-60 rounded bg-slate-800 animate-pulse" />
      </header>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 rounded-lg border border-slate-800 bg-slate-950/40 p-2">
            <div className="h-2.5 w-16 rounded bg-slate-800 animate-pulse" />
            <div className="mt-1 h-4 w-12 rounded bg-slate-800 animate-pulse" />
          </div>
        ))}
      </section>

      {Array.from({ length: 3 }).map((_, sec) => (
        <section key={sec} className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
          <div className="h-3 w-40 rounded bg-slate-800 animate-pulse" />
          <ul className="space-y-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="h-8 rounded border border-slate-800 bg-slate-950/40 animate-pulse" />
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}

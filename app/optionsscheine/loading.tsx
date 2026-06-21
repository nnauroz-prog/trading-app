export default function Loading() {
  return (
    <main className="mx-auto max-w-4xl space-y-5 p-4 pb-20 md:p-6">
      <div className="h-3 w-32 rounded bg-slate-800 animate-pulse" />

      <header className="space-y-2">
        <div className="h-3 w-44 rounded bg-emerald-500/30 animate-pulse" />
        <div className="h-9 w-80 rounded bg-slate-800 animate-pulse" />
        <div className="h-3 w-full max-w-2xl rounded bg-slate-800/60 animate-pulse" />
      </header>

      <section className="rounded-xl border border-amber-500/30 bg-amber-950/15 p-3">
        <div className="h-3 w-full max-w-md rounded bg-amber-500/20 animate-pulse" />
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
        <div className="h-3 w-48 rounded bg-slate-800 animate-pulse" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="h-2.5 w-20 rounded bg-slate-800 animate-pulse" />
              <div className="h-8 w-full rounded-md bg-slate-800/50 animate-pulse" />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/30 p-4">
        <div className="h-3 w-32 rounded bg-slate-800 animate-pulse" />
      </section>
    </main>
  );
}

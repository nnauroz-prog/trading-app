export default function Loading() {
  return (
    <main className="mx-auto max-w-3xl space-y-5 p-4 md:p-6">
      <div className="h-3 w-32 rounded bg-slate-800 animate-pulse" />

      <header className="space-y-2">
        <div className="flex justify-between gap-2">
          <div className="h-3 w-32 rounded bg-amber-500/30 animate-pulse" />
          <div className="h-4 w-32 rounded bg-amber-500/20 animate-pulse" />
        </div>
        <div className="h-9 w-60 rounded bg-slate-800 animate-pulse" />
        <div className="h-3 w-full max-w-xl rounded bg-slate-800/60 animate-pulse" />
      </header>

      <section className="space-y-2 rounded-2xl border border-amber-500/30 bg-amber-950/15 p-4">
        <div className="h-3 w-40 rounded bg-amber-500/30 animate-pulse" />
        <div className="h-12 w-full rounded bg-slate-800/50 animate-pulse" />
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 rounded bg-slate-800/40 animate-pulse" />
          ))}
        </div>
      </section>

      {Array.from({ length: 3 }).map((_, sec) => (
        <section key={sec} className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
          <div className="h-3 w-32 rounded bg-slate-800 animate-pulse" />
          <div className="h-32 w-full rounded bg-slate-800/40 animate-pulse" />
        </section>
      ))}
    </main>
  );
}

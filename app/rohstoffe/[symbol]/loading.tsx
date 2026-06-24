export default function Loading() {
  return (
    <main className="mx-auto max-w-3xl space-y-5 p-4 pb-20 md:p-6">
      <div className="h-3 w-32 rounded bg-slate-800 animate-pulse" />

      <header className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
        <div className="flex items-baseline justify-between gap-3">
          <div className="space-y-1.5">
            <div className="h-2.5 w-20 rounded bg-emerald-500/30 animate-pulse" />
            <div className="h-7 w-44 rounded bg-slate-800 animate-pulse" />
            <div className="h-3 w-16 rounded bg-slate-800/60 animate-pulse" />
          </div>
          <div className="space-y-1 text-right">
            <div className="ml-auto h-8 w-24 rounded bg-slate-800 animate-pulse" />
            <div className="ml-auto h-3 w-16 rounded bg-emerald-500/30 animate-pulse" />
          </div>
        </div>
      </header>

      {Array.from({ length: 3 }).map((_, sec) => (
        <section key={sec} className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
          <div className="h-3 w-40 rounded bg-slate-800 animate-pulse" />
          <div className="h-24 w-full rounded bg-slate-800/40 animate-pulse" />
        </section>
      ))}
    </main>
  );
}

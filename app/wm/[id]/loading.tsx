export default function Loading() {
  return (
    <main className="mx-auto max-w-3xl space-y-5 p-4 md:p-6">
      <div className="h-3 w-32 rounded bg-slate-800 animate-pulse" />

      {/* Header: Begegnung */}
      <header className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="h-2.5 w-28 rounded bg-emerald-500/30 animate-pulse" />
          <div className="h-4 w-32 rounded bg-amber-500/20 animate-pulse" />
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="space-y-1 text-right">
            <div className="ml-auto h-7 w-32 rounded bg-slate-800 animate-pulse" />
            <div className="ml-auto h-2.5 w-16 rounded bg-slate-800/60 animate-pulse" />
          </div>
          <div className="h-5 w-10 rounded bg-slate-700 animate-pulse" />
          <div className="space-y-1">
            <div className="h-7 w-32 rounded bg-slate-800 animate-pulse" />
            <div className="h-2.5 w-16 rounded bg-slate-800/60 animate-pulse" />
          </div>
        </div>
        <div className="h-3 w-40 rounded bg-slate-800/60 animate-pulse" />
      </header>

      {/* Profi-Pick */}
      <section className="space-y-3 rounded-2xl border-2 border-emerald-400/40 bg-slate-900/60 p-4">
        <div className="h-3 w-28 rounded bg-emerald-500/30 animate-pulse" />
        <div className="h-12 w-48 rounded bg-slate-800 animate-pulse" />
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-slate-800/50 animate-pulse" />
          ))}
        </div>
      </section>

      {/* 1X2 + xG-Modell */}
      {Array.from({ length: 3 }).map((_, sec) => (
        <section key={sec} className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
          <div className="h-3 w-44 rounded bg-slate-800 animate-pulse" />
          <div className="h-24 w-full rounded bg-slate-800/40 animate-pulse" />
        </section>
      ))}
    </main>
  );
}

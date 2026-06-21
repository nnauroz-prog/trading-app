export default function Loading() {
  return (
    <main className="mx-auto max-w-4xl space-y-5 p-4 pb-20 md:p-6">
      <div className="h-3 w-32 rounded bg-slate-800 animate-pulse" />
      <header className="space-y-2">
        <div className="h-3 w-44 rounded bg-slate-800 animate-pulse" />
        <div className="h-8 w-80 rounded bg-slate-800 animate-pulse" />
      </header>
      {Array.from({ length: 4 }).map((_, sec) => (
        <section key={sec} className="space-y-2 rounded-2xl border border-sky-400/30 bg-slate-900/40 p-4">
          <div className="h-3 w-44 rounded bg-sky-500/30 animate-pulse" />
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 rounded-lg bg-slate-800/40 animate-pulse" />
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}

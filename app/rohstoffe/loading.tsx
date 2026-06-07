export default function Loading() {
  return (
    <main className="mx-auto max-w-5xl space-y-5 p-4 pb-20 md:p-6">
      <div className="h-3 w-24 rounded bg-slate-800 animate-pulse" />
      <header className="space-y-2">
        <div className="h-3 w-32 rounded bg-slate-800 animate-pulse" />
        <div className="h-8 w-64 rounded bg-slate-800 animate-pulse" />
        <div className="h-3 w-full max-w-md rounded bg-slate-800/60 animate-pulse" />
      </header>
      {Array.from({ length: 4 }).map((_, i) => (
        <section key={i} className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
          <div className="h-3 w-32 rounded bg-slate-800 animate-pulse" />
          <ul className="space-y-1">
            {Array.from({ length: 5 }).map((_, j) => (
              <li key={j} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2 rounded-md border border-slate-800 bg-slate-950/40 px-3 py-2">
                <div className="h-3 w-12 rounded bg-slate-800 animate-pulse" />
                <div className="h-3 w-40 rounded bg-slate-800 animate-pulse" />
                <div className="h-3 w-16 rounded bg-slate-800 animate-pulse" />
                <div className="h-3 w-12 rounded bg-slate-800 animate-pulse" />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}

export default function Loading() {
  return (
    <main className="mx-auto max-w-4xl space-y-5 p-4 pb-20 md:p-6">
      <div className="h-3 w-32 rounded bg-slate-800 animate-pulse" />
      <header className="space-y-2">
        <div className="h-3 w-40 rounded bg-slate-800 animate-pulse" />
        <div className="h-8 w-72 rounded bg-slate-800 animate-pulse" />
      </header>
      {Array.from({ length: 5 }).map((_, sec) => (
        <section key={sec} className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
          <div className="h-3 w-40 rounded bg-slate-800 animate-pulse" />
          <div className="h-20 w-full rounded bg-slate-800/40 animate-pulse" />
        </section>
      ))}
    </main>
  );
}

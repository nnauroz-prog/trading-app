// Heute-Sicher zieht Daten aus 4 Asset-Klassen parallel —
// schwerer Cross-Asset-Aggregate. Skeleton zeigt direkt, was kommt.

export default function Loading() {
  const CATEGORIES = ['Krypto', 'WM', 'Aktien', 'Rohstoffe'];
  return (
    <main className="mx-auto max-w-4xl space-y-5 p-4 pb-20 md:p-6">
      <div className="h-3 w-32 rounded bg-slate-800 animate-pulse" />

      <header className="space-y-2">
        <div className="h-3 w-40 rounded bg-slate-800 animate-pulse" />
        <div className="h-8 w-72 rounded bg-slate-800 animate-pulse" />
        <div className="h-3 w-full max-w-lg rounded bg-slate-800/60 animate-pulse" />
      </header>

      {/* Cross-Asset-Schnellblick */}
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {CATEGORIES.map((c) => (
          <div key={c} className="space-y-1 rounded-xl border border-slate-800 bg-slate-900/40 p-3">
            <div className="h-2.5 w-12 rounded bg-slate-800 animate-pulse" />
            <div className="h-6 w-8 rounded bg-emerald-500/30 animate-pulse" />
          </div>
        ))}
      </section>

      {/* Pro Asset-Klasse eine Sektion */}
      {CATEGORIES.map((cat) => (
        <section key={cat} className="space-y-2 rounded-2xl border border-emerald-400/40 bg-emerald-950/15 p-4">
          <div className="h-3 w-32 rounded bg-emerald-500/30 animate-pulse" />
          <ul className="space-y-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <li key={i} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-md border border-slate-800 bg-slate-950/40 px-3 py-2">
                <div className="h-3 w-36 rounded bg-slate-800 animate-pulse" />
                <div className="h-3 w-12 rounded bg-slate-800 animate-pulse" />
                <div className="h-4 w-10 rounded bg-emerald-500/30 animate-pulse" />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}

import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
        404
      </div>
      <h1 className="text-2xl font-bold text-white">Seite nicht gefunden</h1>
      <p className="max-w-md text-sm leading-relaxed text-slate-400">
        Diese Adresse gibt es nicht (mehr). Vielleicht ein alter Link oder ein Tippfehler.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-md border border-emerald-400/50 bg-emerald-500/20 px-4 py-1.5 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/30"
      >
        Zum Trading Desk
      </Link>
    </main>
  );
}

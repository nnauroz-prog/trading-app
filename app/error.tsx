'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-rose-400">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.8)]" />
        Fehler
      </div>
      <h1 className="text-2xl font-bold text-white">Etwas ist schiefgelaufen</h1>
      <p className="max-w-md text-sm leading-relaxed text-slate-400">
        Diese Ansicht konnte nicht geladen werden. Deine Daten liegen lokal und sind nicht betroffen. Versuch es erneut — oft hilft schon ein zweiter Anlauf.
      </p>
      {error.digest && (
        <p className="font-mono text-[10px] text-slate-600">Ref: {error.digest}</p>
      )}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={reset}
          className="rounded-md border border-emerald-400/50 bg-emerald-500/20 px-4 py-1.5 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/30"
        >
          Erneut versuchen
        </button>
        <Link
          href="/"
          className="rounded-md border border-slate-700 bg-slate-900 px-4 py-1.5 text-xs text-slate-300 transition hover:border-slate-600"
        >
          Zum Trading Desk
        </Link>
      </div>
    </main>
  );
}

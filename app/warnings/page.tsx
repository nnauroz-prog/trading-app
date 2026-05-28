import Link from 'next/link';
import { WarningMatcher } from '@/components/warning-matcher';

export const dynamic = 'force-dynamic';

export default function WarningsPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 md:space-y-6 md:p-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-emerald-300">
        ← zurück zum Trading Desk
      </Link>

      <header className="space-y-1">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-rose-400">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.8)]" />
          Loss-Warning-Matcher
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Verlustwarnungen prüfen</h1>
        <p className="max-w-2xl text-sm text-slate-400">
          Verlustwarnung aus einer beliebigen Quelle (Chat-Text, Newsletter, eigene Notiz) hier einfügen. Die App parst betroffene Basiswerte/WKNs und matched gegen deine offenen Positionen aus <Link href="/positions" className="text-emerald-300 underline">Meine Positionen</Link>. Wenn deine Position direkt betroffen ist: kritischer Alert mit konkreter Empfehlung.
        </p>
      </header>

      <WarningMatcher />
    </main>
  );
}

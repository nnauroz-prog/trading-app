import Link from 'next/link';
import { PersonalInsights } from '@/components/personal-insights';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function InsightsPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-5 p-4 md:p-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-emerald-300">
        ← zurück zum Signal Desk
      </Link>

      <header className="space-y-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-400">Insights</div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Dein persönlicher Track-Record</h1>
        <p className="text-sm text-slate-400">
          Alle lokal gespeicherten Tagebücher zusammengeführt. Was deine Firmen empfohlen haben, was der Chefredakteur gestern sagte, wie oft du Sport-Tipps getroffen hast, was auf deiner Watchlist steht, welche Alerts ausgelöst wurden — auf einer Seite.
        </p>
      </header>

      <PersonalInsights />

      <p className="rounded-xl border border-slate-700/60 bg-slate-950/40 p-3 text-[10px] leading-relaxed text-slate-500">
        Alle Daten liegen ausschließlich in deinem Browser — kein Server, keine Cloud-Synchronisation. Wenn du den Browser-Speicher leerst, sind sie weg.
      </p>
    </main>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { Calculators } from '@/components/calculators';

export const metadata: Metadata = {
  title: 'Werkzeuge · Sizing, R/R, Kelly',
  description: 'Position-Groesse, Reward-Risk-Rechner und Kelly-Kriterium — die einfachen Werkzeuge fuer Disziplin im Setup.'
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function ToolsPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-5 p-4 md:p-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-emerald-300">
        ← zurück zum Signal Desk
      </Link>

      <header className="space-y-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-400">Werkzeuge</div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Position-Größe · Reward/Risk · Kelly</h1>
        <p className="text-sm text-slate-400">
          Drei Rechner, die jeder disziplinierte Trader im Kopf haben sollte. Werte werden nicht gespeichert — nur Rechenhilfen.
        </p>
      </header>

      <Calculators />

      <p className="rounded-xl border border-slate-700/60 bg-slate-950/40 p-3 text-[10px] leading-relaxed text-slate-500">
        Mathematische Hilfen. Keine Garantie, dass das Setup wirklich aufgeht — Kelly etwa setzt voraus, dass deine Win-Rate-Schätzung stimmt. In der Praxis: Half-Kelly oder weniger.
      </p>
    </main>
  );
}

import Link from 'next/link';
import { runScreener } from '@/lib/analysis/screener';
import { ScreenerView } from '@/components/screener-view';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ScreenerPage() {
  const report = await runScreener(18);

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 md:space-y-6 md:p-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-emerald-300">
        ← zurück zum Trading Desk
      </Link>

      <header className="space-y-1">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          Signal Screener
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Markt-Scan: alle Setups gerankt</h1>
        <p className="max-w-2xl text-sm text-slate-400">
          Die 18 aktivsten Coins, alle durch die 12-Punkt-Master-Logik gejagt und nach Konfluenz sortiert. Statt nur des einen Top-Plays siehst du hier die ganze Rangliste — was setzt sich gerade auf, was ist tradeable (≥7/12), was ist noch schwach. Tippen öffnet den Chart.
        </p>
      </header>

      <ScreenerView report={report} />
    </main>
  );
}

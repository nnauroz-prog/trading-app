import Link from 'next/link';
import { PerformanceDashboard } from '@/components/performance-dashboard';

export const dynamic = 'force-dynamic';

export default function PerformancePage() {
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 md:space-y-6 md:p-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-emerald-300">
        ← zurück zum Trading Desk
      </Link>

      <header className="space-y-1">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          Performance
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Deine Trading-Statistik</h1>
        <p className="max-w-2xl text-sm text-slate-400">
          Auswertung aller geschlossenen Positionen: Win-Rate, Profit-Faktor, Sharpe-Ratio, Max-Drawdown, Equity-Curve, Monthly-PnL und Aufschlüsselung nach Coin / Instrument-Typ / Broker. Plus: lag die App-Entscheidung richtig (aus dem Journal)? Vorsichtig bei wenigen Trades — kleine Samples lügen.
        </p>
      </header>

      <PerformanceDashboard />
    </main>
  );
}

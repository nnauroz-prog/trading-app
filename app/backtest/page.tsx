import Link from 'next/link';
import { runStrategyBacktest } from '@/lib/analysis/strategy-backtest';
import { StrategyBacktestView } from '@/components/strategy-backtest-view';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function BacktestPage() {
  const report = await runStrategyBacktest(['btc', 'eth', 'sol']);

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 md:space-y-6 md:p-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-emerald-300">
        ← zurück zum Trading Desk
      </Link>

      <header className="space-y-1">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          Strategie-Backtest
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Hätte ich Geld verloren?</h1>
        <p className="max-w-2xl text-sm text-slate-400">
          Genau die 12-Punkt-Master-Logik der App, simuliert über echte historische Binance/Bybit-Kerzen (BTC/ETH/SOL). Jeder Punkt wo ≥7/12 Bestätigungen vorlagen wird als Trade gerechnet (ATR-Stop, ATR-Ziel), Fees abgezogen. Das ist die ehrliche Antwort auf deine Frage — keine Schätzung, echte Daten.
        </p>
      </header>

      <StrategyBacktestView report={report} />
    </main>
  );
}

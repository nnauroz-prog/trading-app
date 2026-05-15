import Link from 'next/link';
import { getHistory, HistoryFilters } from '@/lib/server/history';
import { HistoryTable } from '@/components/history-table';
import { mockAssets } from '@/lib/data/mock';
import { RecommendationAction } from '@/lib/types/domain';

export const dynamic = 'force-dynamic';

const ACTIONS: RecommendationAction[] = ['BUY', 'WATCH', 'HOLD', 'AVOID', 'SELL'];

export default async function HistoryPage({
  searchParams
}: {
  searchParams: Promise<{ asset?: string; action?: string }>;
}) {
  const params = await searchParams;
  const filters: HistoryFilters = {};
  if (params.asset && mockAssets.some((a) => a.id === params.asset)) filters.assetId = params.asset;
  if (params.action && ACTIONS.includes(params.action as RecommendationAction)) {
    filters.action = params.action as RecommendationAction;
  }

  const rows = await getHistory(filters);

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">History</h1>
          <p className="text-sm text-slate-400">Vergangene Empfehlungen und Review-Ergebnisse.</p>
        </div>
        <Link href="/" className="text-sm text-slate-300 hover:underline">← Dashboard</Link>
      </header>

      <form className="flex flex-wrap gap-3 rounded-xl border border-slate-800 bg-slate-900 p-3 text-sm" method="get">
        <label className="flex items-center gap-2">
          <span className="text-slate-400">Asset</span>
          <select name="asset" defaultValue={filters.assetId ?? ''} className="rounded border border-slate-700 bg-slate-950 px-2 py-1">
            <option value="">Alle</option>
            {mockAssets.map((a) => (
              <option key={a.id} value={a.id}>{a.ticker}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <span className="text-slate-400">Aktion</span>
          <select name="action" defaultValue={filters.action ?? ''} className="rounded border border-slate-700 bg-slate-950 px-2 py-1">
            <option value="">Alle</option>
            {ACTIONS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="rounded bg-emerald-600 px-3 py-1 text-sm font-medium hover:bg-emerald-500">
          Filtern
        </button>
        {(filters.assetId || filters.action) && (
          <Link href="/history" className="self-center text-xs text-slate-400 hover:underline">Filter zurücksetzen</Link>
        )}
      </form>

      {rows === null ? (
        <p className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">
          Persistenz nicht aktiv. Setze Supabase-Env-Variablen, damit History verfügbar wird.
        </p>
      ) : (
        <HistoryTable rows={rows} />
      )}
    </main>
  );
}

import { HistoryRow } from '@/lib/server/history';

const actionColor: Record<HistoryRow['action'], string> = {
  BUY: 'text-emerald-300',
  WATCH: 'text-amber-300',
  HOLD: 'text-blue-300',
  AVOID: 'text-orange-400',
  SELL: 'text-rose-300'
};

const verdictBadge: Record<NonNullable<HistoryRow['reviewVerdict']>, string> = {
  good: 'bg-emerald-600/30 text-emerald-200',
  bad: 'bg-rose-700/30 text-rose-200',
  neutral: 'bg-slate-700/40 text-slate-300'
};

export function HistoryTable({ rows }: { rows: HistoryRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">
        Keine Einträge für diesen Filter.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
      <table className="w-full text-sm">
        <thead className="bg-slate-950/60 text-left text-xs uppercase tracking-wide text-slate-400">
          <tr>
            <th className="px-3 py-2">Datum</th>
            <th className="px-3 py-2">Asset</th>
            <th className="px-3 py-2">Aktion</th>
            <th className="px-3 py-2">Confidence</th>
            <th className="px-3 py-2">Einstieg</th>
            <th className="px-3 py-2">Review</th>
            <th className="px-3 py-2">Horizont</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {rows.map((row, idx) => (
            <tr key={`${row.reportDate}-${row.assetId}-${idx}`} className="align-top">
              <td className="px-3 py-2 font-mono text-xs text-slate-300">{row.reportDate}</td>
              <td className="px-3 py-2 font-medium uppercase">{row.assetId}</td>
              <td className={`px-3 py-2 ${actionColor[row.action]}`}>{row.action}</td>
              <td className="px-3 py-2 text-slate-300">{row.confidence ?? '–'}</td>
              <td className="px-3 py-2 text-slate-300">{row.entryPrice?.toFixed(2) ?? '–'}</td>
              <td className="px-3 py-2">
                {row.reviewVerdict ? (
                  <span className={`rounded px-1.5 py-0.5 text-xs ${verdictBadge[row.reviewVerdict]}`}>{row.reviewVerdict}</span>
                ) : (
                  <span className="text-xs text-slate-500">–</span>
                )}
              </td>
              <td className="px-3 py-2 text-xs text-slate-400">
                {row.reviewHorizon !== null ? `${row.reviewHorizon}d` : '–'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

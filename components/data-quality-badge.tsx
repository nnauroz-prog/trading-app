interface Props {
  source: 'binance' | 'bybit' | 'mock' | 'finnhub' | 'thesportsdb' | 'coingecko' | string;
  verified: boolean;
  fetchedAt: number | null;
  apiKeyMissing?: boolean;
}

function timeAgo(ts: number): string {
  const diffSec = Math.floor((Date.now() - ts) / 1000);
  if (diffSec < 60) return 'gerade eben';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `vor ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `vor ${diffH} h`;
  return `vor ${Math.floor(diffH / 24)} Tagen`;
}

export function DataQualityBadge({ source, verified, fetchedAt, apiKeyMissing }: Props) {
  const tone = verified ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200' : 'border-amber-400/40 bg-amber-500/10 text-amber-200';
  const label = verified ? 'Live-Daten verifiziert' : apiKeyMissing ? 'API-Key fehlt' : 'nicht verifiziert';
  return (
    <div className={`inline-flex flex-wrap items-baseline gap-1.5 rounded-md border px-2 py-1 text-[10px] ${tone}`}>
      <span className="font-bold uppercase tracking-wider">{label}</span>
      <span className="text-slate-500">·</span>
      <span className="font-mono">Quelle: {source}</span>
      {fetchedAt && (
        <>
          <span className="text-slate-500">·</span>
          <span>letzter Abruf {timeAgo(fetchedAt)}</span>
        </>
      )}
    </div>
  );
}

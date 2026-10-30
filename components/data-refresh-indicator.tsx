interface Props {
  initialTimestamp: number;
  refreshIntervalMs: number;
  hasData: boolean;
}

// A page render does not prove that the provider supplied fresh data.
export function DataRefreshIndicator({ initialTimestamp, refreshIntervalMs, hasData }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-slate-800 bg-slate-950/40 px-2.5 py-1 text-[10px] text-slate-400">
      <span className={hasData ? 'text-slate-300' : 'text-amber-300'}>
        {hasData ? 'Spielplandaten vorhanden · Aktualität nicht bestätigt' : 'Keine Spielplandaten verfügbar'}
      </span>
      <span className="text-slate-600">·</span>
      <span>Seitenstand: {new Date(initialTimestamp).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })} (Berlin)</span>
      <span className="text-slate-600">·</span>
      <span>Cache-Intervall: {Math.ceil(refreshIntervalMs / 60_000)} Min · Erneut laden prüft den Datenstand.</span>
    </div>
  );
}

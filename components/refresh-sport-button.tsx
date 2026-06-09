'use client';

// Manueller Refresh-Knopf fuer die Sport-Seite. router.refresh() invalidiert
// den Server-Cache der aktuellen Route und zwingt eine neue Datenpipe (mit
// frischem Wetter-Forecast, neuen Schiri-Eintragungen, evtl. nachgepflegten
// TheSportsDB-Daten). Spielt am Spieltag eine Rolle, wo sich die Datenlage
// in der letzten Stunde vor Anstoss aendern kann.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function RefreshSportButton() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<number | null>(null);

  useEffect(() => {
    // Initial: jetzt als letzter Refresh markieren.
    setLastRefresh(Date.now());
  }, []);

  const onClick = () => {
    setRefreshing(true);
    router.refresh();
    // router.refresh ist synchron in der API, aber das Re-Rendering
    // braucht den naechsten Tick. Wir setzen den Status mit kleinem
    // Delay zurueck, damit der User Feedback bekommt.
    setTimeout(() => {
      setRefreshing(false);
      setLastRefresh(Date.now());
    }, 800);
  };

  const minutesAgo = lastRefresh ? Math.floor((Date.now() - lastRefresh) / 60_000) : null;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={refreshing}
      className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 text-[10px] font-semibold text-slate-300 hover:border-emerald-400/50 hover:text-emerald-300 disabled:opacity-60"
      title="Frische Daten ziehen (Wetter, Aufstellung, Schiri)"
      aria-label="Daten aktualisieren"
    >
      <span className={refreshing ? 'animate-spin' : ''} aria-hidden>↻</span>
      <span>{refreshing ? 'Lade…' : minutesAgo !== null && minutesAgo > 0 ? `Aktualisieren (vor ${minutesAgo}min)` : 'Aktualisieren'}</span>
    </button>
  );
}

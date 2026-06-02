'use client';

import { useEffect, useState } from 'react';

interface Props {
  initialTimestamp: number; // ms epoch when server-side data was rendered
  refreshIntervalMs: number; // wie lange bis der nächste Pull erwartet wird
}

// Zeigt "vor X Min aktualisiert · nächster Pull in Y Min" — gibt dem User
// Klarheit dass die Daten frisch sind und automatisch nachfließen.
export function DataRefreshIndicator({ initialTimestamp, refreshIntervalMs }: Props) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const interval = setInterval(tick, 30_000);
    return () => clearInterval(interval);
  }, []);

  const ageMs = Math.max(0, now - initialTimestamp);
  const ageMin = Math.floor(ageMs / 60_000);
  const nextRefreshIn = Math.max(0, refreshIntervalMs - ageMs);
  const nextRefreshMin = Math.ceil(nextRefreshIn / 60_000);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-slate-800 bg-slate-950/40 px-2.5 py-1 text-[10px] text-slate-400">
      <span className="inline-flex items-center gap-1">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
        Daten aktuell
      </span>
      <span className="text-slate-600">·</span>
      <span>aktualisiert vor <span className="font-mono text-slate-300">{ageMin} Min</span></span>
      <span className="text-slate-600">·</span>
      <span>nächste Aktualisierung in <span className="font-mono text-slate-300">{nextRefreshMin} Min</span></span>
    </div>
  );
}

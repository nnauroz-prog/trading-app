'use client';

import { useEffect, useState } from 'react';

// Wenn ein Spiel kurz bevorsteht (≤ 60 Min), kleiner pulsierender Hinweis
// neben der Anstoßzeit. Reine Anzeige, ohne Auto-Refresh-Bursts.
export function KickoffCountdown({ dateIso, time }: { dateIso: string; time: string | null }) {
  const [minutesUntil, setMinutesUntil] = useState<number | null>(null);

  useEffect(() => {
    if (!time) return;
    const kickoff = new Date(`${dateIso}T${time}:00Z`).getTime();
    if (Number.isNaN(kickoff)) return;
    const tick = () => {
      const diffMin = Math.round((kickoff - Date.now()) / 60000);
      setMinutesUntil(diffMin);
    };
    tick();
    const interval = setInterval(tick, 30000);
    return () => clearInterval(interval);
  }, [dateIso, time]);

  if (minutesUntil === null) return null;
  if (minutesUntil < 0 && minutesUntil > -120) {
    return <span className="ml-1 rounded bg-rose-500/30 px-1 py-0.5 font-mono text-[9px] uppercase tracking-wider text-rose-200">läuft</span>;
  }
  if (minutesUntil >= 0 && minutesUntil <= 60) {
    return <span className="ml-1 animate-pulse rounded bg-emerald-500/30 px-1 py-0.5 font-mono text-[9px] uppercase tracking-wider text-emerald-200">in {minutesUntil} Min</span>;
  }
  return null;
}

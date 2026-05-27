'use client';

import { useEffect, useState } from 'react';

const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

export function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  if (!now) return <span className="text-3xl font-bold tracking-tight text-white sm:text-3xl">—</span>;

  const dateLine = `${WEEKDAYS[now.getDay()]}, ${now.getDate()}. ${MONTHS[now.getMonth()]}`;
  const timeLine = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{dateLine}</h1>
      <div className="mt-0.5 font-mono text-[11px] text-slate-500">{timeLine} · Local Time · auto-refresh 30s</div>
    </div>
  );
}

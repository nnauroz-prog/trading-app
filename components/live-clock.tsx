'use client';

import { useEffect, useState } from 'react';

const DATE_FORMATTER = new Intl.DateTimeFormat('de-DE', {
  timeZone: 'Europe/Berlin',
  weekday: 'long',
  day: '2-digit',
  month: 'long'
});

const TIME_FORMATTER = new Intl.DateTimeFormat('de-DE', {
  timeZone: 'Europe/Berlin',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
});

export function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!now) {
    return <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">—</h1>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{DATE_FORMATTER.format(now)}</h1>
      <div className="mt-0.5 font-mono text-[11px] text-slate-500">
        {TIME_FORMATTER.format(now)} · Europe/Berlin · 1s-refresh
      </div>
    </div>
  );
}

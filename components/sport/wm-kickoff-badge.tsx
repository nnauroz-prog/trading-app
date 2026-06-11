'use client';

// Live-Badge mit dem Anstoss-Countdown fuer ein WM-Fixture.
// Tickt sich selbst im Minutentakt neu.

import { useEffect, useState } from 'react';
import { computeKickoffCountdown } from '@/lib/sport/wm-kickoff-countdown';

interface Props {
  dateIso: string;
  time: string | null;
  variant?: 'short' | 'long';
}

export function WmKickoffBadge({ dateIso, time, variant = 'long' }: Props) {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const info = computeKickoffCountdown(dateIso, time, now);
  const tone =
    info.status === 'laeuft' ? 'border-amber-400/60 bg-amber-500/15 text-amber-100' :
    info.status === 'wahrscheinlich-vorbei' ? 'border-slate-700 bg-slate-900/40 text-slate-400' :
    'border-sky-400/50 bg-sky-500/10 text-sky-100';
  const text = variant === 'short' ? info.labelShort : info.labelLong;

  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[9.5px] font-mono font-bold uppercase tracking-wider ${tone}`}
      title={info.labelLong}
      aria-label={info.labelLong}
    >
      {text}
    </span>
  );
}

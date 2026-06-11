'use client';

// Live-Zeile fuer einen Tagesplan-Eintrag: Anstoss-Countdown + (sobald
// vorhanden) Endstand aus dem Ergebnis-Store. Tickt sich jede Minute.

import { useEffect, useState } from 'react';
import { computeKickoffCountdown } from '@/lib/sport/wm-kickoff-countdown';
import {
  loadManualWmResults,
  WM_MANUAL_RESULTS_CHANGED_EVENT
} from '@/lib/sport/wm-results-store';

interface Props {
  fixtureId: string;
  dateIso: string;
  time: string | null;
}

export function WmDayPlanLiveRow({ fixtureId, dateIso, time }: Props) {
  const [now, setNow] = useState<Date>(() => new Date());
  const [resultsTick, setResultsTick] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const id = setInterval(() => setNow(new Date()), 60_000);
    const refresh = () => setResultsTick((t) => t + 1);
    window.addEventListener(WM_MANUAL_RESULTS_CHANGED_EVENT, refresh);
    return () => {
      clearInterval(id);
      window.removeEventListener(WM_MANUAL_RESULTS_CHANGED_EVENT, refresh);
    };
  }, []);

  if (!mounted) return null;

  void resultsTick;
  const info = computeKickoffCountdown(dateIso, time, now);
  const manual = loadManualWmResults().find((r) => r.fixtureId === fixtureId);

  const tone =
    info.status === 'laeuft' ? 'border-amber-400/60 bg-amber-500/15 text-amber-100' :
    info.status === 'wahrscheinlich-vorbei' ? 'border-slate-700 bg-slate-900/40 text-slate-400' :
    'border-sky-400/50 bg-sky-500/10 text-sky-100';

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider ${tone}`}
        title={info.labelLong}
      >
        {info.labelShort}
      </span>
      {manual && (
        <span className="inline-flex items-center rounded border border-slate-600 bg-slate-900/60 px-1.5 py-0.5 text-[9.5px] font-mono font-bold text-slate-100" title="Endstand (nachgepflegt)">
          {manual.homeScore}:{manual.awayScore}
        </span>
      )}
    </span>
  );
}

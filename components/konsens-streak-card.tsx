'use client';

import { useEffect, useState } from 'react';
import { FIRMA_DECISIONS_CHANGED_EVENT, FirmaDecision, loadFirmaLog } from '@/lib/firma-memory';
import { detectKonsensStreaks } from '@/lib/agents/konsens-streak';

export function KonsensStreakCard() {
  const [log, setLog] = useState<FirmaDecision[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setLog(loadFirmaLog());
    sync();
    setMounted(true);
    window.addEventListener(FIRMA_DECISIONS_CHANGED_EVENT, sync);
    return () => window.removeEventListener(FIRMA_DECISIONS_CHANGED_EVENT, sync);
  }, []);

  if (!mounted) return null;
  const streaks = detectKonsensStreaks(log);
  if (streaks.length === 0) return null;
  const top = streaks[0];

  return (
    <section className="space-y-2 rounded-2xl border border-emerald-400/40 bg-emerald-950/20 p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-200">Konsens-Streak</h2>
        <span className="text-[10px] text-emerald-100/70">{streaks.length} Coin{streaks.length === 1 ? '' : 's'}</span>
      </div>
      <p className="text-[12px] text-emerald-100">
        <span className="font-mono font-bold text-white">{top.coin}</span> wird seit {top.daysInRow} {top.daysInRow === 1 ? 'Tag' : 'Tagen'} von {top.firmas.length} Firmen gemeinsam beobachtet.
        Davon waren {Math.round(top.buyShare * 100)}% der Verdikte tatsächlich KAUFEN.
      </p>
      {streaks.length > 1 && (
        <ul className="space-y-0.5 text-[11px]">
          {streaks.slice(1, 4).map((s) => (
            <li key={s.coin} className="text-emerald-200/80">
              <span className="font-mono font-bold text-white">{s.coin}</span> · {s.daysInRow}d · {s.firmas.length} Firmen · {Math.round(s.buyShare * 100)}% Buys
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

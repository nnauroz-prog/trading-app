'use client';

import { useEffect, useState } from 'react';
import { readAndUpdateLastVisit } from '@/lib/last-visit';
import { loadAlerts } from '@/lib/price-alerts';
import { loadFirmaLog } from '@/lib/firma-memory';
import { loadWatchlist } from '@/lib/watchlist';

interface Summary {
  show: boolean;
  hoursAgo: number | null;
  newlyTriggered: number;
  firmaVerdictChange: boolean;
  watchlistCount: number;
}

function fmtGap(minutes: number | null): string {
  if (minutes === null) return '';
  if (minutes < 60) return `${minutes} Min.`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'Stunde' : 'Stunden'}`;
  const days = Math.round(hours / 24);
  return `${days} ${days === 1 ? 'Tag' : 'Tagen'}`;
}

function detectVerdictChange(lastVisit: number | null): boolean {
  if (lastVisit === null) return false;
  const log = loadFirmaLog();
  // any firma decision recorded AFTER last visit that changed verdict vs earlier
  const recent = log.filter((d) => d.recordedAt > lastVisit);
  if (recent.length === 0) return false;
  const earlier = log.filter((d) => d.recordedAt <= lastVisit);
  for (const r of recent) {
    const previousForFirma = earlier.filter((e) => e.firma === r.firma).sort((a, b) => b.recordedAt - a.recordedAt)[0];
    if (previousForFirma && previousForFirma.verdict !== r.verdict) return true;
  }
  return false;
}

export function WelcomeBack() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const visit = readAndUpdateLastVisit();
    if (!visit.showWelcome) {
      setSummary({ show: false, hoursAgo: null, newlyTriggered: 0, firmaVerdictChange: false, watchlistCount: 0 });
      return;
    }
    const triggered = loadAlerts().filter((a) => a.triggered && a.triggeredAt && a.triggeredAt > (visit.lastVisitAt ?? 0)).length;
    const verdictChange = detectVerdictChange(visit.lastVisitAt);
    const watchlistCount = loadWatchlist().length;
    setSummary({
      show: true,
      hoursAgo: visit.minutesSinceLast,
      newlyTriggered: triggered,
      firmaVerdictChange: verdictChange,
      watchlistCount
    });
  }, []);

  if (!summary?.show || dismissed) return null;

  const noteworthy: string[] = [];
  if (summary.newlyTriggered > 0) noteworthy.push(`${summary.newlyTriggered} Preis-Alert${summary.newlyTriggered === 1 ? ' wurde' : 's wurden'} ausgelöst.`);
  if (summary.firmaVerdictChange) noteworthy.push('Mindestens eine Firma hat ihr Verdikt geändert.');
  if (summary.watchlistCount > 0) noteworthy.push(`Watchlist: ${summary.watchlistCount} Coin${summary.watchlistCount === 1 ? '' : 's'} im Blick.`);

  return (
    <section className="space-y-2 rounded-2xl border border-sky-500/30 bg-sky-950/20 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-sky-200">Willkommen zurück</h2>
        <button onClick={() => setDismissed(true)} className="text-[10px] text-slate-400 hover:text-slate-200">✕</button>
      </div>
      <p className="text-[12px] text-slate-200">
        Letzter Besuch vor {fmtGap(summary.hoursAgo)}.{' '}
        {noteworthy.length > 0 ? noteworthy.join(' ') : 'Nichts Dringendes seit dem letzten Besuch — schau dich entspannt um.'}
      </p>
    </section>
  );
}

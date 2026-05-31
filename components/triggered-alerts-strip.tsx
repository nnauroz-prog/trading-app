'use client';

import { useEffect, useState } from 'react';
import { ALERTS_CHANGED_EVENT, PriceAlert, deleteAlert, evaluateAlerts, loadAlerts } from '@/lib/price-alerts';

function maybeFireNotification(alert: PriceAlert): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  try {
    new Notification(`${alert.symbol} ${alert.direction === 'above' ? 'über' : 'unter'} $${alert.targetPrice}`, {
      body: alert.note ?? 'Preis-Alert ausgelöst.',
      icon: '/icon.svg',
      tag: alert.id
    });
  } catch {
    // ignore — notification permission can be revoked between checks
  }
}

interface Props {
  latestPrices: Record<string, number | null>;
}

// Headless + visible: every render checks if any pending alert has tripped
// against the current prices. If yes, the strip pops at the top of the home
// page with the triggered alerts.
export function TriggeredAlertsStrip({ latestPrices }: Props) {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setAlerts(loadAlerts());
    sync();
    setMounted(true);
    window.addEventListener(ALERTS_CHANGED_EVENT, sync);
    return () => window.removeEventListener(ALERTS_CHANGED_EVENT, sync);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const newlyTriggered = evaluateAlerts(latestPrices);
    for (const a of newlyTriggered) maybeFireNotification(a);
    setAlerts(loadAlerts());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, JSON.stringify(latestPrices)]);

  if (!mounted) return null;
  const triggered = alerts.filter((a) => a.triggered);
  if (triggered.length === 0) return null;

  return (
    <section className="space-y-2 rounded-2xl border-2 border-amber-400/60 bg-amber-950/30 p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-amber-200">Preis-Alerts ausgelöst</h2>
        <span className="rounded border border-amber-400/50 bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-100">
          {triggered.length}
        </span>
      </div>
      <ul className="space-y-1.5">
        {triggered.map((a) => {
          const live = latestPrices[a.coinId];
          return (
            <li key={a.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-md border border-amber-500/30 bg-slate-950/40 p-2 text-[11px]">
              <span className="text-slate-200">
                <span className="font-mono font-bold text-white">{a.symbol}</span>
                {' '}{a.direction === 'above' ? '↑' : '↓'} <span className="font-mono">${a.targetPrice}</span>
                {a.note && <span className="ml-2 italic text-slate-500">— {a.note}</span>}
              </span>
              {live !== null && live !== undefined && (
                <span className="font-mono text-[10px] text-slate-400">jetzt ${live >= 1000 ? Math.round(live) : live.toFixed(2)}</span>
              )}
              <button
                onClick={() => deleteAlert(a.id)}
                className="text-[10px] text-slate-500 hover:text-rose-300"
              >
                ✕
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

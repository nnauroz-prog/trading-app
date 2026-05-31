'use client';

import { useEffect, useState } from 'react';
import { ALERTS_CHANGED_EVENT, loadAlerts } from '@/lib/price-alerts';
import { POSITIONS_CHANGED_EVENT, loadPositions } from '@/lib/positions';

// Counts the things that should draw the user's attention to the Risiko tab.
function computeRiskCount(): number {
  let count = 0;
  const alerts = loadAlerts();
  count += alerts.filter((a) => a.triggered).length;
  const positions = loadPositions();
  count += positions.filter((p) => p.status === 'open' && p.stopLossPlanned === null).length;
  return count;
}

// Renders a small red dot + number badge if any urgent risk item exists.
export function RiskBadge() {
  const [count, setCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setCount(computeRiskCount());
    sync();
    setMounted(true);
    window.addEventListener(ALERTS_CHANGED_EVENT, sync);
    window.addEventListener(POSITIONS_CHANGED_EVENT, sync);
    return () => {
      window.removeEventListener(ALERTS_CHANGED_EVENT, sync);
      window.removeEventListener(POSITIONS_CHANGED_EVENT, sync);
    };
  }, []);

  if (!mounted || count === 0) return null;
  return (
    <span className="absolute -right-1 -top-1 inline-flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-rose-500 px-1 text-[8px] font-bold text-white">
      {count}
    </span>
  );
}

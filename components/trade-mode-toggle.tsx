'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Mode = 'swing' | 'daytrade';

function readCookie(): Mode {
  if (typeof document === 'undefined') return 'swing';
  return document.cookie.includes('trade-mode=daytrade') ? 'daytrade' : 'swing';
}

// Switches the signal engine between swing (1h/4h/1d) and day-trade (5m/15m/1h)
// via a cookie the server reads, then refreshes to recompute the signal.
export function TradeModeToggle() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('swing');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMode(readCookie());
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const set = (next: Mode) => {
    document.cookie = `trade-mode=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;
    setMode(next);
    router.refresh();
  };

  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-slate-700 text-xs font-semibold">
      <button
        type="button"
        onClick={() => set('swing')}
        aria-pressed={mode === 'swing'}
        className={`px-3 py-1.5 transition ${mode === 'swing' ? 'bg-emerald-500/20 text-emerald-200' : 'bg-slate-900/60 text-slate-400 hover:text-slate-200'}`}
      >
        Swing
      </button>
      <button
        type="button"
        onClick={() => set('daytrade')}
        aria-pressed={mode === 'daytrade'}
        className={`border-l border-slate-700 px-3 py-1.5 transition ${mode === 'daytrade' ? 'bg-emerald-500/20 text-emerald-200' : 'bg-slate-900/60 text-slate-400 hover:text-slate-200'}`}
      >
        Daytrading
      </button>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { loadConfig, saveConfig } from '@/lib/account-config';

// Toggles beginner mode (hide advanced blocks) on or off.
export function ViewModeToggle() {
  const [advanced, setAdvanced] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setAdvanced(loadConfig().advancedMode);
    sync();
    setMounted(true);
    window.addEventListener('trading-app:config-changed', sync);
    return () => window.removeEventListener('trading-app:config-changed', sync);
  }, []);

  if (!mounted) return null;

  const toggle = () => saveConfig({ ...loadConfig(), advancedMode: !advanced });

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={advanced}
      className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
        advanced
          ? 'border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-600'
          : 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${advanced ? 'bg-slate-500' : 'bg-emerald-400'}`} />
      {advanced ? '－ Nur Kauf-Tipp anzeigen' : '＋ Mehr anzeigen (Analyse & Details)'}
    </button>
  );
}

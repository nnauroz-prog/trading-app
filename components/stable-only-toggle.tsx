'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'trading-app.sport-stable-only-v1';
export const STABLE_ONLY_CHANGED = 'trading-app:stable-only-changed';

export function loadStableOnly(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(STORAGE_KEY) === '1';
}

// Globaler Schalter „nur stabile Märkte". Reflektiert sich auf TopPredictionsRanking
// und SportQuickFilter über das CustomEvent.
export function StableOnlyToggle() {
  const [on, setOn] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setOn(loadStableOnly());
    setMounted(true);
    const sync = () => setOn(loadStableOnly());
    window.addEventListener(STABLE_ONLY_CHANGED, sync);
    return () => window.removeEventListener(STABLE_ONLY_CHANGED, sync);
  }, []);

  const toggle = () => {
    const next = !on;
    window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
    window.dispatchEvent(new CustomEvent(STABLE_ONLY_CHANGED));
    setOn(next);
  };

  if (!mounted) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      className={`rounded-md border px-2 py-1 text-[10px] transition ${
        on
          ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200'
          : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-emerald-400/40'
      }`}
    >
      {on ? '✓ nur stabile Märkte' : 'nur stabile Märkte'}
    </button>
  );
}

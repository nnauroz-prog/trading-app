'use client';

// Signal-Mode-Toggle fuer den Sport Precision Desk.
// Drei Modi: PRECISION (Default), BALANCED, HIGH_RISK.
// Auswahl bleibt lokal gespeichert.

import { useEffect, useState } from 'react';
import {
  loadSignalMode,
  saveSignalMode,
  SPORT_SIGNAL_MODE_CHANGED_EVENT
} from '@/lib/sport/sport-signal-mode-store';
import type { SportRiskMode } from '@/lib/sport/sport-odds-value';

interface Props {
  onChange?: (mode: SportRiskMode) => void;
}

const MODES: { id: SportRiskMode; label: string; hint: string; tone: string }[] = [
  {
    id: 'PRECISION',
    label: 'Precision',
    hint: 'Nur sehr strenge Modell-Freigaben.',
    tone: 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100'
  },
  {
    id: 'BALANCED',
    label: 'Balanced',
    hint: 'Zeigt zusaetzlich beobachtenswerte Tendenzen.',
    tone: 'border-sky-400/60 bg-sky-500/15 text-sky-100'
  },
  {
    id: 'HIGH_RISK',
    label: 'High Risk',
    hint: 'Zeigt spekulative Value-Ideen. Keine Freigabe, erhoehtes Risiko.',
    tone: 'border-rose-400/60 bg-rose-500/15 text-rose-100'
  }
];

export function SportSignalModeToggle({ onChange }: Props) {
  const [mode, setMode] = useState<SportRiskMode>('PRECISION');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMode(loadSignalMode());
    setMounted(true);
    const sync = () => setMode(loadSignalMode());
    window.addEventListener(SPORT_SIGNAL_MODE_CHANGED_EVENT, sync);
    return () => window.removeEventListener(SPORT_SIGNAL_MODE_CHANGED_EVENT, sync);
  }, []);

  const handlePick = (next: SportRiskMode) => {
    setMode(next);
    saveSignalMode(next);
    onChange?.(next);
  };

  if (!mounted) return null;

  const active = MODES.find((m) => m.id === mode) ?? MODES[0];

  return (
    <section className="space-y-1.5 rounded-2xl border border-slate-700 bg-slate-950/40 p-3" aria-label="Signal-Modus">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300">Signal-Modus</h3>
        <span className="text-[10px] text-slate-500">Default Precision</span>
      </div>
      <div role="radiogroup" aria-label="Signal-Modus" className="flex flex-wrap gap-1.5">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={mode === m.id}
            onClick={() => handlePick(m.id)}
            className={`rounded border px-2 py-1 text-[10.5px] font-bold uppercase tracking-wider ${mode === m.id ? m.tone : 'border-slate-700 bg-slate-900/60 text-slate-400 hover:border-slate-500'}`}
            title={m.hint}
          >{m.label}</button>
        ))}
      </div>
      <p className="text-[10px] leading-snug text-slate-400">{active.hint}</p>
      {mode === 'HIGH_RISK' && (
        <p className="text-[9.5px] leading-snug text-rose-300">
          HIGH RISK markiert spekulative Value-Ideen. Niemals eine Freigabe. Nur mit kleinem Risiko-Budget pruefen.
        </p>
      )}
    </section>
  );
}

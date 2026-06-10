'use client';

// WM-Eigenkalibrierung: pro Probability-Bucket die echte Trefferquote
// der eigenen Picks vs. erwartete Quote. Versteckt sich solange keine
// decisive Outcomes vorliegen.

import { useEffect, useMemo, useState } from 'react';
import {
  loadWmPickLog,
  WM_PICK_LEARNING_CHANGED_EVENT
} from '@/lib/sport/wm-pick-learning-store';
import { buildWmCalibrationFromLog } from '@/lib/sport/wm-calibration';
import type { CalibrationLabel } from '@/lib/sport/sport-calibration';
import type { WmPickLogEntry } from '@/lib/sport/wm-pick-learning';

const LABEL_TEXT: Record<CalibrationLabel, string> = {
  KALIBRIERT: 'Kalibriert',
  UNKLAR: 'Unklar',
  UEBERSCHAETZT: 'Ueberschaetzt'
};

const LABEL_CLASS: Record<CalibrationLabel, string> = {
  KALIBRIERT: 'border-emerald-500/40 bg-emerald-950/15 text-emerald-100',
  UNKLAR: 'border-slate-700 bg-slate-900/40 text-slate-300',
  UEBERSCHAETZT: 'border-rose-500/40 bg-rose-950/20 text-rose-100'
};

export function WmCalibrationCard() {
  const [log, setLog] = useState<WmPickLogEntry[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setLog(loadWmPickLog());
    sync();
    setMounted(true);
    window.addEventListener(WM_PICK_LEARNING_CHANGED_EVENT, sync);
    return () => window.removeEventListener(WM_PICK_LEARNING_CHANGED_EVENT, sync);
  }, []);

  const result = useMemo(() => buildWmCalibrationFromLog(log), [log]);

  if (!mounted) return null;
  if (result.totalDecisive === 0) return null;

  const visible = result.stats.filter((s) => s.sampleSize > 0);
  if (visible.length === 0) return null;

  return (
    <section className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900/40 p-3" aria-label="WM Eigenkalibrierung">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">WM-Eigenkalibrierung (aus eigenen Picks)</h3>
        <span className="text-[10px] text-slate-500">{result.totalDecisive} decisive</span>
      </div>
      <ul className="space-y-0.5">
        {visible.map((s) => {
          const hit = s.historicalHitRate !== null ? `${Math.round(s.historicalHitRate * 100)} %` : '—';
          const expected = `${Math.round(s.expectedHitRate * 100)} %`;
          return (
            <li key={s.bucket} className={`grid grid-cols-[auto_auto_1fr_auto] items-center gap-2 rounded border px-2 py-1 text-[10.5px] ${LABEL_CLASS[s.label]}`}>
              <span className="font-mono text-[10px] opacity-80">Bucket {s.bucket}%</span>
              <span className="text-[9.5px] opacity-70">{s.sampleSize} Pick{s.sampleSize === 1 ? '' : 's'}</span>
              <span className="text-[10px]">trifft {hit} <span className="opacity-60">vs. erwartet {expected}</span></span>
              <span className="rounded border border-slate-700 bg-slate-950/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">{LABEL_TEXT[s.label]}</span>
            </li>
          );
        })}
      </ul>
      <p className="text-[10px] leading-snug text-slate-500">
        Antwortet auf die Frage: wenn das System 75 % sagt, trifft es dann auch ~75 %? Ueberschaetzte Buckets erzeugen automatisch eine Warnung an den betroffenen Picks.
      </p>
    </section>
  );
}

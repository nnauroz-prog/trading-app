'use client';

// Lern-Overlay zur Akademie. Liest das akademie-log und blendet ein,
// wie stabil der Lehrling-Best-Strategie-Vorschlag in letzter Zeit war
// und wie sich der Späher-News-Tilt verschoben hat. Reine Visualisierung
// der schon vorhandenen lehrlingStability + spaeherTrend Funktionen.

import { useEffect, useState } from 'react';
import { AKADEMIE_LOG_CHANGED_EVENT, lehrlingStability, loadAkademieLog, spaeherTrend, type LehrlingStability, type SpaeherTrend } from '@/lib/akademie/memory';

const MIN_DAYS = 4;

export function AkademieLearningOverlay() {
  const [lehrling, setLehrling] = useState<LehrlingStability | null>(null);
  const [spaeher, setSpaeher] = useState<SpaeherTrend | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => {
      const log = loadAkademieLog();
      setLehrling(lehrlingStability(log));
      setSpaeher(spaeherTrend(log));
    };
    sync();
    setMounted(true);
    window.addEventListener(AKADEMIE_LOG_CHANGED_EVENT, sync);
    return () => window.removeEventListener(AKADEMIE_LOG_CHANGED_EVENT, sync);
  }, []);

  if (!mounted) return null;
  if (!lehrling || !spaeher) return null;
  // Ehrliche Stille, wenn zu wenig Daten — kein vorgetaeuschter Lern-Effekt.
  if (spaeher.totalDays < MIN_DAYS) return null;

  return (
    <section className="rounded-2xl border border-sky-400/30 bg-sky-950/15 p-3 text-[11px] leading-snug text-sky-100/90">
      <div className="text-[9.5px] font-semibold uppercase tracking-wider text-sky-300">Akademie · Lern-Status</div>
      <p className="mt-1">
        <span className="font-semibold text-white">Lehrling:</span>{' '}
        Beste Strategie-Variante <span className="font-mono text-sky-200">{lehrling.currentBestId ?? '—'}</span> seit <span className="font-mono text-sky-200">{lehrling.daysStable} Tag{lehrling.daysStable === 1 ? '' : 'en'}</span> stabil
        {lehrling.totalSwitches > 0 && <> (insgesamt <span className="font-mono">{lehrling.totalSwitches}×</span> gewechselt)</>}
        . Durchschnittliche Netto-Rendite <span className="font-mono">{lehrling.avgNetReturnPct >= 0 ? '+' : ''}{lehrling.avgNetReturnPct} %</span>.
      </p>
      <p className="mt-1">
        <span className="font-semibold text-white">Späher:</span>{' '}
        {spaeher.bias === 'bullisch' && <>News-Lage im Schnitt <span className="text-emerald-300">bullisch</span></>}
        {spaeher.bias === 'bärisch' && <>News-Lage im Schnitt <span className="text-rose-300">bärisch</span></>}
        {spaeher.bias === 'neutral' && <>News-Lage im Schnitt <span className="text-slate-300">neutral</span></>}
        {' '}über <span className="font-mono">{spaeher.totalDays}</span> Tag{spaeher.totalDays === 1 ? '' : 'e'}
        {spaeher.recentShift && spaeher.recentShift !== 'stabil' && (
          <> · zuletzt <span className="text-sky-200">{spaeher.recentShift}</span></>
        )}.
      </p>
    </section>
  );
}

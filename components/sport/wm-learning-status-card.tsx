'use client';

// WM Lern-Stand: zeigt was das System aus den bereits gespielten Picks
// gelernt hat. Pro Faktor: aktuelles Label, Multiplier, Sample-Size,
// historische Hit-Rate mit vs. ohne Faktor.
//
// Versteckt sich ehrlich, solange weniger als 5 Picks ueberhaupt geloggt
// sind — vorher waere jede Aussage Theater.
//
// Wording strikt ohne verbotene Begriffe.

import { useEffect, useMemo, useState } from 'react';
import {
  loadWmPickLog,
  WM_PICK_LEARNING_CHANGED_EVENT
} from '@/lib/sport/wm-pick-learning-store';
import {
  deriveFactorWeights,
  evaluateFactorPerformance,
  evaluateTierPerformance,
  KNOWN_FACTOR_IDS,
  type WmPickLogEntry
} from '@/lib/sport/wm-pick-learning';

const FACTOR_LABEL: Record<string, string> = {
  'acclimatization': 'Akklimatisierung',
  'altitude': 'Hoehenlage',
  'jetlag': 'Jetlag',
  'host-advantage': 'Gastgeber-Heimvorteil',
  'regional-crowd': 'Publikums-Sympathie',
  'hot-midday': 'Mittagshitze',
  'rest-days': 'Erholungstage',
  'weather': 'Live-Wetter',
  'confederation-home': 'Konfoederations-Heimvorteil',
  'phase-pressure': 'Phase-Druck',
  'venue-familiarity': 'Stadion-Vertrautheit',
  'travel-distance': 'Reisedistanz'
};

const STATUS_CLASS: Record<string, string> = {
  'BESTAETIGT': 'border-emerald-500/40 bg-emerald-950/15 text-emerald-100',
  'NEUTRAL': 'border-slate-700 bg-slate-900/40 text-slate-300',
  'KONTRA': 'border-rose-500/40 bg-rose-950/20 text-rose-100',
  'UNKLAR': 'border-slate-700 bg-slate-900/40 text-slate-300'
};

export function WmLearningStatusCard() {
  const [log, setLog] = useState<WmPickLogEntry[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setLog(loadWmPickLog());
    sync();
    setMounted(true);
    window.addEventListener(WM_PICK_LEARNING_CHANGED_EVENT, sync);
    return () => window.removeEventListener(WM_PICK_LEARNING_CHANGED_EVENT, sync);
  }, []);

  const weightMap = useMemo(() => deriveFactorWeights(log), [log]);
  const tierStats = useMemo(() => evaluateTierPerformance(log), [log]);
  const perFactor = useMemo(() => KNOWN_FACTOR_IDS.map((id) => evaluateFactorPerformance(log, id)), [log]);

  if (!mounted) return null;
  // Versteckt sich solange Sample zu klein ist (< 5 Picks geloggt).
  if (log.length < 5) {
    return null;
  }

  const totalResolved = weightMap.totalResolved;

  return (
    <section className="space-y-3 rounded-2xl border border-sky-400/30 bg-sky-950/15 p-3" aria-label="WM Lern-Stand">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-300">Live-Lern-Stand des Systems</h3>
        <span className="text-[10px] text-sky-200/70">{log.length} Picks geloggt · {totalResolved} resolved</span>
      </div>

      {totalResolved === 0 ? (
        <p className="text-[11px] leading-snug text-sky-100/80">
          Picks sind geloggt, aber noch keine Spielergebnisse aufgeloest. Sobald die ersten Spiele fertig sind, baut sich hier pro Faktor eine empirische Hit-Rate auf — das System gewichtet die Faktoren dann nach echtem Lift.
        </p>
      ) : (
        <p className="text-[11px] leading-snug text-sky-100/80">
          Auf Basis der echten WM-Ergebnisse passt das System die Faktor-Gewichte an. BESTAETIGT verstaerkt, KONTRA daempft, UNKLAR bleibt neutral bis mindestens 8 Picks pro Seite vorliegen.
        </p>
      )}

      <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {tierStats.filter((t) => t.total > 0).map((t) => (
          <li key={t.tier} className="rounded border border-slate-800/60 bg-slate-950/30 p-2">
            <div className="text-[9px] uppercase tracking-wider text-slate-500">{t.tier === 'hoechste-konfluenz' ? 'Hoechste Konfluenz' : 'Modell-Favorit'}</div>
            <div className="font-mono text-base font-bold text-slate-100">{t.hitRatePct ?? '—'}{t.hitRatePct !== null ? ' %' : ''}</div>
            <div className="text-[9.5px] text-slate-500">{t.wins} von {t.resolved} resolved · {t.total} geloggt</div>
          </li>
        ))}
      </ul>

      <details className="rounded border border-slate-800/60 bg-slate-950/30 p-2">
        <summary className="cursor-pointer text-[10.5px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200">
          ▸ Faktor-Gewichte aktiv ({perFactor.filter((p) => p.label !== 'UNKLAR').length} aktiv, {perFactor.filter((p) => p.label === 'UNKLAR').length} noch UNKLAR)
        </summary>
        <ul className="mt-2 space-y-1">
          {perFactor.map((p) => (
            <li key={p.factorId} className={`rounded border px-2 py-1.5 text-[10.5px] ${STATUS_CLASS[p.label]}`}>
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-semibold">{FACTOR_LABEL[p.factorId] ?? p.factorId}</span>
                <span className="font-mono text-[10px] opacity-80">{p.label}</span>
                <span className="ml-auto font-mono text-[10px] font-bold">×{p.weightMultiplier.toFixed(2)}</span>
              </div>
              <div className="mt-0.5 text-[9.5px] opacity-80">
                {p.picksWithFactor > 0 || p.picksWithoutFactor > 0 ? (
                  <>
                    Mit Faktor: {p.winsWithFactor}/{p.picksWithFactor}
                    {p.hitRateWithFactor !== null ? ` (${Math.round(p.hitRateWithFactor * 100)} %)` : ''}
                    {' · '}
                    Ohne: {p.winsWithoutFactor}/{p.picksWithoutFactor}
                    {p.hitRateWithoutFactor !== null ? ` (${Math.round(p.hitRateWithoutFactor * 100)} %)` : ''}
                    {p.liftPct !== null && (
                      <span className="ml-1 font-mono">Lift {p.liftPct >= 0 ? '+' : ''}{p.liftPct} pp</span>
                    )}
                  </>
                ) : (
                  <>Noch keine resolved Picks mit/ohne diesen Faktor.</>
                )}
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-1.5 text-[9.5px] leading-snug text-slate-500">
          Multiplier zwischen 0.50 und 1.30. Anwendung im naechsten Pick-Lauf: BESTAETIGT verstaerkt den Conditions-ELO-Effekt, KONTRA daempft ihn. Tor-Multiplier bleiben unveraendert (physiologisch fundiert).
        </p>
      </details>
    </section>
  );
}

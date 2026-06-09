'use client';

// Pro-Fixture-Panel: User markiert, welche Stamm-Spieler fehlen oder welche
// Sondersituation gilt. Die Engine multipliziert lambdaHome / lambdaAway
// entsprechend und rechnet 1X2 + wahrscheinlichstes Ergebnis live neu durch.
//
// Bewusst minimalistisch: Toggle-Checkboxes, sofortige Visualisierung des
// Effekts auf die Wahrscheinlichkeiten und den likelyScore.

import { useEffect, useMemo, useState } from 'react';
import {
  applySquadAdjustment,
  recomputePoissonProbs,
  SQUAD_FACTOR_META,
  type SquadFactor
} from '@/lib/sport/squad-override';
import {
  SQUAD_OVERRIDES_CHANGED_EVENT,
  loadSquadOverride,
  setSquadOverride
} from '@/lib/sport/squad-override-store';

interface Props {
  fixtureId: string;
  homeTeam: string;
  awayTeam: string;
  baseLambdaHome: number;
  baseLambdaAway: number;
  // Server-Wahrscheinlichkeiten (vor Override) — fuer die Vergleichsanzeige.
  basePHome: number;
  basePDraw: number;
  basePAway: number;
}

const FACTOR_ORDER: SquadFactor[] = [
  'top-scorer-out',
  'goalkeeper-out',
  'center-back-out',
  'multiple-starters-out',
  'fully-focused',
  'rotation-mode'
];

function fmtPct(v: number): string {
  return `${Math.round(v * 100)} %`;
}

export function SquadOverridePanel(props: Props) {
  const [home, setHome] = useState<SquadFactor[]>([]);
  const [away, setAway] = useState<SquadFactor[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => {
      const stored = loadSquadOverride(props.fixtureId);
      setHome(stored?.homeFactors ?? []);
      setAway(stored?.awayFactors ?? []);
    };
    sync();
    setMounted(true);
    window.addEventListener(SQUAD_OVERRIDES_CHANGED_EVENT, sync);
    return () => window.removeEventListener(SQUAD_OVERRIDES_CHANGED_EVENT, sync);
  }, [props.fixtureId]);

  const adj = useMemo(
    () => applySquadAdjustment(mounted && (home.length > 0 || away.length > 0)
      ? { fixtureId: props.fixtureId, homeFactors: home, awayFactors: away, updatedAt: 0 }
      : null),
    [home, away, props.fixtureId, mounted]
  );

  const adjustedLambdaHome = props.baseLambdaHome * adj.homeLambdaMul;
  const adjustedLambdaAway = props.baseLambdaAway * adj.awayLambdaMul;
  const adjusted = useMemo(
    () => recomputePoissonProbs(adjustedLambdaHome, adjustedLambdaAway),
    [adjustedLambdaHome, adjustedLambdaAway]
  );

  if (!mounted) return null;

  const toggle = (side: 'home' | 'away', factor: SquadFactor) => {
    const current = side === 'home' ? home : away;
    const next = current.includes(factor)
      ? current.filter((f) => f !== factor)
      : [...current, factor];
    if (side === 'home') {
      setHome(next);
      setSquadOverride(props.fixtureId, next, away);
    } else {
      setAway(next);
      setSquadOverride(props.fixtureId, home, next);
    }
  };

  const totalActive = home.length + away.length;
  const probDelta = adjusted.pHome - props.basePHome;
  const meaningfulShift = Math.abs(probDelta) >= 0.03;

  return (
    <details className="rounded-lg border border-slate-800 bg-slate-950/40">
      <summary className="cursor-pointer p-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200">
        ⚙ Aufstellung / Situation anpassen
        {totalActive > 0 && (
          <span className="ml-2 rounded border border-amber-400/50 bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-200">
            {totalActive} aktiv
          </span>
        )}
        {meaningfulShift && (
          <span className={`ml-2 font-mono text-[10px] ${probDelta > 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
            Heim {probDelta > 0 ? '+' : ''}{Math.round(probDelta * 100)} %-Punkte
          </span>
        )}
      </summary>
      <div className="space-y-3 p-3 pt-0">
        <p className="text-[10px] leading-snug text-slate-500">
          Markiere, was Du ueber das Spiel weisst, das das Modell nicht sieht. Die Engine multipliziert die erwarteten Tore pro Seite und rechnet 1X2 + wahrscheinlichstes Ergebnis live neu.
        </p>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <FactorCol
            label={props.homeTeam}
            side="home"
            selected={home}
            onToggle={(f) => toggle('home', f)}
          />
          <FactorCol
            label={props.awayTeam}
            side="away"
            selected={away}
            onToggle={(f) => toggle('away', f)}
          />
        </div>

        {totalActive > 0 && (
          <div className="space-y-2 rounded-md border border-amber-400/40 bg-amber-950/15 p-2">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-300">Angepasste Prognose</div>
            <div className="grid grid-cols-3 gap-1.5 text-center">
              <ProbCell
                label={`Heim (${props.homeTeam.split(' ')[0]})`}
                base={props.basePHome}
                adjusted={adjusted.pHome}
              />
              <ProbCell label="Remis" base={props.basePDraw} adjusted={adjusted.pDraw} />
              <ProbCell
                label={`Ausw. (${props.awayTeam.split(' ')[0]})`}
                base={props.basePAway}
                adjusted={adjusted.pAway}
              />
            </div>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[10.5px]">
              <span className="text-slate-400">Wahrscheinlichstes Ergebnis:</span>
              <span className="font-mono font-bold text-white">
                {adjusted.likelyScore.home} : {adjusted.likelyScore.away}
              </span>
              <span className="text-slate-500">
                (Tor-Erwartung × {adj.homeLambdaMul.toFixed(2)} | × {adj.awayLambdaMul.toFixed(2)})
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setHome([]);
                setAway([]);
                setSquadOverride(props.fixtureId, [], []);
              }}
              className="rounded border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] text-slate-400 hover:border-rose-400/50 hover:text-rose-300"
            >
              Alle zuruecksetzen
            </button>
          </div>
        )}
      </div>
    </details>
  );
}

function FactorCol({
  label,
  side,
  selected,
  onToggle
}: {
  label: string;
  side: 'home' | 'away';
  selected: SquadFactor[];
  onToggle: (f: SquadFactor) => void;
}) {
  const tone = side === 'home' ? 'border-emerald-500/30' : 'border-sky-500/30';
  return (
    <div className={`space-y-1.5 rounded-md border ${tone} bg-slate-950/40 p-2`}>
      <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
      <ul className="space-y-1">
        {FACTOR_ORDER.map((f) => {
          const meta = SQUAD_FACTOR_META[f];
          const checked = selected.includes(f);
          return (
            <li key={f}>
              <label className={`flex cursor-pointer items-start gap-1.5 rounded px-1 py-0.5 text-[10.5px] leading-snug hover:bg-slate-900/60 ${checked ? 'text-slate-100' : 'text-slate-400'}`}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(f)}
                  className="mt-0.5 accent-amber-400"
                />
                <span>
                  <span aria-hidden className="mr-0.5">{meta.emoji}</span>
                  <span className="font-semibold">{meta.label}</span>
                  <span className="block text-[9.5px] text-slate-500">{meta.description}</span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ProbCell({ label, base, adjusted }: { label: string; base: number; adjusted: number }) {
  const delta = adjusted - base;
  const tone = delta > 0.01 ? 'text-emerald-300' : delta < -0.01 ? 'text-rose-300' : 'text-slate-300';
  return (
    <div className="rounded border border-slate-800 bg-slate-950/40 p-1">
      <div className="text-[8.5px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`font-mono text-sm font-bold ${tone}`}>{fmtPct(adjusted)}</div>
      <div className="font-mono text-[8.5px] text-slate-500">
        was {fmtPct(base)} · Δ {delta > 0 ? '+' : ''}{Math.round(delta * 100)} pp
      </div>
    </div>
  );
}

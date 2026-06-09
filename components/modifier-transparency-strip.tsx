// Ehrliche Modifier-Transparenz pro Spiel. Zeigt fuer alle vier Modifier
// (Wetter, H2H, Schiri, Squad-User-Override) einen Status: aktiv mit Wert,
// inaktiv weil kein Signal, oder deaktiviert weil Backtest negativ.
// Spaltbar als Tooltip / details — Default kompakt.

'use client';

import { useEffect, useState } from 'react';
import {
  SQUAD_OVERRIDES_CHANGED_EVENT,
  loadSquadOverride
} from '@/lib/sport/squad-override-store';
import { applySquadAdjustment } from '@/lib/sport/squad-override';
import type { MatchPrediction } from '@/lib/sport/predictor';

interface Props {
  fixtureId: string;
  prediction: MatchPrediction;
}

interface Row {
  label: string;
  emoji: string;
  status: 'active' | 'no-signal' | 'disabled' | 'user-off';
  detail: string;
}

export function ModifierTransparencyStrip({ fixtureId, prediction }: Props) {
  const [squadActive, setSquadActive] = useState(false);
  const [squadCount, setSquadCount] = useState(0);

  useEffect(() => {
    const sync = () => {
      const ov = loadSquadOverride(fixtureId);
      if (!ov) {
        setSquadActive(false);
        setSquadCount(0);
        return;
      }
      const adj = applySquadAdjustment(ov);
      setSquadActive(adj.totalFactors > 0);
      setSquadCount(adj.totalFactors);
    };
    sync();
    window.addEventListener(SQUAD_OVERRIDES_CHANGED_EVENT, sync);
    return () => window.removeEventListener(SQUAD_OVERRIDES_CHANGED_EVENT, sync);
  }, [fixtureId]);

  const rows: Row[] = [
    prediction.weather
      ? {
          label: 'Wetter',
          emoji: '🌦',
          status: prediction.weather.lambdaMultiplier === 1 ? 'no-signal' : 'active',
          detail: prediction.weather.factors.join(' · ')
        }
      : { label: 'Wetter', emoji: '🌦', status: 'no-signal', detail: 'Kein Forecast verfuegbar (Stadion unbekannt oder ausserhalb 7-Tage-Fenster)' },
    prediction.h2hMod
      ? {
          label: 'H2H',
          emoji: '⚔',
          status: 'active',
          detail: prediction.h2hMod.factors.join(' · ')
        }
      : {
          label: 'H2H',
          emoji: '⚔',
          status: 'no-signal',
          detail: 'Kein H2H-Signal (zu wenig Duelle, neutrale Bilanz oder per Backtest deaktiviert)'
        },
    prediction.refereeTendencies
      ? {
          label: 'Schiri',
          emoji: '⚖',
          status: 'active',
          detail: prediction.refereeTendencies.summary
        }
      : {
          label: 'Schiri',
          emoji: '⚖',
          status: 'no-signal',
          detail: 'Kein Schiri-Signal (unbekannt, zu wenig Spiele oder per Backtest deaktiviert)'
        },
    squadActive
      ? {
          label: 'Squad',
          emoji: '⚙',
          status: 'active',
          detail: `${squadCount} User-Faktor${squadCount === 1 ? '' : 'en'} aktiv (Topscorer / Torwart / Rotation etc.)`
        }
      : {
          label: 'Squad',
          emoji: '⚙',
          status: 'user-off',
          detail: 'Kein User-Override gesetzt — Modell rechnet mit Standard-Aufstellung'
        }
  ];

  const activeCount = rows.filter((r) => r.status === 'active').length;

  return (
    <details className="rounded-md border border-slate-800 bg-slate-950/40 text-[10.5px]">
      <summary className="cursor-pointer p-1.5 font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-300">
        🔍 Modifier-Transparenz · {activeCount} von 4 aktiv
      </summary>
      <ul className="space-y-1 p-1.5 pt-0">
        {rows.map((r) => (
          <li
            key={r.label}
            className={`flex items-start gap-1.5 rounded border px-1.5 py-1 ${
              r.status === 'active'
                ? 'border-emerald-400/30 bg-emerald-500/5 text-emerald-100'
                : r.status === 'disabled'
                ? 'border-amber-400/30 bg-amber-500/5 text-amber-100'
                : 'border-slate-800 bg-slate-950/40 text-slate-400'
            }`}
          >
            <span aria-hidden className="text-base leading-none">{r.emoji}</span>
            <span className="flex-1">
              <span className="font-semibold">{r.label}</span>{' '}
              <span className="text-[9.5px] uppercase tracking-wider opacity-70">
                {r.status === 'active' ? 'aktiv' : r.status === 'disabled' ? 'auto-deaktiviert' : r.status === 'user-off' ? 'kein User-Eingriff' : 'kein Signal'}
              </span>
              <div className="text-[9.5px] leading-snug opacity-80">{r.detail}</div>
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}

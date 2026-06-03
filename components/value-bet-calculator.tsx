'use client';

import { useState } from 'react';
import { impliedOdds } from '@/lib/sport/implied-odds';

interface Props {
  pHome: number;
  pDraw: number;
  pAway: number;
  homeTeam: string;
  awayTeam: string;
}

type Side = 'home' | 'draw' | 'away';

const SIDE_LABEL: Record<Side, (home: string, away: string) => string> = {
  home: (h) => `${h} gewinnt`,
  draw: () => 'Remis',
  away: (_, a) => `${a} gewinnt`
};

// Value-Bet-Rechner: User trägt die echte Tipico-Quote ein, App vergleicht
// mit der fairen Modell-Quote. Ergebnis: positiver Erwartungswert (Value Bet)
// oder negativer (schlechter Wert).
export function ValueBetCalculator({ pHome, pDraw, pAway, homeTeam, awayTeam }: Props) {
  const [side, setSide] = useState<Side>('home');
  const [tipicoOdds, setTipicoOdds] = useState<string>('');

  const sideProb = side === 'home' ? pHome : side === 'draw' ? pDraw : pAway;
  const fairOdds = impliedOdds(sideProb);
  const tipicoNum = parseFloat(tipicoOdds.replace(',', '.'));
  const validTipico = Number.isFinite(tipicoNum) && tipicoNum > 1;

  // Erwartungswert pro 1 € Einsatz: prob × (odds - 1) - (1 - prob)
  const ev = validTipico ? sideProb * (tipicoNum - 1) - (1 - sideProb) : 0;
  const evPct = validTipico ? Math.round(ev * 1000) / 10 : 0;
  const isValueBet = ev > 0;

  return (
    <details className="rounded-xl border border-slate-700 bg-slate-950/40 p-3">
      <summary className="cursor-pointer text-[10.5px] font-semibold uppercase tracking-wider text-slate-300 hover:text-emerald-300">
        ▸ Value-Bet-Rechner — lohnt sich der Tipp bei Tipico?
      </summary>
      <div className="mt-3 space-y-2">
        <p className="text-[10px] leading-snug text-slate-500">
          Trage hier die Tipico-Quote ein. Liegt sie höher als unsere faire Modell-Quote, hast du einen positiven Erwartungswert (Value Bet).
        </p>

        <div className="grid grid-cols-3 gap-2 text-[10.5px]">
          {(['home', 'draw', 'away'] as Side[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSide(s)}
              className={`rounded-md border px-2 py-1.5 ${side === s ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100' : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-emerald-400/40'}`}
            >
              {SIDE_LABEL[s](homeTeam, awayTeam)}
              <div className="font-mono text-[9.5px] text-slate-500">{Math.round((s === 'home' ? pHome : s === 'draw' ? pDraw : pAway) * 100)} %</div>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-[9px] uppercase tracking-wider text-slate-500">Faire Modell-Quote</div>
            <div className="mt-0.5 font-mono text-base font-bold text-amber-300">{fairOdds.toFixed(2).replace('.', ',')}</div>
          </div>
          <label className="block">
            <span className="text-[9px] uppercase tracking-wider text-slate-500">Tipico-Quote</span>
            <input
              type="text"
              inputMode="decimal"
              value={tipicoOdds}
              onChange={(e) => setTipicoOdds(e.target.value)}
              placeholder="z. B. 2,15"
              className="mt-0.5 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 font-mono text-[12px] text-slate-100 focus:border-emerald-400/60 focus:outline-none"
            />
          </label>
        </div>

        {validTipico ? (
          <div className={`rounded-lg border-2 p-2.5 ${isValueBet ? 'border-emerald-400/60 bg-emerald-950/20' : 'border-rose-400/40 bg-rose-950/15'}`}>
            <div className={`text-[10px] font-bold uppercase tracking-wider ${isValueBet ? 'text-emerald-300' : 'text-rose-300'}`}>
              {isValueBet ? '✓ Value Bet — Tipico besser als fair' : '✗ Schlechter Wert — Tipico zu niedrig'}
            </div>
            <div className="mt-1 text-[11px] leading-snug text-slate-200">
              Erwartungswert pro 1 € Einsatz:{' '}
              <span className={`font-mono font-bold ${isValueBet ? 'text-emerald-200' : 'text-rose-200'}`}>
                {isValueBet ? '+' : ''}{evPct} %
              </span>
              {isValueBet && (
                <span className="text-slate-500"> · langfristig profitabel</span>
              )}
              {!isValueBet && (
                <span className="text-slate-500"> · Tipico nimmt die Margin</span>
              )}
            </div>
          </div>
        ) : (
          <p className="text-[10px] leading-snug text-slate-500">
            Trage die echte Tipico-Quote ein um den Vergleich zu sehen.
          </p>
        )}
      </div>
    </details>
  );
}

'use client';

import { useState } from 'react';
import { addTip } from '@/lib/sport/tip-journal';

interface Props {
  fixtureId: string;
  fixtureDate: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  modelHomeProbability: number; // 0..1
  modelDrawProbability: number;
  modelAwayProbability: number;
  // Optional: Quality-Kontext, wenn schon bekannt
  qualityScore?: number;
  qualityBand?: 'sehr_stark' | 'stark' | 'brauchbar' | 'orientierung' | 'nicht_verwenden';
  dataQuality?: 'good' | 'medium' | 'weak';
}

// Eigener Tipp pro Spiel: User wählt Ausgang ODER trägt sein exaktes Wunsch-
// Ergebnis ein, App vergleicht später automatisch im Tagebuch.
// Anders als TipSaveButton: kein vorgegebener Markt, sondern freie Eingabe.
export function CustomTipInput(props: Props) {
  const [scoreHome, setScoreHome] = useState('');
  const [scoreAway, setScoreAway] = useState('');
  const [side, setSide] = useState<'home' | 'draw' | 'away' | 'exact' | null>(null);

  const submitOutcome = (which: 'home' | 'draw' | 'away') => {
    const market = which === 'home' ? `Heimsieg ${props.homeTeam}`
      : which === 'draw' ? 'Unentschieden'
      : `Auswärtssieg ${props.awayTeam}`;
    const prob = which === 'home' ? props.modelHomeProbability
      : which === 'draw' ? props.modelDrawProbability
      : props.modelAwayProbability;
    addTip({
      fixtureId: props.fixtureId,
      date: props.fixtureDate,
      league: props.league,
      homeTeam: props.homeTeam,
      awayTeam: props.awayTeam,
      tier: 'custom',
      market,
      modelProbabilityPct: Math.round(prob * 100),
      qualityScore: props.qualityScore,
      qualityBand: props.qualityBand,
      dataQuality: props.dataQuality,
      isStableMarket: false
    });
    setSide(which);
  };

  const submitExact = () => {
    const h = parseInt(scoreHome, 10);
    const a = parseInt(scoreAway, 10);
    if (!Number.isFinite(h) || !Number.isFinite(a) || h < 0 || a < 0 || h > 12 || a > 12) return;
    addTip({
      fixtureId: props.fixtureId,
      date: props.fixtureDate,
      league: props.league,
      homeTeam: props.homeTeam,
      awayTeam: props.awayTeam,
      tier: 'custom',
      market: `Ergebnis ${h}:${a}`,
      modelProbabilityPct: 0,
      qualityScore: props.qualityScore,
      qualityBand: props.qualityBand,
      dataQuality: props.dataQuality,
      isStableMarket: false
    });
    setSide('exact');
  };

  return (
    <details className="rounded-lg border border-slate-700 bg-slate-950/40 p-2.5">
      <summary className="cursor-pointer text-[10.5px] font-semibold uppercase tracking-wider text-slate-300 hover:text-emerald-300">
        ▸ Deinen eigenen Tipp festhalten
      </summary>
      <div className="mt-2 space-y-2">
        <p className="text-[10px] leading-snug text-slate-500">
          Schnelle Wahl: Heimsieg / Remis / Auswärtssieg. Oder gib dein exaktes Wunsch-Ergebnis ein.
        </p>

        <div className="grid grid-cols-3 gap-1.5 text-[10.5px]">
          <button
            type="button"
            onClick={() => submitOutcome('home')}
            className={`rounded-md border px-2 py-1.5 ${side === 'home' ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100' : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-emerald-400/40'}`}
          >
            {props.homeTeam}
          </button>
          <button
            type="button"
            onClick={() => submitOutcome('draw')}
            className={`rounded-md border px-2 py-1.5 ${side === 'draw' ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100' : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-emerald-400/40'}`}
          >
            Remis
          </button>
          <button
            type="button"
            onClick={() => submitOutcome('away')}
            className={`rounded-md border px-2 py-1.5 ${side === 'away' ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100' : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-emerald-400/40'}`}
          >
            {props.awayTeam}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="number"
            value={scoreHome}
            onChange={(e) => setScoreHome(e.target.value)}
            min={0}
            max={12}
            inputMode="numeric"
            placeholder="Heim"
            className="w-16 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-center font-mono text-sm text-slate-100 focus:border-emerald-400/60 focus:outline-none"
          />
          <span className="text-slate-500">:</span>
          <input
            type="number"
            value={scoreAway}
            onChange={(e) => setScoreAway(e.target.value)}
            min={0}
            max={12}
            inputMode="numeric"
            placeholder="Auswärts"
            className="w-16 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-center font-mono text-sm text-slate-100 focus:border-emerald-400/60 focus:outline-none"
          />
          <button
            type="button"
            onClick={submitExact}
            disabled={scoreHome === '' || scoreAway === ''}
            className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-2 py-1 text-[10.5px] text-emerald-200 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            speichern
          </button>
        </div>

        {side && (
          <p className="text-[10px] text-emerald-300">
            ✓ Tipp ins Tagebuch übernommen — wird automatisch ausgewertet, sobald das Ergebnis da ist.
          </p>
        )}
      </div>
    </details>
  );
}

// Top-8-Ranking-Karte: kompaktes Ranking direkt unter dem Hero.
// Server-Component, keine Interaktivitaet.

import type { TournamentWinnerPrediction } from '@/lib/sports/world-cup-prediction-engine';

interface Props {
  ranking: TournamentWinnerPrediction[];
}

const TREND_GLYPH = {
  up: '↑',
  down: '↓',
  stable: '·',
  unknown: ''
} as const;

const TREND_TONE = {
  up: 'text-emerald-300',
  down: 'text-rose-300',
  stable: 'text-slate-400',
  unknown: 'text-slate-600'
} as const;

const DQ_DOT_TONE = {
  strong: 'bg-emerald-400',
  medium: 'bg-sky-400',
  weak: 'bg-amber-400'
} as const;

const DQ_LABEL = {
  strong: 'Datenqualität stark',
  medium: 'Datenqualität mittel',
  weak: 'Datenqualität schwach'
} as const;

export function WmDashboardTop8({ ranking }: Props) {
  if (ranking.length === 0) {
    return (
      <section
        aria-label="Top 8 Sieger-Ranking"
        className="rounded-2xl border border-slate-700/60 bg-slate-900/40 p-4"
      >
        <h3 className="text-[12px] font-bold uppercase tracking-wider text-slate-300">
          Top 8 Sieger-Ranking
        </h3>
        <p className="mt-2 text-[11px] text-slate-400">
          Keine echten WM-Team-Daten verfügbar — Ranking kann nicht berechnet werden.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-label="Top 8 Sieger-Ranking"
      className="rounded-2xl border border-slate-700/60 bg-slate-900/40 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[12px] font-bold uppercase tracking-[0.18em] text-slate-200">
          Top 8 Sieger-Ranking
        </h3>
        <span className="text-[10px] text-slate-500">{ranking.length} Teams</span>
      </div>

      <ol className="mt-3 space-y-1.5">
        {ranking.map((r, idx) => (
          <li
            key={r.team}
            className="grid grid-cols-[1.5rem_1fr_auto_auto] items-baseline gap-2 rounded border border-slate-800 bg-slate-950/50 px-2.5 py-2 sm:gap-3 sm:px-3"
          >
            <span className="font-mono text-[12px] font-bold text-slate-400">{idx + 1}.</span>
            <div className="min-w-0">
              <div className="truncate text-[13px] font-bold text-slate-100">{r.team}</div>
              {r.reasons[0] && (
                <div className="truncate text-[10.5px] text-slate-400">{r.reasons[0]}</div>
              )}
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-[13px] font-bold text-emerald-200">{r.winProbability.toFixed(1)}%</span>
              {r.trend !== 'unknown' && (
                <span className={`text-[12px] ${TREND_TONE[r.trend]}`} aria-label={`Trend ${r.trend}`}>
                  {TREND_GLYPH[r.trend]}
                </span>
              )}
            </div>
            <span
              className={`h-2 w-2 rounded-full ${DQ_DOT_TONE[r.dataQuality]}`}
              aria-label={DQ_LABEL[r.dataQuality]}
              title={DQ_LABEL[r.dataQuality]}
            />
          </li>
        ))}
      </ol>

      <p className="mt-3 text-[10px] text-slate-500">
        Modell-Tendenz, keine Garantie. Punkt rechts = Datenqualität.
      </p>
    </section>
  );
}

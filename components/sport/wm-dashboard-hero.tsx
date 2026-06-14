// Hero-Card: Top-Favorit auf einen Blick. Ganz oben auf der /wm-
// Seite. Keine Garantie-Sprache, ehrlicher Empty-State.

import type { TournamentWinnerPrediction } from '@/lib/sports/world-cup-prediction-engine';

interface Props {
  topFavorite: TournamentWinnerPrediction | null;
  lastUpdated: string;
}

const CONF_LABEL = {
  high: 'Hoch',
  medium: 'Mittel',
  low: 'Niedrig'
} as const;

const DQ_LABEL = {
  strong: 'Stark',
  medium: 'Mittel',
  weak: 'Schwach'
} as const;

const CONF_TONE = {
  high: 'border-emerald-400/50 bg-emerald-500/10 text-emerald-100',
  medium: 'border-sky-400/40 bg-sky-500/10 text-sky-100',
  low: 'border-amber-400/40 bg-amber-500/10 text-amber-100'
} as const;

const DQ_TONE = {
  strong: 'border-emerald-400/40 bg-emerald-500/5 text-emerald-200',
  medium: 'border-slate-500/40 bg-slate-700/30 text-slate-200',
  weak: 'border-amber-400/40 bg-amber-500/5 text-amber-200'
} as const;

function fmtUpdated(iso: string): string {
  try {
    return new Date(iso).toLocaleString('de-DE', {
      timeZone: 'Europe/Berlin',
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return iso;
  }
}

export function WmDashboardHero({ topFavorite, lastUpdated }: Props) {
  if (!topFavorite) {
    return (
      <section
        aria-label="WM Top-Favorit"
        className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-5 text-center"
      >
        <p className="text-[12px] text-slate-300">
          Keine belastbare WM-Sieger-Prognose möglich, weil aktuelle Spieldaten oder Teamdaten fehlen.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-label="WM Top-Favorit"
      className="rounded-2xl border border-emerald-400/40 bg-gradient-to-br from-emerald-950/60 to-slate-900/80 p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-300/90">
          Aktueller Top-Favorit
        </span>
        <span className="text-[10px] text-slate-400">
          Aktualisiert: {fmtUpdated(lastUpdated)}
        </span>
      </div>

      <h2 className="mt-2 text-3xl font-bold tracking-tight text-emerald-50 sm:text-4xl">
        {topFavorite.team}
      </h2>

      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-mono text-2xl font-bold text-emerald-200 sm:text-3xl">
          {topFavorite.winProbability.toFixed(1)} %
        </span>
        <span className="text-[11px] text-emerald-200/70">Turniersieg-Wahrscheinlichkeit (Modell)</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${CONF_TONE[topFavorite.confidence]}`}>
          Confidence: {CONF_LABEL[topFavorite.confidence]}
        </span>
        <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${DQ_TONE[topFavorite.dataQuality]}`}>
          Datenqualität: {DQ_LABEL[topFavorite.dataQuality]}
        </span>
      </div>

      {topFavorite.reasons.length > 0 && (
        <div className="mt-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-300/70">
            Gründe
          </div>
          <ul className="mt-1.5 space-y-1 text-[12px] leading-snug text-slate-200">
            {topFavorite.reasons.map((r, idx) => (
              <li key={idx} className="flex gap-2">
                <span aria-hidden="true" className="text-emerald-400">•</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {topFavorite.warnings.length > 0 && (
        <div className="mt-3 rounded border border-amber-400/40 bg-amber-500/5 p-2.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300/80">
            Warnung
          </div>
          <ul className="mt-1 space-y-0.5 text-[11px] leading-snug text-amber-100/90">
            {topFavorite.warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-4 text-[10px] text-slate-500">
        Modell-Tendenz, keine Garantie. Keine Wett-Empfehlung.
      </p>
    </section>
  );
}

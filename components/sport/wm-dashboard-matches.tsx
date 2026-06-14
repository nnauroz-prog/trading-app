// Naechste Spiele mit Prognose. Pro Match: Favorit-Markierung,
// Wahrscheinlichkeiten Heim/Remis/Auswaerts, erwarteter Bereich,
// Confidence, Gründe, Warnungen.

import type { MatchPrediction } from '@/lib/sports/world-cup-prediction-engine';
import { utcToBerlin } from '@/lib/sport/wm-utc-to-berlin';

interface Props {
  matches: MatchPrediction[];
}

const CONF_LABEL = { high: 'Hoch', medium: 'Mittel', low: 'Niedrig' } as const;
const DQ_LABEL = { strong: 'Stark', medium: 'Mittel', weak: 'Schwach' } as const;

function fmtDateTime(startTime: string | null): { date: string; time: string } {
  if (!startTime) return { date: '—', time: '—' };
  const dateIso = startTime.slice(0, 10);
  const time = startTime.slice(11, 16);
  const berlin = utcToBerlin(dateIso, time);
  let formattedDate = berlin.dateIso;
  try {
    const d = new Date(`${berlin.dateIso}T12:00:00Z`);
    formattedDate = d.toLocaleDateString('de-DE', {
      timeZone: 'Europe/Berlin',
      weekday: 'short', day: '2-digit', month: '2-digit'
    });
  } catch {
    // fallback bleibt ISO
  }
  return { date: formattedDate, time: berlin.time ?? '—' };
}

export function WmDashboardMatches({ matches }: Props) {
  if (matches.length === 0) {
    return (
      <section
        aria-label="Nächste Spiele mit Prognose"
        className="rounded-2xl border border-slate-700/60 bg-slate-900/40 p-4"
      >
        <h3 className="text-[12px] font-bold uppercase tracking-wider text-slate-300">
          Nächste Spiele mit Prognose
        </h3>
        <p className="mt-2 text-[11px] text-slate-400">
          Keine kommenden Spiele — WM vorbei oder Spielpause.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-label="Nächste Spiele mit Prognose"
      className="rounded-2xl border border-slate-700/60 bg-slate-900/40 p-4 sm:p-5"
    >
      <h3 className="text-[12px] font-bold uppercase tracking-[0.18em] text-slate-200">
        Nächste Spiele mit Prognose
      </h3>

      <ul className="mt-3 space-y-3">
        {matches.map((m) => (
          <MatchCard key={m.matchId} match={m} />
        ))}
      </ul>

      <p className="mt-3 text-[10px] text-slate-500">
        Zeiten in Berlin-Zeit. Modell-Tendenz, keine Garantie.
      </p>
    </section>
  );
}

function MatchCard({ match }: { match: MatchPrediction }) {
  const { date, time } = fmtDateTime(match.startTime);
  const noPrediction = match.predictedWinner === 'unknown';
  const draw = match.probabilities.draw ?? 0;
  const favTone = (s: 'teamA' | 'teamB' | 'draw') =>
    match.predictedWinner === s
      ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100'
      : 'border-slate-700 bg-slate-950/40 text-slate-200';

  return (
    <li className="rounded-xl border border-slate-700/80 bg-slate-950/60 p-3 sm:p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-1.5">
        <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">
          {match.round}
        </span>
        <span className="font-mono text-[10px] text-slate-300">
          {date} · {time}
        </span>
      </div>

      <div className="mt-2 text-[15px] font-bold leading-tight text-slate-50">
        {match.teamA} <span className="text-slate-500">vs</span> {match.teamB}
      </div>

      {noPrediction ? (
        <div className="mt-3 rounded border border-amber-400/40 bg-amber-500/5 p-2.5 text-[11px] text-amber-100/90">
          {match.warnings[0] ?? 'Keine belastbare Ergebnisprognose möglich.'}
        </div>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            <div className={`rounded border px-2 py-1.5 text-center ${favTone('teamA')}`}>
              <div className="font-mono text-[14px] font-bold">{match.probabilities.teamA}%</div>
              <div className="mt-0.5 truncate text-[9.5px] opacity-80">{match.teamA}</div>
            </div>
            <div className={`rounded border px-2 py-1.5 text-center ${favTone('draw')}`}>
              <div className="font-mono text-[14px] font-bold">{draw}%</div>
              <div className="mt-0.5 text-[9.5px] opacity-80">Remis</div>
            </div>
            <div className={`rounded border px-2 py-1.5 text-center ${favTone('teamB')}`}>
              <div className="font-mono text-[14px] font-bold">{match.probabilities.teamB}%</div>
              <div className="mt-0.5 truncate text-[9.5px] opacity-80">{match.teamB}</div>
            </div>
          </div>

          {match.expectedScoreRange && (
            <div className="mt-3 rounded border border-slate-700 bg-slate-900/60 px-2.5 py-1.5 text-[11px]">
              <span className="font-bold uppercase tracking-wider text-slate-400">Erwartetes Ergebnis</span>{' '}
              <span className="font-mono text-slate-100">{match.expectedScoreRange}</span>
            </div>
          )}

          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded border border-slate-700 bg-slate-900/60 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-slate-300">
              Confidence: {CONF_LABEL[match.confidence]}
            </span>
            <span className="rounded border border-slate-700 bg-slate-900/60 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-slate-300">
              Datenqualität: {DQ_LABEL[match.dataQuality]}
            </span>
          </div>

          {match.reasons.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-[11px] leading-snug text-slate-300">
              {match.reasons.map((r, idx) => (
                <li key={idx} className="flex gap-1.5">
                  <span aria-hidden="true" className="text-emerald-400">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          )}

          {match.warnings.length > 0 && (
            <div className="mt-2 rounded border border-amber-400/40 bg-amber-500/5 px-2 py-1 text-[10.5px] text-amber-100/90">
              {match.warnings.join(' · ')}
            </div>
          )}
        </>
      )}
    </li>
  );
}

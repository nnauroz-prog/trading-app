// Direkt unter dem Liga-Accordion-Header: die drei stärksten Spiele dieser
// Liga (gerankt nach Quality-Score), kompakt, mit Score-Chip. Spart den
// User, durch jeden Tipp einzeln zu klicken.

import type { LeagueFixtures } from '@/lib/sport/fetcher';
import { computePredictionQualityScore, pickStablePrediction } from '@/lib/sport/prediction-quality-score';

interface Props {
  league: LeagueFixtures;
  limit?: number;
}

function fmtTime(date: string, time: string | null): string {
  if (!time) return '—';
  const d = new Date(`${date}T${time}:00Z`);
  if (Number.isNaN(d.getTime())) return time;
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });
}

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'Europe/Berlin' });
}

function bandChipClass(band: string): string {
  if (band === 'sehr_stark') return 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200';
  if (band === 'stark') return 'border-sky-400/40 bg-sky-500/10 text-sky-200';
  if (band === 'brauchbar') return 'border-amber-400/40 bg-amber-500/10 text-amber-100';
  if (band === 'orientierung') return 'border-slate-700 bg-slate-800/40 text-slate-300';
  return 'border-rose-500/40 bg-rose-500/10 text-rose-200';
}

export function LigaTop3Snapshot({ league, limit = 3 }: Props) {
  const scored = league.next
    .filter((f) => f.prediction)
    .map((f) => {
      const rec = pickStablePrediction(f.prediction!, f.probabilities);
      const sample = (f.probabilities?.homeGamesUsed ?? f.prediction!.homeGames ?? 0)
        + (f.probabilities?.awayGamesUsed ?? f.prediction!.awayGames ?? 0);
      return {
        fixture: f,
        quality: computePredictionQualityScore({ fixture: f, recommendation: rec, sampleSize: sample })
      };
    })
    .sort((a, b) => b.quality.score - a.quality.score)
    .slice(0, limit);

  if (scored.length === 0) return null;

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-2.5">
      <div className="mb-1.5 text-[10px] uppercase tracking-wider text-slate-500">
        Top {scored.length} Prognosen dieser Liga (Quality-Score)
      </div>
      <ul className="space-y-1">
        {scored.map((s, i) => (
          <li key={s.fixture.id} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2">
            <span className="font-mono text-[10px] text-slate-500">#{i + 1}</span>
            <span className="min-w-0 truncate text-[11px] text-slate-100">
              <span className="font-semibold">{s.fixture.homeTeam} – {s.fixture.awayTeam}</span>
              <span className="text-slate-500"> · {s.quality.recommendation.label}</span>
            </span>
            <span className="font-mono text-[9.5px] text-slate-500">{fmtDate(s.fixture.date)} {fmtTime(s.fixture.date, s.fixture.time)}</span>
            <span className={`rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold ${bandChipClass(s.quality.band)}`}>{s.quality.score}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

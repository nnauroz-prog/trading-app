'use client';

import { useMemo, useState } from 'react';
import type { LeagueFixtures } from '@/lib/sport/fetcher';
import { computePredictionQualityScore, pickStablePrediction } from '@/lib/sport/prediction-quality-score';

interface Props {
  leagues: LeagueFixtures[];
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

// Auswahl-basierter Liga-Spotlight: User wählt eine Liga, sieht die nächsten
// drei Begegnungen mit Quality-Score in einem Block.
export function LigaSpotlight({ leagues }: Props) {
  const active = leagues.filter((l) => l.next.length > 0);
  const [selected, setSelected] = useState<string>(active[0]?.league.id ?? '');

  const lf = leagues.find((l) => l.league.id === selected) ?? active[0];

  const top = useMemo(() => {
    if (!lf) return [];
    return lf.next
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
      .sort((a, b) => b.quality.score - a.quality.score);
  }, [lf]);

  if (active.length === 0) return null;

  return (
    <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Liga-Spotlight</h2>
        <span className="text-[10px] text-slate-500">{active.length} Ligen aktiv</span>
      </div>
      <select
        value={selected || active[0].league.id}
        onChange={(e) => setSelected(e.target.value)}
        className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-[11.5px] text-slate-100 focus:border-emerald-400/60 focus:outline-none"
        aria-label="Liga auswählen"
      >
        {active.map((l) => (
          <option key={l.league.id} value={l.league.id}>
            {l.league.name} · {l.league.country} ({l.next.length})
          </option>
        ))}
      </select>
      {top.length > 0 ? (
        <ul className="space-y-1">
          {top.map((t) => (
            <li key={t.fixture.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-md border border-slate-800 bg-slate-950/40 px-2.5 py-1.5 text-[11px]">
              <span className="font-mono text-[10px] text-slate-500">{fmtDate(t.fixture.date)} {fmtTime(t.fixture.date, t.fixture.time)}</span>
              <span className="min-w-0 truncate text-slate-100">
                <span className="font-semibold">{t.fixture.homeTeam} – {t.fixture.awayTeam}</span>
                <span className="text-slate-500"> · {t.quality.recommendation.label}</span>
              </span>
              <span className="rounded border border-emerald-400/40 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-200">{t.quality.score}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[10.5px] text-slate-500">Diese Liga hat aktuell keine Prognosen — Datenlage zu dünn.</p>
      )}
    </section>
  );
}

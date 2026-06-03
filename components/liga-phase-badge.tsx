// Schmales Phase-Chip für jeden Liga-Accordion-Header. Reine Anzeige.

import { leagueSeasonProgress } from '@/lib/sport/season-progress';
import type { LeagueFixtures } from '@/lib/sport/fetcher';

interface Props {
  league: LeagueFixtures;
}

const PHASE_COLOR: Record<string, string> = {
  Pause: 'border-slate-700 bg-slate-900/40 text-slate-400',
  Saisonstart: 'border-sky-400/40 bg-sky-500/10 text-sky-200',
  Hinrunde: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200',
  Winterpause: 'border-cyan-400/40 bg-cyan-500/10 text-cyan-200',
  Rückrunde: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200',
  Endspurt: 'border-amber-400/40 bg-amber-500/10 text-amber-200',
  beendet: 'border-rose-400/40 bg-rose-500/10 text-rose-200'
};

export function LigaPhaseBadge({ league }: Props) {
  const p = leagueSeasonProgress(league);
  const cls = PHASE_COLOR[p.phase] ?? PHASE_COLOR.Pause;
  return (
    <span
      className={`rounded-md border px-1.5 py-0.5 text-[9.5px] uppercase tracking-wider ${cls}`}
      title={`${p.finishedGames}/${p.estimatedTotal} Spiele (~${p.percent}%)`}
    >
      {p.phase}
    </span>
  );
}

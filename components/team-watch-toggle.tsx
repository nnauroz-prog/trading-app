'use client';

import { useEffect, useState } from 'react';
import { TEAM_WATCHLIST_CHANGED_EVENT, isTeamWatched, toggleTeamWatch } from '@/lib/sport/team-watchlist';

export function TeamWatchToggle({ team, league }: { team: string; league: string }) {
  const [watched, setWatched] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setWatched(isTeamWatched(team, league));
    sync();
    setMounted(true);
    window.addEventListener(TEAM_WATCHLIST_CHANGED_EVENT, sync);
    return () => window.removeEventListener(TEAM_WATCHLIST_CHANGED_EVENT, sync);
  }, [team, league]);

  if (!mounted) return null;
  return (
    <button
      type="button"
      onClick={() => toggleTeamWatch(team, league)}
      className={`rounded-md border px-1.5 py-0.5 text-[9.5px] uppercase tracking-wider ${
        watched
          ? 'border-emerald-400/60 bg-emerald-950/30 text-emerald-300'
          : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-emerald-400/60 hover:text-emerald-300'
      }`}
      aria-pressed={watched}
    >
      {watched ? '✓ folgt' : '+ Folgen'}
    </button>
  );
}

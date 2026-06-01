'use client';

import { useEffect, useState } from 'react';
import { TEAM_WATCHLIST_CHANGED_EVENT, TeamWatchEntry, loadTeamWatchlist, toggleTeamWatch } from '@/lib/sport/team-watchlist';

interface TeamWatchInput {
  team: string;
  league: string;
  form?: { wins: number; draws: number; losses: number; points: number; goalDiff: number; played: number; streak: number };
  nextOpponent?: { opponent: string; date: string; isHome: boolean };
}

// Renders a list of teams the user is following. Cross-references the form
// info coming from server-side analysis so each row shows fresh data.
export function TeamWatchlistPanel({ candidates }: { candidates: TeamWatchInput[] }) {
  const [watched, setWatched] = useState<TeamWatchEntry[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setWatched(loadTeamWatchlist());
    sync();
    setMounted(true);
    window.addEventListener(TEAM_WATCHLIST_CHANGED_EVENT, sync);
    return () => window.removeEventListener(TEAM_WATCHLIST_CHANGED_EVENT, sync);
  }, []);

  if (!mounted) return null;

  return (
    <section className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Meine Teams</h2>
        <p className="mt-0.5 text-[10.5px] leading-snug text-slate-500">
          Teams, die du explizit verfolgst. Form-Zahlen aus den letzten 5 Liga-Spielen. Klick „Folgen“ auf einem Team unten in der Liste, um es hier aufzunehmen.
        </p>
      </div>
      {watched.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-700 bg-slate-950/40 p-3 text-center text-[11px] text-slate-500">
          Noch keine Teams gefolgt. Scrolle zu den Liga-Übersichten und tipp „+ Folgen“.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {watched.map((w) => {
            const info = candidates.find((c) => c.team === w.team && c.league === w.league);
            return (
              <li key={`${w.team}::${w.league}`} className="space-y-1 rounded-lg border border-slate-800 bg-slate-950/40 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-[12px] font-semibold text-white">{w.team}</div>
                    <div className="truncate text-[10px] text-slate-500">{w.league}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleTeamWatch(w.team, w.league)}
                    className="rounded-md border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] text-slate-300 hover:border-rose-400/60 hover:text-rose-300"
                  >
                    nicht mehr folgen
                  </button>
                </div>
                {info?.form && info.form.played > 0 ? (
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10.5px] text-slate-400">
                    <span>
                      <span className="font-mono text-emerald-300">{info.form.wins}S</span>{' '}
                      <span className="font-mono text-slate-300">{info.form.draws}U</span>{' '}
                      <span className="font-mono text-rose-300">{info.form.losses}N</span>{' '}
                      <span className="text-slate-600">(letzte {info.form.played})</span>
                    </span>
                    <span>Tor-Diff: <span className="font-mono">{info.form.goalDiff >= 0 ? '+' : ''}{info.form.goalDiff}</span></span>
                    {info.form.streak !== 0 && (
                      <span className={info.form.streak > 0 ? 'text-emerald-300' : 'text-rose-300'}>
                        {info.form.streak > 0 ? `${info.form.streak} S in Folge` : `${Math.abs(info.form.streak)} N in Folge`}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="text-[10.5px] text-slate-500">Keine aktuelle Form-Daten — gerade keine letzten Spiele im Feed.</div>
                )}
                {info?.nextOpponent ? (
                  <div className="text-[10.5px] text-slate-400">
                    Nächstes Spiel: <span className="font-semibold text-slate-200">{info.nextOpponent.opponent}</span>{' '}
                    <span className="text-slate-500">({info.nextOpponent.isHome ? 'Heim' : 'Auswärts'}, {info.nextOpponent.date})</span>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

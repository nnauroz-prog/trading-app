'use client';

import { useEffect, useState } from 'react';
import { TEAM_WATCHLIST_CHANGED_EVENT, TeamWatchEntry, loadTeamWatchlist, setTeamNote, toggleTeamWatch } from '@/lib/sport/team-watchlist';

interface TeamWatchInput {
  team: string;
  league: string;
  form?: {
    wins: number;
    draws: number;
    losses: number;
    points: number;
    goalDiff: number;
    played: number;
    streak: number;
    sequence?: ('W' | 'D' | 'L')[];
    goalsFor?: number;
    goalsAgainst?: number;
  };
  nextOpponent?: { opponent: string; date: string; isHome: boolean };
}

function TeamNoteEditor({ team, league, initial }: { team: string; league: string; initial: string }) {
  const [value, setValue] = useState(initial);
  const [open, setOpen] = useState(false);
  useEffect(() => setValue(initial), [initial]);
  return (
    <details open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary className="cursor-pointer text-[10px] uppercase tracking-wider text-slate-500 hover:text-slate-300">
        ▸ {initial ? 'Notiz bearbeiten' : 'Notiz schreiben'}{initial && <span className="ml-1 normal-case tracking-normal text-slate-400">— {initial.slice(0, 40)}{initial.length > 40 ? '…' : ''}</span>}
      </summary>
      <div className="mt-1.5 space-y-1">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="z. B. Verletzung Top-Stürmer, Stadion ausverkauft, Trainerwechsel ..."
          rows={2}
          className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 focus:border-emerald-400/60 focus:outline-none"
        />
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => { setTeamNote(team, league, value); setOpen(false); }}
            className="rounded-md border border-emerald-400/50 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-200 hover:border-emerald-300"
          >
            Notiz speichern
          </button>
        </div>
      </div>
    </details>
  );
}

function GoalsBar({ goalsFor, goalsAgainst }: { goalsFor: number; goalsAgainst: number }) {
  const total = goalsFor + goalsAgainst;
  if (total === 0) return null;
  const pctFor = Math.round((goalsFor / total) * 100);
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-sm border border-slate-800 bg-slate-950" title={`${goalsFor} Tore geschossen · ${goalsAgainst} Gegentore`}>
      <div className="bg-emerald-500/70" style={{ width: `${pctFor}%` }} />
      <div className="bg-rose-500/70" style={{ width: `${100 - pctFor}%` }} />
    </div>
  );
}

function FormSparkline({ sequence }: { sequence: ('W' | 'D' | 'L')[] }) {
  if (sequence.length === 0) return null;
  return (
    <span className="inline-flex gap-0.5" aria-label="Form der letzten Spiele">
      {sequence.map((r, i) => {
        const color =
          r === 'W' ? 'bg-emerald-500/80 text-emerald-50' : r === 'L' ? 'bg-rose-500/80 text-rose-50' : 'bg-slate-600 text-slate-100';
        const label = r === 'W' ? 'Sieg' : r === 'L' ? 'Niederlage' : 'Unentschieden';
        return (
          <span
            key={i}
            title={label}
            className={`inline-block h-3 w-3 rounded-sm text-center text-[8.5px] font-bold leading-3 ${color}`}
          >
            {r === 'W' ? 'S' : r === 'L' ? 'N' : 'U'}
          </span>
        );
      })}
    </span>
  );
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
                  <div className="space-y-1">
                    {info.form.sequence && info.form.sequence.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500">Verlauf:</span>
                        <FormSparkline sequence={info.form.sequence} />
                      </div>
                    )}
                    {info.form.goalsFor !== undefined && info.form.goalsAgainst !== undefined && (info.form.goalsFor + info.form.goalsAgainst) > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 w-12">Tore:</span>
                        <div className="flex-1">
                          <GoalsBar goalsFor={info.form.goalsFor} goalsAgainst={info.form.goalsAgainst} />
                        </div>
                        <span className="font-mono text-[10px] text-slate-400">
                          <span className="text-emerald-300">{info.form.goalsFor}</span>:<span className="text-rose-300">{info.form.goalsAgainst}</span>
                        </span>
                      </div>
                    )}
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
                <TeamNoteEditor team={w.team} league={w.league} initial={w.note ?? ''} />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

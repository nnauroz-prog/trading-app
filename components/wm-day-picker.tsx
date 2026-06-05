'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { WM_2026_FIXTURES, type WmFixture } from '@/lib/sport/wm-schedule-2026';
import { predictWinner } from '@/lib/sport/winner-verdict';
import { WinnerVerdictCard } from '@/components/winner-verdict-card';
import { WmTipButton } from '@/components/wm-tip-button';

interface Props {
  todayIso: string;
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime()) / (24 * 60 * 60 * 1000));
}

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'Europe/Berlin' });
}

// Interaktiver WM-Tagesfilter: User wählt einen Spieltag, sieht alle Spiele
// des Tages mit klarer Gewinner-Prognose. Bis 8 Tage in die Zukunft, sonst
// wird die Liste unübersichtlich.
export function WmDayPicker({ todayIso }: Props) {
  const upcoming = useMemo(() => WM_2026_FIXTURES
    .filter((f) => daysBetween(todayIso, f.date) >= 0 && daysBetween(todayIso, f.date) <= 60)
    .sort((a, b) => a.date.localeCompare(b.date)), [todayIso]);

  // Verfügbare Tage extrahieren.
  const days = useMemo(() => {
    const set = new Set<string>();
    upcoming.forEach((f) => set.add(f.date));
    return [...set].slice(0, 14);
  }, [upcoming]);

  const [selected, setSelected] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (days.length > 0) setSelected(days[0]);
  }, [days]);

  if (!mounted) return null;

  // Eröffnung außerhalb 30-Tage-Fenster → ausblenden.
  if (days.length === 0) return null;
  if (daysBetween(todayIso, days[0]) > 30) return null;

  const dayMatches: WmFixture[] = upcoming.filter((f) => f.date === selected);

  return (
    <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
          WM-Tag wählen
        </h2>
        <Link href="/wm" className="text-[10px] text-emerald-300 hover:text-emerald-200">→ ganzer Plan</Link>
      </div>
      <div className="mt-2 flex gap-1 overflow-x-auto pb-1">
        {days.map((d) => {
          const active = d === selected;
          return (
            <button
              key={d}
              type="button"
              onClick={() => setSelected(d)}
              className={`shrink-0 rounded-md border px-2 py-1 text-[10.5px] transition ${
                active
                  ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100'
                  : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-emerald-400/40'
              }`}
            >
              {fmtDate(d)}
              <span className="ml-1 font-mono text-[9px] opacity-60">
                {upcoming.filter((f) => f.date === d).length}
              </span>
            </button>
          );
        })}
      </div>

      {dayMatches.length === 0 ? (
        <p className="mt-3 text-[10.5px] text-slate-500">Keine Spiele an diesem Tag.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {dayMatches.map((f) => {
            const hasTeams = !f.homeTeam.includes('TBD') && !f.awayTeam.includes('TBD');
            return (
              <li key={f.id} className="space-y-1.5 rounded-md border border-slate-800 bg-slate-950/40 p-2">
                <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 text-[11.5px]">
                  <span className="font-mono text-[10px] text-slate-500">{f.time ?? '—'}</span>
                  <span className="min-w-0 truncate text-slate-100">
                    <span className="font-semibold">{f.homeTeam}</span>
                    <span className="mx-1 text-slate-500">–</span>
                    <span className="font-semibold">{f.awayTeam}</span>
                  </span>
                  <span className="rounded-md border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-slate-400">
                    {f.phase}{f.group ? ` ${f.group}` : ''}
                  </span>
                </div>
                {hasTeams ? (
                  <>
                    <WinnerVerdictCard
                      verdict={predictWinner({
                        homeTeam: f.homeTeam, awayTeam: f.awayTeam,
                        prediction: null, h2h: null, finishedPool: [],
                        sport: 'football'
                      })}
                      homeTeam={f.homeTeam} awayTeam={f.awayTeam}
                      showExtraTime={f.phase !== 'Gruppe'}
                      compact={f.phase === 'Gruppe'}
                    />
                    <WmTipButton fixture={f} />
                  </>
                ) : (
                  <p className="text-[10px] text-slate-500">Paarung steht erst nach Auslosung fest — kein Tipp möglich.</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

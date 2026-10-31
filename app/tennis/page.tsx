import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { LiveScoreboard } from '@/components/sport/live-scoreboard';
import { getTennisFixtures } from '@/lib/sport/tennis-fetcher';

export const metadata: Metadata = { title: 'Tennis · Spiele und Ergebnisse', description: 'Aktuelle Spiele und Satzstände. Weitere Turniere und Termine findest du unten.' };
export const dynamic = 'force-dynamic';
export const revalidate = 600;

function formatDate(date: string, time?: string | null): string {
  const value = new Date(`${date}T${time ?? '12:00'}:00Z`);
  if (Number.isNaN(value.getTime())) return date;
  const day = value.toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin', weekday: 'short', day: '2-digit', month: '2-digit' });
  return time ? `${day} · ${value.toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' })} Uhr` : `${day} · Zeit noch offen`;
}

async function MoreGames() {
  const leagues = await getTennisFixtures();
  const available = leagues.filter(league => league.next.length > 0 || league.last.length > 0);
  if (available.length === 0) return <p className="mt-4 text-sm leading-relaxed text-slate-400">Für weitere Turniere sind gerade keine Termine geladen. Die aktuellen Ergebnisse oben kannst du weiterhin ansehen.</p>;
  return <div className="mt-4 space-y-5">{available.map(league => <section key={league.league.id} className="space-y-3">
    <h2 className="text-base font-semibold text-slate-100">{league.league.name}</h2>
    {league.next.length > 0 && <><p className="text-sm text-slate-400">Kommende Spiele</p><ul className="space-y-2">{league.next.map(game => <li key={game.id} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3"><p className="text-xs text-cyan-200">{formatDate(game.date, game.time)}</p><p className="mt-1 text-sm text-slate-100">{game.homeTeam} <span className="text-slate-500">gegen</span> {game.awayTeam}</p>{game.venue && <p className="mt-1 text-xs text-slate-400">{game.venue}</p>}</li>)}</ul></>}
    {league.last.length > 0 && <details className="rounded-lg border border-slate-800 p-3"><summary className="cursor-pointer text-sm text-slate-400">Letzte Ergebnisse</summary><ul className="mt-3 space-y-2">{league.last.map(game => <li key={game.id} className="border-t border-slate-800 pt-3"><p className="text-xs text-slate-500">{formatDate(game.date)}</p><p className="mt-1 text-sm text-slate-200">{game.homeTeam} <strong className="mx-1 font-mono text-white">{game.homeScore ?? '–'} : {game.awayScore ?? '–'}</strong> {game.awayTeam}</p></li>)}</ul></details>}
  </section>)}<p className="text-xs leading-relaxed text-slate-500">Diese zusätzlichen Spielpläne kommen von TheSportsDB. Sie können unvollständig sein. Alle Zeiten sind für Deutschland angegeben.</p></div>;
}

export default function TennisPage() {
  return <main className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
    <Link href="/sport" className="inline-flex min-h-10 items-center text-sm text-slate-400 hover:text-cyan-200">← Alle Sportarten</Link>
    <header className="space-y-3"><h1 className="text-3xl font-semibold text-white sm:text-5xl">Tennis</h1><p className="max-w-2xl text-sm leading-relaxed text-slate-400">Aktuelle Spiele und Satzstände. Weitere Turniere und Termine findest du unten.</p></header>
    <LiveScoreboard initialSport="tennis" />
    <details className="terminal-panel p-4 sm:p-5"><summary className="cursor-pointer text-sm font-medium text-slate-300">Weitere Ligen, Termine und Ergebnisse</summary><Suspense fallback={<p className="mt-4 text-sm text-slate-400">Spielplan wird geladen …</p>}><MoreGames /></Suspense></details>
  </main>;
}

import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { getHandballFixtures } from '@/lib/sport/multi-sport-fetcher';

export const metadata: Metadata = { title: 'Handball · Termine und Ergebnisse', description: 'Kommende Handball-Spiele und die letzten Ergebnisse.' };
export const dynamic = 'force-dynamic';
export const revalidate = 600;

function formatDate(date: string, time?: string | null): string {
  const value = new Date(`${date}T${time ?? '12:00'}:00Z`);
  if (Number.isNaN(value.getTime())) return date;
  const day = value.toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin', weekday: 'short', day: '2-digit', month: '2-digit' });
  return time ? `${day} · ${value.toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' })} Uhr` : `${day} · Zeit noch offen`;
}

async function Games() {
  const leagues = (await getHandballFixtures()).filter(league => league.next.length > 0 || league.last.length > 0);
  if (leagues.length === 0) return <section className="terminal-panel p-5"><h2 className="text-lg font-semibold text-white">Gerade sind keine Spiele geladen.</h2><p className="mt-2 text-sm leading-relaxed text-slate-400">Versuch es später noch einmal. Einen laufend aktualisierten Handball-Spielstand können wir derzeit nicht anbieten.</p></section>;
  return <div className="space-y-5">{leagues.map(league => <section key={league.league.id} className="terminal-panel space-y-4 p-5"><h2 className="text-lg font-semibold text-white">{league.league.name}</h2>{league.next.length > 0 && <><h3 className="text-sm text-slate-400">Kommende Spiele</h3><ul className="space-y-3">{league.next.map(game => <li key={game.id} className="rounded-lg border border-slate-800 p-3"><p className="text-xs text-cyan-200">{formatDate(game.date, game.time)}</p><p className="mt-1 text-sm text-slate-100">{game.homeTeam} <span className="text-slate-500">gegen</span> {game.awayTeam}</p></li>)}</ul></>}{league.last.length > 0 && <details className="rounded-lg border border-slate-800 p-3"><summary className="cursor-pointer text-sm text-slate-400">Letzte Ergebnisse</summary><ul className="mt-3 space-y-3">{league.last.map(game => <li key={game.id} className="border-t border-slate-800 pt-3"><p className="text-xs text-slate-500">{formatDate(game.date)}</p><p className="mt-1 text-sm text-slate-100">{game.homeTeam} <strong className="mx-1 font-mono">{game.homeScore ?? '–'} : {game.awayScore ?? '–'}</strong> {game.awayTeam}</p></li>)}</ul></details>}</section>)}<p className="text-xs text-slate-500">Die Spielpläne kommen von TheSportsDB und können unvollständig sein. Alle Zeiten sind für Deutschland angegeben.</p></div>;
}
export default function HandballPage() {
  return <main className="mx-auto max-w-5xl space-y-6 p-4 md:p-6"><Link href="/sport" className="inline-flex min-h-10 items-center text-sm text-slate-400 hover:text-cyan-200">← Alle Sportarten</Link><header className="space-y-3"><h1 className="text-3xl font-semibold text-white sm:text-5xl">Handball</h1><p className="max-w-xl text-sm leading-relaxed text-slate-400">Wer spielt als Nächstes? Hier findest du Termine und letzte Ergebnisse, soweit sie verfügbar sind.</p></header><Suspense fallback={<p className="text-sm text-slate-400">Spielplan wird geladen …</p>}><Games /></Suspense></main>;
}

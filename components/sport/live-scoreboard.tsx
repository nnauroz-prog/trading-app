'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, Clock3, RefreshCw, ShieldAlert } from 'lucide-react';
import { LIVE_SPORTS, type LiveGame, type LiveScoreboard as Scoreboard, type LiveSport } from '@/lib/sport/live-scoreboard';
import { GamePrediction } from '@/components/sport/game-prediction';

export function LiveScoreboard({ initialSport = 'football' }: { initialSport?: LiveSport }) {
  const [sport, setSport] = useState<LiveSport>(initialSport);
  const [storedData, setData] = useState<Scoreboard | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const data = storedData?.sport === sport ? storedData : null;
  useEffect(() => {
    const controller = new AbortController();
    let busy = false;
    setData(previous => previous?.sport === sport ? previous : null);
    setError(false);
    setLoading(true);
    const load = async () => {
      if (busy || document.visibilityState === 'hidden') return;
      busy = true;
      try {
        const response = await fetch(`/api/sport/live?sport=${sport}`, { cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error('unavailable');
        const result = await response.json() as Scoreboard;
        if (controller.signal.aborted) return;
        setData(result);
        setError(false);
      } catch {
        if (!controller.signal.aborted) setError(true);
      } finally {
        busy = false;
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 30_000);
    document.addEventListener('visibilitychange', load);
    return () => { controller.abort(); window.clearInterval(timer); document.removeEventListener('visibilitychange', load); };
  }, [sport, retry]);

  const liveCount = data && !error ? data.games.filter(game => game.state === 'in').length : null;

  return (
    <section aria-label="Live-Sportergebnisse" className="terminal-panel relative overflow-hidden border border-cyan-300/25 bg-[#0c141f]">
      <header className="flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-white sm:text-2xl">Spiele und Ergebnisse</h2>
          <p className="text-sm text-slate-400">{liveCount === null ? 'Die Spielstände aktualisieren sich automatisch.' : data && data.failedFeeds > 0 ? 'Nicht alle Spielstände sind gerade verfügbar.' : liveCount > 0 ? `${liveCount} ${liveCount === 1 ? 'Spiel läuft' : 'Spiele laufen'} gerade.` : 'Gerade läuft hier kein Spiel.'}</p>
        </div>
        <button type="button" onClick={() => setRetry(n => n + 1)} className="terminal-button min-h-11 text-xs"><RefreshCw size={15} aria-hidden />Jetzt aktualisieren</button>
      </header>
      <div className="space-y-4 px-5 pb-5 sm:px-6 sm:pb-6">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Sportart für Live-Ergebnisse">
          {(Object.keys(LIVE_SPORTS) as LiveSport[]).map(key => <button type="button" key={key} aria-pressed={sport === key} onClick={() => { if (key !== sport) { setSport(key); setError(false); setLoading(true); } }} className={`flex min-h-11 items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition ${sport === key ? 'border-cyan-300/60 bg-cyan-300/10 text-cyan-200' : 'border-slate-800 bg-white/[0.02] text-slate-400 hover:border-slate-600 hover:text-white'}`}>{LIVE_SPORTS[key].label}{sport === key && <ArrowUpRight size={14} className="shrink-0" aria-hidden />}</button>)}
        </div>
        <div aria-live="polite" className="text-sm">
          {loading && <div className="flex items-center gap-3 rounded-lg border border-slate-800 p-4 text-slate-400"><RefreshCw size={16} className="animate-spin text-cyan-300 motion-reduce:animate-none" aria-hidden />Spielstände werden geladen …</div>}
          {error && <div className="flex items-start gap-3 rounded-lg border border-amber-400/25 bg-amber-400/[0.05] p-4 text-amber-100"><ShieldAlert size={17} className="mt-0.5 shrink-0" aria-hidden /><p>Wir können die Ergebnisse gerade nicht laden. {data ? 'Die angezeigten Spielstände können inzwischen älter sein.' : 'Versuch es gleich noch einmal.'}</p></div>}
          {!loading && !error && data?.games.length === 0 && <div className="rounded-lg border border-dashed border-slate-700 p-6 text-center"><Clock3 size={20} className="mx-auto mb-3 text-slate-500" aria-hidden /><p className="font-medium text-slate-200">Heute sind hier keine Spiele eingetragen.</p><p className="mt-2 text-sm text-slate-400">Schau später noch einmal oder wähle eine andere Sportart.</p></div>}
        </div>
        {data && <>
          {data.failedFeeds > 0 && <p className="border-l-2 border-amber-400/60 pl-3 text-sm leading-relaxed text-amber-200">Einige Ergebnisse fehlen gerade. Die Liste kann unvollständig sein.</p>}
          <ul className="space-y-3 pr-1 md:max-h-[38rem] md:overflow-y-auto">
            {data.games.map(game => {
              const live = !error && game.state === 'in';
              return <li key={game.id} className={`relative overflow-hidden rounded-xl border p-4 sm:p-5 ${live ? 'border-cyan-300/40 bg-cyan-300/[0.04]' : 'border-slate-800 bg-[#070b12]/65'}`}>
                <div className="flex items-start justify-between gap-3"><span className="min-w-0 text-xs leading-relaxed text-slate-400">{leagueName(game.league)}</span><span className={`inline-flex shrink-0 items-center gap-1.5 rounded border px-2 py-1 text-xs font-medium ${live ? 'border-emerald-300/35 bg-emerald-300/[0.07] text-emerald-200' : error ? 'border-amber-400/20 text-amber-200' : 'border-slate-800 text-slate-400'}`}>{live && <span className="h-1.5 w-1.5 rounded-full bg-current" />}{error ? 'Nicht aktuell' : live ? 'LIVE' : game.state === 'post' ? 'Spiel beendet' : `${formatTime(game.startsAt)} Uhr`}</span></div>
                <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-5"><span className="min-w-0 break-words text-sm font-medium leading-snug text-slate-100 sm:text-base">{game.home}</span><div className="text-center"><strong className="whitespace-nowrap font-mono text-2xl font-medium tabular-nums text-white sm:text-3xl">{game.homeScore ?? '–'}<span className="mx-1.5 text-slate-600">:</span>{game.awayScore ?? '–'}</strong>{game.scoreUnit && <span className="mt-1 block text-xs text-slate-400">{game.scoreUnit}</span>}</div><span className="min-w-0 break-words text-right text-sm font-medium leading-snug text-slate-100 sm:text-base">{game.away}</span></div>
                {(game.state !== 'post' || game.scoreDetail) && <p className="mt-4 border-t border-slate-800 pt-3 text-xs text-slate-400">{game.state === 'pre' ? 'Noch nicht begonnen.' : runningDetail(game, sport)}{game.scoreDetail && <span className="ml-2 font-mono text-slate-300">{game.scoreDetail}</span>}</p>}
                <GamePrediction game={game} sport={sport} scoresStale={error} />
              </li>;
            })}
          </ul>
          {data.fetchedAt && <p className="flex items-center gap-2 text-xs text-slate-500"><Clock3 size={13} className="shrink-0" aria-hidden /><span>Zuletzt aktualisiert: {formatTime(data.fetchedAt)} Uhr</span></p>}
        </>}
        <details className="border-t border-slate-800 pt-3 text-xs text-slate-500"><summary className="cursor-pointer py-2 text-slate-400 hover:text-cyan-200">Welche Spiele werden gezeigt?</summary><p className="mt-2 max-w-3xl leading-relaxed">Fußball aus den großen europäischen Ligen, Champions League und WM, dazu NBA, NHL und Tennis von ATP und WTA. Die Ergebnisse kommen von ESPN und werden alle 30 Sekunden neu geladen, solange du die Seite ansiehst. Einzelne Spielstände können verspätet eintreffen. Alle Zeiten sind für Deutschland angegeben.</p></details>
      </div>
    </section>
  );
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' });
}
function leagueName(value: string): string {
  return value.replace('National Basketball Association', 'NBA').replace('National Hockey League', 'NHL').replace('English Premier League', 'Premier League').replace('German Bundesliga', 'Bundesliga');
}
function runningDetail(game: LiveGame, sport: LiveSport): string {
  if (game.state === 'post') return game.scoreDetail ? 'Sätze:' : '';
  const detail = game.detail;
  if (/half.?time/i.test(detail)) return 'Halbzeitpause';
  if (/overtime|\bOT\b/i.test(detail)) return 'Verlängerung';
  if (sport === 'football' && /\d/.test(detail) && !/[A-Za-z]/.test(detail)) return detail;
  const period = detail.match(/(\d+)(?:st|nd|rd|th)/i)?.[1];
  const clock = detail.match(/\b\d{1,2}:\d{2}\b/)?.[0];
  const unit = sport === 'tennis' ? 'Satz' : sport === 'hockey' ? 'Drittel' : sport === 'football' ? 'Halbzeit' : 'Viertel';
  if (period) return `${period}. ${unit}${clock ? ` · ${clock}` : ''}`;
  if (sport === 'football' && /first half/i.test(detail)) return '1. Halbzeit';
  if (sport === 'football' && /second half/i.test(detail)) return '2. Halbzeit';
  return 'Läuft gerade';
}

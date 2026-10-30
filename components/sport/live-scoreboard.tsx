'use client';

import { useEffect, useState } from 'react';
import { LIVE_SPORTS, type LiveScoreboard as Scoreboard, type LiveSport } from '@/lib/sport/live-scoreboard';

export function LiveScoreboard({ initialSport = 'football' }: { initialSport?: LiveSport }) {
  const [sport, setSport] = useState<LiveSport>(initialSport);
  const [data, setData] = useState<Scoreboard | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let busy = false;
    setData(null);
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

  return (
    <section aria-label="Live-Sportergebnisse" className="space-y-3 rounded-2xl border border-sky-500/40 bg-slate-900/60 p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-white">Live-Ergebnisse &amp; heutige Spiele</h2>
        <button type="button" onClick={() => setRetry(n => n + 1)} className="rounded border border-slate-600 px-3 py-1 text-xs text-sky-200">Jetzt aktualisieren</button>
      </header>
      <div className="flex flex-wrap gap-2" aria-label="Sportart für Live-Ergebnisse">
        {(Object.keys(LIVE_SPORTS) as LiveSport[]).map(key => <button type="button" key={key} aria-pressed={sport === key} onClick={() => setSport(key)} className={`rounded border px-3 py-1 text-xs ${sport === key ? 'border-sky-400 bg-sky-950 text-sky-100' : 'border-slate-700 text-slate-400'}`}>{LIVE_SPORTS[key].label}</button>)}
      </div>
      <div aria-live="polite" className="text-sm">
        {loading && <p className="text-slate-400">Ergebnisse werden abgerufen …</p>}
        {error && <p className="text-amber-200">Live-Dienst derzeit nicht erreichbar. {data ? 'Die angezeigten Ergebnisse sind möglicherweise veraltet.' : 'Aktuelle Ergebnisse können nicht bestätigt werden.'}</p>}
        {!loading && !error && data?.games.length === 0 && <p className="text-slate-300">Heute keine Spiele in den abgedeckten Wettbewerben gemeldet.</p>}
      </div>
      {data && <>
        {data.failedFeeds > 0 && <p className="text-xs text-amber-200">{data.failedFeeds} von {data.totalFeeds} Datenabrufe fehlgeschlagen — die Liste ist unvollständig.</p>}
        <ul className="max-h-[32rem] space-y-2 overflow-y-auto">
          {data.games.map(game => <li key={game.id} className="rounded-lg border border-slate-700 bg-slate-950/50 p-3">
            <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-400"><span>{game.league}</span><span className={!error && game.state === 'in' ? 'font-semibold text-emerald-300' : ''}>{error ? 'Stand veraltet' : game.state === 'in' ? 'LIVE' : game.state === 'post' ? 'Beendet' : new Date(game.startsAt).toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' }) + ' Uhr'}</span></div>
            <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm text-slate-100"><span className="min-w-0 break-words">{game.home}</span><strong className="font-mono">{game.homeScore ?? '–'} : {game.awayScore ?? '–'}{game.scoreUnit && <span className="block text-center text-[10px] font-normal text-slate-400">{game.scoreUnit}</span>}</strong><span className="min-w-0 break-words text-right">{game.away}</span></div>
            <p className="mt-1 text-xs text-slate-400">{game.detail}{game.scoreDetail && ` · ${game.scoreDetail}`}</p>
          </li>)}
        </ul>
        {data.fetchedAt && <p className="text-xs text-slate-500">Letzter erfolgreicher Abruf: {new Date(data.fetchedAt).toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin' })} (Berlin)</p>}
      </>}
      <p className="text-xs text-slate-500">Quelle: ESPN · Abfrage alle 30 Sekunden im sichtbaren Tab · Zeiten in Berlin. Fußball: Top-5-Ligen, Champions League und WM; Basketball: NBA; Eishockey: NHL; Tennis: ATP/WTA. Anbieter-Verzögerungen möglich. Diese Ergebnisse sind unabhängig von den Modell-Prognosen unten.</p>
    </section>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Activity, ArrowUpRight, Clock3, Radio, RefreshCw, ShieldAlert } from 'lucide-react';
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

  const liveCount = data && !error ? data.games.filter(game => game.state === 'in').length : null;

  return (
    <section aria-label="Live-Sportergebnisse" className="terminal-panel relative isolate overflow-hidden border border-[#65e6ff]/25 bg-[#0c141f]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-[#65e6ff] via-[#65e6ff]/40 to-transparent" />
      <header className="flex flex-wrap items-start justify-between gap-4 p-5 pb-4 sm:p-6">
        <div className="min-w-0 space-y-2">
          <p className="section-kicker flex items-center gap-2 text-[#65e6ff]"><Radio className="h-3.5 w-3.5" aria-hidden />Sport / Live Center</p>
          <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">Live-Ergebnisse &amp; heutige Spiele</h2>
        </div>
        <button type="button" onClick={() => setRetry(n => n + 1)} className="terminal-button inline-flex min-h-11 items-center gap-2 border border-white/15 bg-white/[0.03] px-3.5 py-2 text-xs font-medium text-slate-200 transition hover:border-[#65e6ff]/60 hover:text-[#65e6ff]">
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />Jetzt aktualisieren
        </button>
      </header>

      <div className="grid grid-cols-3 border-y border-white/[0.08] bg-black/15 px-5 py-3 sm:px-6">
        <div className="space-y-1 border-r border-white/[0.08] pr-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-slate-500">Im Spiel</p>
          <p className="flex items-center gap-2 font-mono text-xl font-medium tabular-nums text-[#d8ff62]">{liveCount ?? '—'}<Activity className="h-3.5 w-3.5 text-[#d8ff62]/65" aria-hidden /></p>
        </div>
        <div className="space-y-1 border-r border-white/[0.08] px-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-slate-500">Spielplan</p>
          <p className="font-mono text-xl font-medium tabular-nums text-white">{data?.games.length ?? '—'}</p>
        </div>
        <div className="space-y-1 pl-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-slate-500">Abruf</p>
          <p className="font-mono text-xl font-medium text-slate-300">30<span className="ml-1 text-xs text-slate-500">SEK</span></p>
        </div>
      </div>

      <div className="space-y-4 p-5 pt-4 sm:p-6">
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4" aria-label="Sportart für Live-Ergebnisse">
          {(Object.keys(LIVE_SPORTS) as LiveSport[]).map(key => <button type="button" key={key} aria-pressed={sport === key} onClick={() => setSport(key)} className={`flex min-h-11 items-center justify-between gap-2 border px-3 py-2.5 text-sm font-medium transition ${sport === key ? 'border-[#65e6ff]/60 bg-[#65e6ff]/10 text-[#65e6ff]' : 'border-white/[0.08] bg-white/[0.02] text-slate-400 hover:border-white/20 hover:text-white'}`}>{LIVE_SPORTS[key].label}{sport === key && <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden />}</button>)}
        </div>

        <div aria-live="polite" className="text-sm">
          {loading && <div className="flex items-center gap-3 border border-white/10 bg-white/[0.025] p-4 text-slate-400"><RefreshCw className="h-4 w-4 animate-spin text-[#65e6ff] motion-reduce:animate-none" aria-hidden />Ergebnisse werden abgerufen …</div>}
          {error && <div className="flex items-start gap-3 border border-amber-400/25 bg-amber-400/[0.05] p-4 text-amber-100"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden /><p>Live-Dienst derzeit nicht erreichbar. {data ? 'Die angezeigten Ergebnisse sind möglicherweise veraltet.' : 'Aktuelle Ergebnisse können nicht bestätigt werden.'}</p></div>}
          {!loading && !error && data?.games.length === 0 && <div className="border border-dashed border-white/15 p-6 text-center"><Clock3 className="mx-auto mb-3 h-5 w-5 text-slate-500" aria-hidden /><p className="font-medium text-slate-200">Heute keine Spiele in den abgedeckten Wettbewerben gemeldet.</p><p className="mt-1 text-xs text-slate-500">Wähle eine andere Sportart oder prüfe den Spielplan später erneut.</p></div>}
        </div>

        {data && <>
          {data.failedFeeds > 0 && <p className="border-l-2 border-amber-400/60 pl-3 text-xs leading-relaxed text-amber-200">{data.failedFeeds} von {data.totalFeeds} Datenabrufe fehlgeschlagen — die Liste ist unvollständig.</p>}
          <ul className="max-h-[36rem] space-y-2.5 overflow-y-auto pr-1">
            {data.games.map(game => {
              const live = !error && game.state === 'in';
              return <li key={game.id} className={`relative overflow-hidden border p-4 sm:p-5 ${live ? 'border-[#65e6ff]/40 bg-[#65e6ff]/[0.04]' : 'border-white/[0.08] bg-[#070b12]/65'}`}>
                {live && <div className="absolute bottom-0 left-0 top-0 w-0.5 bg-[#65e6ff]" />}
                <div className="flex items-start justify-between gap-3">
                  <span className="min-w-0 text-[10px] font-medium uppercase leading-relaxed tracking-[0.12em] text-slate-500">{game.league}</span>
                  <span className={`inline-flex shrink-0 items-center gap-1.5 border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${live ? 'border-[#d8ff62]/35 bg-[#d8ff62]/[0.07] text-[#d8ff62]' : error ? 'border-amber-400/20 text-amber-200' : 'border-white/10 text-slate-400'}`}>
                    {live && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                    {error ? 'Stand veraltet' : live ? 'LIVE' : game.state === 'post' ? 'Beendet' : new Date(game.startsAt).toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' }) + ' Uhr'}
                  </span>
                </div>
                <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-5">
                  <span className="min-w-0 break-words text-sm font-medium leading-snug text-slate-100 sm:text-base">{game.home}</span>
                  <div className="text-center"><strong className={`whitespace-nowrap font-mono text-2xl font-medium tabular-nums tracking-tight sm:text-3xl ${live ? 'text-white' : 'text-slate-200'}`}>{game.homeScore ?? '–'}<span className="mx-1.5 text-slate-600">:</span>{game.awayScore ?? '–'}</strong>{game.scoreUnit && <span className="mt-1 block text-[10px] uppercase tracking-widest text-slate-500">{game.scoreUnit}</span>}</div>
                  <span className="min-w-0 break-words text-right text-sm font-medium leading-snug text-slate-100 sm:text-base">{game.away}</span>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-3 text-xs text-slate-500"><span>{game.detail}</span>{game.scoreDetail && <span className="font-mono text-slate-400">{game.scoreDetail}</span>}</div>
              </li>;
            })}
          </ul>
          {data.fetchedAt && <p className="flex items-center gap-2 text-[11px] text-slate-500"><Clock3 className="h-3 w-3 shrink-0" aria-hidden /><span>Letzter erfolgreicher Abruf: <span className="font-mono text-slate-400">{new Date(data.fetchedAt).toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin' })}</span> (Berlin)</span></p>}
        </>}

        <details className="border-t border-white/[0.08] pt-3 text-xs text-slate-500">
          <summary className="cursor-pointer font-medium text-slate-400 transition hover:text-[#65e6ff]">ESPN · Datenquelle &amp; Abdeckung</summary>
          <p className="mt-2 max-w-3xl leading-relaxed">Abfrage alle 30 Sekunden im sichtbaren Tab · Zeiten in Berlin. Fußball: Top-5-Ligen, Champions League und WM; Basketball: NBA; Eishockey: NHL; Tennis: ATP/WTA. Anbieter-Verzögerungen möglich. Diese Ergebnisse sind unabhängig von den Modell-Prognosen unten.</p>
        </details>
      </div>
    </section>
  );
}

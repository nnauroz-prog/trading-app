'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, RefreshCw } from 'lucide-react';
import type { GamePrediction as Prediction } from '@/lib/sport/game-prediction';
import type { LiveGame, LiveSport } from '@/lib/sport/live-scoreboard';

type CachedPrediction = { snapshot: string; value: Prediction; loadedAt: number };

export function GamePrediction({ game, sport, scoresStale = false }: { game: LiveGame; sport: LiveSport; scoresStale?: boolean }) {
  const panelId = useId();
  const [expanded, setExpanded] = useState(false);
  const [cached, setCached] = useState<CachedPrediction | null>(null);
  const [requestedSnapshot, setRequestedSnapshot] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<'unavailable' | 'score-changed' | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const request = useRef<AbortController | null>(null);
  const snapshot = JSON.stringify([sport, game.id, game.home, game.away, game.startsAt, game.state, game.homeScore, game.awayScore, game.scoreDetail]);
  const currentSnapshot = useRef(snapshot);
  currentSnapshot.current = snapshot;
  const expired = cached?.snapshot === snapshot && game.state === 'in' && now - cached.loadedAt >= 120_000;
  const prediction = cached?.snapshot === snapshot && !expired ? cached.value : null;
  const changed = (cached !== null && cached.snapshot !== snapshot) || (requestedSnapshot !== null && requestedSnapshot !== snapshot);
  const finished = game.state === 'post';

  useEffect(() => {
    request.current?.abort();
    setLoading(false);
    setError(null);
    return () => request.current?.abort();
  }, [snapshot]);

  useEffect(() => {
    setNow(Date.now());
    if (!expanded || !cached || game.state !== 'in') return;
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [cached, expanded, game.state]);

  const load = async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setRequestedSnapshot(snapshot);
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({ sport, id: game.id });
      const response = await fetch(`/api/sport/prediction?${query}`, { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error('unavailable');
      const result = await response.json() as Prediction;
      if (controller.signal.aborted || currentSnapshot.current !== snapshot) return;
      if (result.id !== game.id || result.sport !== sport || result.home !== game.home || result.away !== game.away) throw new Error('unavailable');
      if (result.state !== game.state || (game.state !== 'pre' && (result.sourceScore.home !== game.homeScore || result.sourceScore.away !== game.awayScore))) {
        setError('score-changed');
        return;
      }
      setCached({ snapshot, value: result, loadedAt: Date.now() });
    } catch {
      if (!controller.signal.aborted && currentSnapshot.current === snapshot) setError('unavailable');
    } finally {
      if (!controller.signal.aborted && currentSnapshot.current === snapshot) setLoading(false);
    }
  };

  const toggle = () => {
    setExpanded(value => !value);
    if (!expanded && !prediction && !loading && !changed && !expired) void load();
  };

  return (
    <div className="mt-4 border-t border-slate-800 pt-3">
      <button type="button" onClick={toggle} aria-label={`${finished ? 'Ergebnis einordnen' : 'Prognose ansehen'}: ${game.home} gegen ${game.away}`} aria-expanded={expanded} aria-controls={panelId} className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left text-sm font-medium text-cyan-200 transition hover:bg-cyan-300/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300">
        <span>{finished ? 'Ergebnis einordnen' : 'Prognose ansehen'}</span>
        <ChevronDown size={17} className={`shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {expanded && <div id={panelId} className="mt-3 space-y-3" aria-busy={loading}>
        <div aria-live="polite" className="text-sm leading-relaxed">
          {loading && <p className="flex items-center gap-2 py-2 text-slate-400"><RefreshCw size={15} className="shrink-0 animate-spin motion-reduce:animate-none" aria-hidden />{finished ? 'Einordnung wird geladen …' : 'Prognose wird geladen …'}</p>}
          {!loading && (changed || expired) && !error && <div className="rounded-lg border border-amber-300/20 bg-amber-300/[0.04] p-3 text-amber-100"><p>{finished ? 'Das Spiel ist beendet. Die frühere Prognose wird nicht mehr angezeigt.' : changed ? 'Der Spielstand hat sich geändert. Lade eine neue Einschätzung.' : 'Das Spiel läuft weiter. Lade eine aktuelle Einschätzung.'}</p><ReloadButton onClick={() => void load()} label={finished ? 'Ergebnis laden' : 'Prognose neu laden'} /></div>}
          {error && <div className="rounded-lg border border-amber-300/20 bg-amber-300/[0.04] p-3 text-amber-100"><p>{error === 'score-changed' ? 'Die Spielstände haben sich inzwischen geändert. Aktualisiere oben die Ergebnisse und lade die Einschätzung danach erneut.' : `${finished ? 'Die Einordnung' : 'Die Prognose'} ist gerade nicht verfügbar. Versuch es noch einmal.`}</p><ReloadButton onClick={() => void load()} label="Erneut versuchen" /></div>}
        </div>
        {prediction && !loading && !error && <><GamePredictionDetails prediction={prediction} football={sport === 'football'} scoresStale={scoresStale} /><ReloadButton onClick={() => void load()} label={finished ? 'Einordnung aktualisieren' : 'Prognose aktualisieren'} /></>}
      </div>}
    </div>
  );
}

function ReloadButton({ onClick, label }: { onClick: () => void; label: string }) {
  return <button type="button" onClick={onClick} className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 py-2 font-medium text-cyan-200 hover:bg-cyan-300/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"><RefreshCw size={14} aria-hidden />{label}</button>;
}

export function GamePredictionDetails({ prediction, football, scoresStale }: { prediction: Prediction; football: boolean; scoresStale: boolean }) {
  const actual = prediction.kind === 'actual';
  const ended = prediction.state === 'post';
  const scoreAvailable = prediction.score.available && prediction.score.home != null && prediction.score.away != null;
  const winnerName = prediction.winner.side === 'draw' ? 'Unentschieden' : prediction.winner.name;
  const probability = formatProbability(prediction.score.probability);
  const winnerProbability = formatProbability(prediction.winner.probability);
  const hasScorerProbability = football && prediction.goalscorers.available && prediction.goalscorers.players.some(player => formatProbability(player.probability) !== null);
  const outcomes = !ended && prediction.winner.available && prediction.winner.probabilities ? [
    { name: prediction.home, value: formatProbability(prediction.winner.probabilities.home) },
    { name: 'Unentschieden', value: formatProbability(prediction.winner.probabilities.draw) },
    { name: prediction.away, value: formatProbability(prediction.winner.probabilities.away) }
  ].filter(outcome => outcome.value !== null) : [];
  const updated = formatDate(prediction.sourceUpdatedAt);
  const fetched = formatDate(prediction.fetchedAt);

  return <>
    {scoresStale && <p className="rounded-lg border border-amber-300/20 p-3 text-xs leading-relaxed text-amber-100">Die aktuellen Spielstände sind gerade nicht erreichbar. Diese Einschätzung kann inzwischen überholt sein.</p>}
    <p className="text-xs leading-relaxed text-slate-400">{actual ? 'Spiel beendet · Tatsächliches Ergebnis' : ended ? 'Die Quelle meldet kein bestätigtes Endergebnis für dieses Spiel.' : prediction.kind === 'unavailable' ? 'Für dieses Spiel reichen die verfügbaren Daten noch nicht für eine Prognose.' : 'Unsere Einschätzung für dieses Spiel.'}</p>
    <div className="grid min-w-0 gap-3 sm:grid-cols-2">
      <div className="min-w-0 rounded-lg border border-cyan-300/15 bg-cyan-300/[0.03] p-3">
        <h3 className="text-xs font-medium text-slate-400">{ended ? 'Endergebnis' : 'Mögliches Ergebnis'}</h3>
        {scoreAvailable ? <>
          <p className="mt-2 font-mono text-2xl font-medium tabular-nums text-white">{prediction.score.home}<span className="mx-2 text-slate-600">:</span>{prediction.score.away}</p>
          <p className="mt-1 break-words text-xs leading-relaxed text-slate-400">{prediction.home} : {prediction.away}</p>
          {prediction.score.label && prediction.score.label !== (ended ? 'Endergebnis' : 'Mögliches Ergebnis') && <p className="mt-2 text-xs leading-relaxed text-slate-400">{prediction.score.label}</p>}
          {!ended && <p className="mt-2 text-xs leading-relaxed text-cyan-200">{probability ? `${probability} Wahrscheinlichkeit für genau dieses Ergebnis` : 'Ein mögliches Szenario, kein sicheres Ergebnis.'}</p>}
        </> : <p className="mt-2 text-sm leading-relaxed text-slate-300">{prediction.score.reason || 'Für ein konkretes Ergebnis fehlen verlässliche Daten.'}</p>}
      </div>
      <div className="min-w-0 rounded-lg border border-slate-800 bg-white/[0.02] p-3">
        <h3 className="text-xs font-medium text-slate-400">{ended ? 'Spielausgang' : prediction.sport === 'hockey' ? 'Tendenz nach 60 Minuten' : 'Wahrscheinlicher Sieger'}</h3>
        {prediction.winner.available && winnerName ? <>
          <p className="mt-2 break-words text-base font-medium leading-snug text-white">{winnerName}</p>
          {!ended && winnerProbability && <p className="mt-2 text-xs text-cyan-200">{winnerProbability} geschätzte Wahrscheinlichkeit</p>}
          {outcomes.length > 0 && <dl aria-label="Geschätzte Chancen" className="mt-3 space-y-1.5 border-t border-slate-800 pt-3 text-xs leading-relaxed">{outcomes.map((outcome, index) => <div key={index} className="flex min-w-0 justify-between gap-3"><dt className="min-w-0 break-words text-slate-400">{outcome.name}</dt><dd className="shrink-0 font-mono tabular-nums text-slate-200">{outcome.value}</dd></div>)}</dl>}
          {prediction.winner.reason && <p className="mt-2 text-xs leading-relaxed text-slate-400">{prediction.winner.reason}</p>}
        </> : <p className="mt-2 text-sm leading-relaxed text-slate-300">{prediction.winner.reason || 'Mit den verfügbaren Daten lässt sich kein Favorit nennen.'}</p>}
      </div>
    </div>
    {!ended && scoreAvailable && prediction.winner.available && <p className="text-xs leading-relaxed text-slate-400">Das einzelne Ergebnis ist ein Szenario; die Siegchance fasst alle möglichen Ergebnisse zusammen.</p>}
    {football && !ended && <div className="rounded-lg border border-slate-800 p-3">
      <h3 className="text-xs font-medium text-slate-400">Mögliche Torschützen</h3>
      {prediction.goalscorers.available && prediction.goalscorers.players.length > 0 ? <>
        <ul className="mt-3 space-y-3">
          {prediction.goalscorers.players.map((player, index) => <li key={`${player.team}-${player.name}-${index}`} className="min-w-0 border-b border-slate-800 pb-3 last:border-0 last:pb-0">
            <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1"><span className="min-w-0 break-words text-sm font-medium text-slate-100">{player.name}</span>{formatProbability(player.probability) && <span className="shrink-0 text-xs text-cyan-200">{formatProbability(player.probability)} Torwahrscheinlichkeit</span>}</div>
            <p className="mt-1 break-words text-xs leading-relaxed text-slate-400">{player.team}{Number.isFinite(player.seasonGoals) ? ` · ${player.seasonGoals} Saisontore` : ''}{Number.isFinite(player.appearances) ? ` in ${player.appearances} Einsätzen` : ''}</p>
            <p className="mt-1 text-xs leading-relaxed text-amber-200">{lineupLabel(player.lineupStatus)}</p>
          </li>)}
        </ul>
        <p className="mt-3 text-xs leading-relaxed text-slate-400">{prediction.goalscorers.reason || 'Kandidaten auf Basis der verfügbaren Torstatistik. Ein Treffer ist nicht garantiert.'}</p>
      </> : <p className="mt-2 text-sm leading-relaxed text-slate-300">{prediction.goalscorers.reason || 'Keine ausreichend belegten Torschützen-Kandidaten verfügbar.'}</p>}
    </div>}
    {(prediction.analysis.length > 0 || prediction.assumptions.length > 0 || prediction.sources.length > 0) && <details className="rounded-lg border border-slate-800 px-3">
      <summary className="flex min-h-11 cursor-pointer items-center py-2 text-sm font-medium text-slate-200">{ended ? 'Was sagen die Daten?' : 'Warum diese Einschätzung?'}</summary>
      <div className="space-y-3 pb-3 text-xs leading-relaxed text-slate-400">
        {prediction.analysis.length > 0 && <ul className="list-disc space-y-2 pl-4">{prediction.analysis.map((fact, index) => <li key={index}>{fact}</li>)}</ul>}
        {prediction.assumptions.length > 0 && <div className="border-l-2 border-amber-300/40 pl-3"><p className="mb-1 font-medium text-slate-300">Was dabei unsicher bleibt</p>{prediction.assumptions.map((assumption, index) => <p key={index} className="mt-1">{assumption}</p>)}</div>}
        {prediction.sources.length > 0 && <div><p className="font-medium text-slate-300">Quellen</p><ul className="mt-1 space-y-1">{prediction.sources.map((source, index) => <li key={`${source.url}-${index}`}><a href={source.url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 max-w-full items-center break-words text-cyan-200 underline decoration-cyan-300/30 underline-offset-4 hover:decoration-cyan-300">{source.label}</a>{formatDate(source.accessedAt) && <span className="block text-slate-500">Abgerufen: {formatDate(source.accessedAt)}</span>}</li>)}</ul></div>}
      </div>
    </details>}
    {!ended && (probability || winnerProbability || outcomes.length > 0 || hasScorerProbability) && <p className="text-xs leading-relaxed text-slate-500">Alle Prozentwerte sind Schätzungen, keine gemessene Trefferquote.</p>}
    {(updated || fetched) && <p className="text-xs leading-relaxed text-slate-500">{updated ? `Datenstand: ${updated}` : `Abgerufen: ${fetched}`}</p>}
  </>;
}

function formatProbability(value: number | undefined): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) return null;
  if (value === 0 || value === 1) return `${value * 100} %`;
  const percent = value * 100;
  if (percent < 0.1) return '<0,1 %';
  if (percent > 99.95) return '>99,9 %';
  if (percent < 1 || percent >= 99.5) return `${Math.min(percent, 99.9).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
  return `${Math.round(percent)} %`;
}

function formatDate(value: string | null | undefined): string | null {
  if (!value || !Number.isFinite(Date.parse(value))) return null;
  return new Date(value).toLocaleString('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' Uhr';
}

function lineupLabel(value: string): string {
  return value === 'Startelf gemeldet' || value === 'Auf dem Platz gemeldet' ? value : 'Aufstellung und Einsatz nicht bestätigt';
}

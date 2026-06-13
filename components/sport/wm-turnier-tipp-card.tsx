'use client';

// WM-Gewinner: Weltmeister-Tipp oben, darunter Tag fuer Tag jedes Spiel
// mit Modell-Gewinner. Heute hervorgehoben. Endstand + Treffer/Fehl
// sobald nachgepflegt. Filter "ab heute" / "alle Tage".

import { useEffect, useMemo, useRef, useState } from 'react';
import { buildWmDailyWinners, type WmDailyOutcome } from '@/lib/sport/wm-daily-winners';
import { computeKickoffCountdownUtc } from '@/lib/sport/wm-kickoff-countdown';
import { matchExternalResults, mergeResults, type ExternalLastFixture } from '@/lib/sport/wm-results-matcher';
import { WmEndstandInputInline } from '@/components/sport/wm-endstand-input-inline';
import type { FinishedFixtureLite } from '@/lib/sport/wm-pick-learning';
import {
  loadManualWmResults,
  WM_MANUAL_RESULTS_CHANGED_EVENT
} from '@/lib/sport/wm-results-store';
import { todayIsoBerlin } from '@/lib/agent-memory';
import type { WmFixture } from '@/lib/sport/wm-schedule-2026';

interface Props {
  // Server-seitig gemergte Schedule (statisch + Live). Optional —
  // wenn nicht uebergeben, faellt die Karte auf den statischen
  // Default zurueck.
  schedule?: WmFixture[];
  // Externe Endstaende aus TheSportsDB (oder anderen Quellen), die
  // pro Team-Paarung+Datum gegen den Schedule gematched werden. Die
  // Karte merged sie mit den manuell eingetragenen — manuelle Eingabe
  // hat Vorrang.
  externalLast?: ExternalLastFixture[];
  // Direkt schon vom Server gematchte Finished-Fixtures (per fixtureId).
  externalFinished?: FinishedFixtureLite[];
}

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', {
    timeZone: 'Europe/Berlin',
    weekday: 'long', day: '2-digit', month: '2-digit'
  });
}

const PHASE_TAG: Partial<Record<WmFixture['phase'], string>> = {
  Achtelfinale: 'AF',
  Viertelfinale: 'VF',
  Halbfinale: 'HF',
  'Spiel um Platz 3': 'Platz 3',
  Finale: 'FINALE'
};

const OUTCOME_TONE: Record<WmDailyOutcome, string> = {
  treffer: 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100',
  daneben: 'border-rose-400/50 bg-rose-500/15 text-rose-100',
  'remis-push': 'border-amber-400/40 bg-amber-500/10 text-amber-100'
};

const OUTCOME_LABEL: Record<WmDailyOutcome, string> = {
  treffer: '✓ Treffer',
  daneben: '✗ daneben',
  'remis-push': '= Remis'
};

type Filter = 'ab-heute' | 'alle';

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
}

export function WmTurnierTippCard({ schedule, externalLast, externalFinished }: Props = {}) {
  const [tick, setTick] = useState(0);
  const [now, setNow] = useState<Date>(() => new Date());
  const [mounted, setMounted] = useState(false);
  const [filter, setFilter] = useState<Filter>('ab-heute');
  const [teamSearch, setTeamSearch] = useState('');
  const todayRef = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    setMounted(true);
    const refresh = () => setTick((t) => t + 1);
    window.addEventListener(WM_MANUAL_RESULTS_CHANGED_EVENT, refresh);
    // Minutentakt fuer Live-Indikator + Countdown.
    const minuteId = setInterval(() => setNow(new Date()), 60_000);
    return () => {
      window.removeEventListener(WM_MANUAL_RESULTS_CHANGED_EVENT, refresh);
      clearInterval(minuteId);
    };
  }, []);

  const handleJumpToToday = () => {
    todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const today = useMemo(() => mounted ? todayIsoBerlin() : '', [mounted]);

  const { rows, championPick } = useMemo(() => {
    // Externe Endstaende: per-fixtureId-Liste vom Server hat Vorrang,
    // sonst matchen wir die ExternalLastFixture-Liste gegen den
    // gemergten Schedule.
    const externalMatched: FinishedFixtureLite[] = externalFinished
      ?? (externalLast && schedule ? matchExternalResults(externalLast, schedule) : []);
    const finished = mounted
      ? mergeResults(loadManualWmResults(), externalMatched)
      : externalMatched;
    return buildWmDailyWinners({ finished, schedule });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, tick, schedule, externalLast, externalFinished]);

  const stats = useMemo(() => {
    let hits = 0, miss = 0, push = 0;
    for (const r of rows) {
      if (!r.result) continue;
      if (r.result.outcome === 'treffer') hits += 1;
      else if (r.result.outcome === 'daneben') miss += 1;
      else if (r.result.outcome === 'remis-push') push += 1;
    }
    return { hits, miss, push, decided: hits + miss };
  }, [rows]);

  const visibleRows = useMemo(() => {
    let out = rows;
    if (mounted && filter === 'ab-heute' && today) {
      out = out.filter((r) => r.dateIso >= today);
    }
    const q = normalize(teamSearch);
    if (q.length >= 2) {
      out = out.filter((r) =>
        normalize(r.homeTeam).includes(q) ||
        normalize(r.awayTeam).includes(q) ||
        normalize(r.winner).includes(q) ||
        normalize(r.loser).includes(q)
      );
    }
    return out;
  }, [rows, filter, mounted, today, teamSearch]);

  const byDate = useMemo(() => {
    const m = new Map<string, typeof rows>();
    for (const r of visibleRows) {
      if (!m.has(r.dateIso)) m.set(r.dateIso, []);
      m.get(r.dateIso)!.push(r);
    }
    return m;
  }, [visibleRows]);
  const dates = Array.from(byDate.keys()).sort();

  const totalDaysHidden = filter === 'ab-heute' && mounted
    ? new Set(rows.filter((r) => r.dateIso < today).map((r) => r.dateIso)).size
    : 0;

  const liveRows = useMemo(() => {
    if (!mounted) return [] as typeof rows;
    return rows.filter((r) => {
      if (r.result) return false;
      const info = computeKickoffCountdownUtc(r.utcDateIso, r.utcTime, now);
      return info.status === 'laeuft';
    });
  }, [rows, now, mounted]);

  return (
    <section className="space-y-3 rounded-2xl border border-emerald-400/30 bg-emerald-950/15 p-3" aria-label="WM Gewinner pro Tag">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[14px] font-bold text-slate-100">WM 2026 — wer gewinnt?</h2>
        {stats.decided > 0 && (
          <span className="text-[10.5px] text-slate-400">
            {stats.hits}/{stats.decided} getroffen{stats.push > 0 ? ` · ${stats.push} Remis` : ''}
          </span>
        )}
      </div>

      {championPick && (
        <div className="rounded border border-emerald-400/60 bg-emerald-500/15 px-3 py-2">
          <div className="text-[9.5px] uppercase tracking-[0.2em] text-emerald-200/80">Weltmeister</div>
          <div className="text-[20px] font-bold text-emerald-100">{championPick}</div>
        </div>
      )}

      {liveRows.length > 0 && (
        <div className="space-y-0.5 rounded border-2 border-rose-400/60 bg-rose-500/15 px-3 py-2 text-rose-100">
          <div className="flex items-baseline gap-2">
            <span className="animate-pulse text-[12px]">●</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">jetzt live</span>
          </div>
          {liveRows.map((r) => (
            <div key={r.fixtureId} className="text-[12px]">
              <span className="font-bold">{r.winner}</span> gegen {r.loser}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-baseline gap-1.5">
        <span className="text-[9.5px] uppercase tracking-wider text-slate-500">Anzeigen:</span>
        <span className="text-[9.5px] uppercase tracking-wider text-slate-600">· Zeiten in Berlin</span>
        <input
          type="search"
          value={teamSearch}
          onChange={(e) => setTeamSearch(e.target.value)}
          placeholder="Team suchen…"
          className="ml-auto w-28 rounded border border-slate-700 bg-slate-950/70 px-2 py-0.5 text-[10px] text-slate-100 placeholder:text-slate-600 focus:border-emerald-400/60 focus:outline-none"
          aria-label="Nach Team filtern"
        />
        {teamSearch && (
          <button
            type="button"
            onClick={() => setTeamSearch('')}
            className="rounded border border-slate-700 bg-slate-900/60 px-1.5 py-0.5 text-[10px] text-slate-400 hover:text-slate-200"
            aria-label="Team-Filter loeschen"
          >×</button>
        )}
        {(['ab-heute', 'alle'] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${filter === f ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100' : 'border-slate-700 bg-slate-900/60 text-slate-400 hover:border-slate-500'}`}
          >{f === 'ab-heute' ? 'ab heute' : 'alle Tage'}</button>
        ))}
        {filter === 'alle' && mounted && (
          <button
            type="button"
            onClick={handleJumpToToday}
            className="ml-auto rounded border border-emerald-400/60 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-100 hover:border-emerald-300"
          >→ heute</button>
        )}
        {totalDaysHidden > 0 && filter === 'ab-heute' && (
          <span className="text-[9.5px] text-slate-500">{totalDaysHidden} vergangene Tage ausgeblendet</span>
        )}
      </div>

      {dates.length === 0 && (
        <p className="text-[10.5px] text-slate-500">
          {teamSearch
            ? `Keine Spiele mit „${teamSearch}" im Filter. Filter mit ab heute / alle Tage anpassen oder Suche loeschen.`
            : filter === 'ab-heute'
              ? 'Keine kommenden Spiele — WM vorbei oder Spielpause.'
              : 'Keine Spiele im Spielplan.'}
        </p>
      )}

      <ol className="space-y-2.5">
        {dates.map((date) => {
          const items = byDate.get(date)!;
          const isToday = mounted && date === today;
          const isPast = mounted && date < today;
          const isFuture = mounted && date > today;
          const headTone = isToday
            ? 'text-emerald-300'
            : isFuture
              ? 'text-slate-400'
              : 'text-slate-500';
          return (
            <li
              key={date}
              ref={isToday ? todayRef : null}
              className={isToday ? 'scroll-mt-4 rounded-lg border border-emerald-500/40 bg-emerald-950/30 p-1.5' : ''}
            >
              <div className={`mb-1 text-[10px] font-bold uppercase tracking-[0.18em] ${headTone}`}>
                {fmtDate(date)}{isToday ? ' · HEUTE' : ''} · {items.length} Spiel{items.length === 1 ? '' : 'e'}
              </div>
              <ul className="space-y-0.5">
                {items.map((r) => {
                  const live = mounted && !r.result
                    ? computeKickoffCountdownUtc(r.utcDateIso, r.utcTime, now)
                    : null;
                  const isLive = live?.status === 'laeuft';
                  const rowTone = isLive
                    ? 'border-rose-400/60 bg-rose-950/20'
                    : isToday
                      ? 'border-emerald-500/30 bg-emerald-950/20'
                      : isPast
                        ? 'border-slate-800 bg-slate-950/30'
                        : 'border-slate-800 bg-slate-950/50';
                  return (
                    <li
                      key={r.fixtureId}
                      className={`flex flex-wrap items-baseline gap-2 rounded border px-2 py-1 text-[12px] ${rowTone}`}
                    >
                      <span className="w-10 font-mono text-[10px] text-slate-500">{r.time ?? '--:--'}</span>
                      {isLive && (
                        <span className="animate-pulse rounded border border-rose-300/70 bg-rose-500/20 px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider text-rose-100">
                          ● LIVE
                        </span>
                      )}
                      {PHASE_TAG[r.phase] && (
                        <span className="rounded border border-amber-400/40 bg-amber-500/10 px-1 py-0.5 text-[8.5px] font-bold uppercase tracking-wider text-amber-200">{PHASE_TAG[r.phase]}</span>
                      )}
                      <span className="font-bold text-emerald-200">{r.winner}</span>
                      <span className="text-[10.5px] text-slate-500">gegen {r.loser}</span>
                      {r.confidencePct !== null && (
                        <span className={`font-mono text-[9.5px] ${r.confidencePct >= 75 ? 'text-emerald-300' : r.confidencePct >= 60 ? 'text-sky-300' : 'text-slate-400'}`}>
                          · {r.confidencePct} %
                        </span>
                      )}
                      {r.result && (
                        <>
                          <span className="rounded border border-slate-600 bg-slate-900/60 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-100">
                            {r.result.homeScore}:{r.result.awayScore}
                          </span>
                          <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${OUTCOME_TONE[r.result.outcome]}`}>
                            {OUTCOME_LABEL[r.result.outcome]}
                          </span>
                        </>
                      )}
                      {!r.result && live?.status === 'wahrscheinlich-vorbei' && !r.isProjectedPairing && (
                        <WmEndstandInputInline
                          fixtureId={r.fixtureId}
                          homeTeam={r.homeTeam}
                          awayTeam={r.awayTeam}
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

'use client';

import { useEffect, useState } from 'react';
import {
  FinishedFixtureLite,
  SPORT_TIP_JOURNAL_CHANGED_EVENT,
  TipJournalEntry,
  clearTipJournal,
  loadTipJournal,
  resolvePendingTips,
  summariseTips
} from '@/lib/sport/tip-journal';
import { TipJournalExport } from '@/components/tip-journal-export';
import { TipJournalImport } from '@/components/tip-journal-import';

function fmtDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'Europe/Berlin' });
}

function outcomeBadge(o: TipJournalEntry['outcome']): { cls: string; label: string } {
  if (o === 'win') return { cls: 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200', label: 'Treffer' };
  if (o === 'loss') return { cls: 'border-rose-400/50 bg-rose-500/15 text-rose-200', label: 'Daneben' };
  if (o === 'push') return { cls: 'border-slate-700 bg-slate-900 text-slate-300', label: 'Push' };
  return { cls: 'border-amber-400/50 bg-amber-500/15 text-amber-200', label: 'offen' };
}

interface Props {
  finishedFixtures: FinishedFixtureLite[];
}

export function SportTipJournal({ finishedFixtures }: Props) {
  const [log, setLog] = useState<TipJournalEntry[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setLog(loadTipJournal());
    sync();
    setMounted(true);
    window.addEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
    return () => window.removeEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
  }, []);

  // Whenever fixtures arrive, try to resolve pending tips against them.
  useEffect(() => {
    if (!mounted) return;
    if (finishedFixtures.length === 0) return;
    const updated = resolvePendingTips(finishedFixtures);
    setLog(updated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, finishedFixtures.length]);

  if (!mounted) return null;
  const stats = summariseTips(log);

  return (
    <section className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tipp-Tagebuch (lokal)</h2>
          <p className="mt-1 text-[11px] text-slate-500">
            Tipps, die du im Sport-Reiter mit „+ tippen“ markiert hast, landen hier. Sobald die Spiele beendet sind und die Ergebnisse in den Feeds auftauchen, vergleicht die App automatisch.
          </p>
        </div>
        {log.length > 0 && (
          <div className="flex gap-1.5">
            <TipJournalExport />
            <button
              onClick={() => { if (window.confirm('Tipp-Tagebuch wirklich löschen?')) clearTipJournal(); }}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-400 hover:border-rose-500/40 hover:text-rose-300"
            >
              Löschen
            </button>
          </div>
        )}
      </div>

      {log.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-700 bg-slate-950/40 p-4 text-center text-[12px] text-slate-500">
          Noch keine Tipps. Klick im Sport-Reiter bei einem Spiel auf „+ tippen“ — landet hier.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Gesamt" value={String(stats.total)} />
            <Stat label="Offen" value={String(stats.pending)} />
            <Stat label="Treffer" value={String(stats.wins)} tone="good" />
            <Stat label="Trefferquote" value={stats.hitRatePct !== null ? `${stats.hitRatePct}%` : '—'} tone={stats.hitRatePct !== null && stats.hitRatePct >= 50 ? 'good' : 'neutral'} />
          </div>
          <details className="rounded-md border border-slate-800 bg-slate-950/40 p-2 text-[11px]">
            <summary className="cursor-pointer text-slate-300">Trefferquote pro Stufe</summary>
            <ul className="mt-2 space-y-0.5">
              {(['konservativ', 'standard', 'risiko', 'custom'] as const).map((tier) => {
                const t = stats.byTier[tier];
                return (
                  <li key={tier} className="flex justify-between font-mono text-[11px]">
                    <span className="capitalize text-slate-400">{tier}</span>
                    <span className="text-slate-300">{t.wins}/{t.resolved} {t.hitRatePct !== null ? `(${t.hitRatePct}%)` : ''}</span>
                  </li>
                );
              })}
            </ul>
          </details>
          {(() => {
            const bands = ['sehr_stark', 'stark', 'brauchbar', 'orientierung', 'nicht_verwenden'] as const;
            const hasAny = bands.some((b) => (stats.byQualityBand[b]?.resolved ?? 0) > 0);
            if (!hasAny) return null;
            const bandLabels: Record<string, string> = {
              sehr_stark: 'sehr starke Prognose',
              stark: 'starke Prognose',
              brauchbar: 'brauchbare Prognose',
              orientierung: 'nur grobe Orientierung',
              nicht_verwenden: 'nicht verwenden'
            };
            return (
              <details className="rounded-md border border-slate-800 bg-slate-950/40 p-2 text-[11px]">
                <summary className="cursor-pointer text-slate-300">Trefferquote pro Quality-Band</summary>
                <p className="mt-1 text-[10px] text-slate-500">Zeigt, ob Tipps aus hohen Score-Bändern öfter aufgehen.</p>
                <ul className="mt-2 space-y-0.5">
                  {bands.map((band) => {
                    const b = stats.byQualityBand[band];
                    if (!b || b.resolved === 0) return null;
                    return (
                      <li key={band} className="flex justify-between font-mono text-[11px]">
                        <span className="text-slate-400">{bandLabels[band]}</span>
                        <span className="text-slate-300">{b.wins}/{b.resolved} {b.hitRatePct !== null ? `(${b.hitRatePct}%)` : ''}</span>
                      </li>
                    );
                  })}
                </ul>
              </details>
            );
          })()}
          <ul className="space-y-1 overflow-hidden rounded-lg border border-slate-800 bg-slate-950/40 p-2">
            {[...log].reverse().slice(0, 30).map((e) => {
              const o = outcomeBadge(e.outcome);
              const isWm = e.league === 'WM 2026' || e.fixtureId.startsWith('wm-');
              return (
                <li key={e.id} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2 border-b border-slate-900 py-1 last:border-b-0">
                  <span className="font-mono text-[10px] text-slate-500">{fmtDate(e.date)}</span>
                  <span className="truncate text-[11px] text-slate-200">
                    {isWm && <span className="mr-1 text-yellow-300" title="WM 2026">🏆</span>}
                    <span className="font-semibold">{e.homeTeam} vs. {e.awayTeam}</span>
                    <span className="text-slate-500"> · {e.market}</span>
                    {e.finalHomeScore !== undefined && e.finalAwayScore !== undefined && (
                      <span className="ml-1 font-mono text-slate-400">[{e.finalHomeScore}:{e.finalAwayScore}]</span>
                    )}
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">
                    {e.modelProbabilityPct}%
                    {typeof e.qualityScore === 'number' && (
                      <span className="ml-1 text-slate-500">· Q{e.qualityScore}</span>
                    )}
                  </span>
                  <span className={`rounded border px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider ${o.cls}`}>{o.label}</span>
                </li>
              );
            })}
          </ul>
        </>
      )}
      <TipJournalImport />
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' | 'neutral' }) {
  const cls = tone === 'good' ? 'text-emerald-300' : tone === 'bad' ? 'text-rose-300' : 'text-slate-100';
  return (
    <div className="rounded-md border border-slate-800 bg-slate-950/40 p-2 text-center">
      <div className="text-[9px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`mt-0.5 font-mono text-sm font-bold ${cls}`}>{value}</div>
    </div>
  );
}

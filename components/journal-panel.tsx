'use client';

import { useCallback, useEffect, useState } from 'react';
import { FAILURE_CATEGORY_LABELS, FailureCategory, IdeaJournalEntry, JournalOutcome } from '@/lib/types/positions';
import { JOURNAL_CHANGED_EVENT, aggregateLessons, computeJournalStats, deleteJournalEntry, loadJournal, updateJournalEntry } from '@/lib/journal';
import { AutoEvalSummary, evaluateAllPending } from '@/lib/journal-auto-evaluator';
import { EmptyState } from '@/components/empty-state';
import { PanelSkeleton } from '@/components/skeleton';

function fmtDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear().toString().slice(-2)}`;
}

function fmtAge(ms: number): string {
  const diff = Date.now() - ms;
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days < 1) return `vor ${Math.floor(diff / (60 * 60 * 1000))}h`;
  if (days < 30) return `vor ${days}d`;
  return `vor ${Math.floor(days / 30)}mo`;
}

function decisionColor(decision: string): string {
  if (decision === 'BUY_STRONG') return 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200';
  if (decision === 'BUY_CAUTIOUS') return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';
  if (decision === 'WATCH') return 'border-amber-500/40 bg-amber-500/10 text-amber-300';
  return 'border-rose-500/40 bg-rose-500/10 text-rose-300';
}

function actionColor(action: IdeaJournalEntry['userAction']): string {
  if (action === 'bought') return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';
  if (action === 'watched') return 'border-amber-500/40 bg-amber-500/10 text-amber-300';
  if (action === 'rejected') return 'border-rose-500/40 bg-rose-500/10 text-rose-300';
  return 'border-slate-700 bg-slate-900 text-slate-400';
}

function OutcomePicker({ value, onChange }: { value: JournalOutcome | undefined; onChange: (v: JournalOutcome) => void }) {
  const options: JournalOutcome[] = ['pending', 'positive', 'neutral', 'negative'];
  const labels: Record<JournalOutcome, string> = {
    pending: '—',
    positive: '✓ Win',
    neutral: '~',
    negative: '✗ Loss'
  };
  return (
    <select
      value={value ?? 'pending'}
      onChange={(e) => onChange(e.target.value as JournalOutcome)}
      className="rounded border border-slate-700 bg-slate-950 px-1 py-0.5 text-[10px] text-slate-200"
    >
      {options.map((o) => <option key={o} value={o}>{labels[o]}</option>)}
    </select>
  );
}

function EntryRow({ entry, onUpdate, onDelete }: {
  entry: IdeaJournalEntry;
  onUpdate: (patch: Partial<IdeaJournalEntry>) => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-lg border border-slate-800/80 bg-slate-950/60 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm font-bold text-white">{entry.underlying}</span>
        <span className="text-[10px] text-slate-500">{entry.ideaType}</span>
        <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${decisionColor(entry.appDecision)}`}>
          {entry.appDecisionLabel.split(' — ')[0]}
        </span>
        <span className="font-mono text-[10px] text-slate-500">Score {entry.appScore}/100</span>
        <span className="ml-auto text-[10px] text-slate-500">{fmtDate(entry.savedAt)} · {fmtAge(entry.savedAt)}</span>
      </div>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px]">
        <span className="text-slate-500">Aktion:</span>
        {(['bought', 'watched', 'rejected', 'pending'] as const).map((a) => (
          <button
            key={a}
            onClick={() => onUpdate({ userAction: a })}
            className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${entry.userAction === a ? actionColor(a) : 'border-slate-800 bg-slate-900 text-slate-500 hover:border-slate-700'}`}
          >
            {a === 'bought' ? 'Gekauft' : a === 'watched' ? 'Beobachtet' : a === 'rejected' ? 'Verworfen' : 'Pending'}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-1 text-center">
        <div>
          <div className="text-[9px] uppercase tracking-wider text-slate-500">1T</div>
          <OutcomePicker value={entry.outcome1d} onChange={(v) => onUpdate({ outcome1d: v })} />
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-wider text-slate-500">3T</div>
          <OutcomePicker value={entry.outcome3d} onChange={(v) => onUpdate({ outcome3d: v })} />
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-wider text-slate-500">7T</div>
          <OutcomePicker value={entry.outcome7d} onChange={(v) => onUpdate({ outcome7d: v })} />
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-wider text-slate-500">30T</div>
          <OutcomePicker value={entry.outcome30d} onChange={(v) => onUpdate({ outcome30d: v })} />
        </div>
      </div>
      {entry.outcomeNote && (
        <p className="mt-2 text-[11px] text-slate-400">{entry.outcomeNote}</p>
      )}

      {(entry.outcome3d === 'negative' || entry.outcome7d === 'negative' || entry.outcome30d === 'negative') && (
        <div className="mt-3 space-y-1.5 rounded-md border border-rose-500/20 bg-rose-950/15 p-2 text-[11px]">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-rose-300">Selbst-Analyse · woran lag&apos;s?</div>
          <select
            value={entry.failureCategory ?? ''}
            onChange={(e) => onUpdate({ failureCategory: (e.target.value || undefined) as FailureCategory | undefined })}
            className="w-full rounded border border-slate-700 bg-slate-950 px-1.5 py-1 text-[11px] text-slate-100"
          >
            <option value="">— Fehler-Kategorie wählen —</option>
            {(Object.keys(FAILURE_CATEGORY_LABELS) as FailureCategory[]).map((c) => (
              <option key={c} value={c}>{FAILURE_CATEGORY_LABELS[c]}</option>
            ))}
          </select>
          <textarea
            value={entry.lessonLearned ?? ''}
            onChange={(e) => onUpdate({ lessonLearned: e.target.value })}
            rows={2}
            placeholder="Lehre: was lerne ich konkret aus diesem Trade?"
            className="w-full rounded border border-slate-700 bg-slate-950 px-1.5 py-1 text-[11px] text-slate-100"
          />
          <input
            value={entry.preventionRule ?? ''}
            onChange={(e) => onUpdate({ preventionRule: e.target.value })}
            placeholder="Regel zur Verhinderung — z.B. „Kein OS deep-OTM mit <90d Restlaufzeit"
            className="w-full rounded border border-slate-700 bg-slate-950 px-1.5 py-1 text-[11px] text-slate-100"
          />
        </div>
      )}

      <div className="mt-2 flex justify-end">
        <button onClick={onDelete} className="rounded border border-slate-800 bg-slate-900 px-2 py-0.5 text-[10px] text-slate-500 hover:border-rose-500/40 hover:text-rose-300">Löschen</button>
      </div>
    </div>
  );
}

function LessonsSection({ entries }: { entries: IdeaJournalEntry[] }) {
  const lessons = aggregateLessons(entries);
  if (lessons.totalFailures === 0) return null;
  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-950/10 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-300">Lehren aus Fehler-Trades ({lessons.totalFailures})</h3>
      <p className="mt-1 text-[11px] text-slate-400">Selbst dokumentierte Muster aus deinen negativen Outcomes. Vor jedem neuen Trade durchlesen.</p>

      {lessons.byCategory.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Häufigste Fehler-Kategorien</div>
          {lessons.byCategory.slice(0, 5).map((c) => (
            <div key={c.category} className="flex items-center justify-between rounded border border-slate-800 bg-slate-950/50 px-2 py-1.5">
              <span className="text-xs text-slate-200">{FAILURE_CATEGORY_LABELS[c.category]}</span>
              <span className="font-mono text-[10px] font-bold text-amber-300">{c.count}×</span>
            </div>
          ))}
        </div>
      )}

      {lessons.preventionRules.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Deine Verhinderungs-Regeln</div>
          {lessons.preventionRules.slice(0, 6).map((r) => (
            <div key={r.rule} className="rounded border border-emerald-500/20 bg-emerald-950/10 px-2 py-1.5 text-xs text-emerald-200">
              <span className="mr-2 text-[10px] font-mono text-emerald-400">{r.count}×</span>
              {r.rule}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function JournalPanel() {
  const [entries, setEntries] = useState<IdeaJournalEntry[]>([]);
  const [mounted, setMounted] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [lastEval, setLastEval] = useState<AutoEvalSummary | null>(null);

  const refresh = useCallback(() => setEntries(loadJournal()), []);

  const runAutoEval = useCallback(async () => {
    setEvaluating(true);
    try {
      const current = loadJournal();
      const summary = await evaluateAllPending(current);
      for (const r of summary.results) {
        if (Object.keys(r.patch).length > 0) {
          updateJournalEntry(r.entryId, r.patch);
        }
      }
      setLastEval(summary);
      setEntries(loadJournal());
    } finally {
      setEvaluating(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    setMounted(true);
    window.addEventListener(JOURNAL_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(JOURNAL_CHANGED_EVENT, refresh);
  }, [refresh]);

  useEffect(() => {
    if (!mounted) return;
    const all = loadJournal();
    const hasPending = all.some((e) => e.outcome1d === 'pending' || e.outcome1d === undefined || e.outcome3d === 'pending' || e.outcome3d === undefined || e.outcome7d === 'pending' || e.outcome7d === undefined);
    if (hasPending) runAutoEval();
  }, [mounted, runAutoEval]);

  if (!mounted) return <PanelSkeleton />;

  const stats = computeJournalStats(entries);
  const sorted = [...entries].sort((a, b) => b.savedAt - a.savedAt);

  return (
    <section className="space-y-4 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Trading Journal</h2>
          <p className="mt-1 text-[11px] text-slate-500">
            Alle analysierten Ideen mit App-Bewertung und Outcome-Tracking. Krypto-Outcomes werden automatisch bewertet (1d/3d/7d/30d, Schwelle ±2%), Aktien/OS müssen manuell bewertet werden (Auto-Eval braucht Finnhub-Integration).
          </p>
        </div>
        <button
          onClick={runAutoEval}
          disabled={evaluating}
          className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1 text-[10px] uppercase tracking-wider text-slate-400 hover:border-emerald-500/40 hover:text-emerald-300 disabled:opacity-50"
        >
          {evaluating ? 'prüfe…' : 'Auto-Re-Check'}
        </button>
      </div>

      {lastEval && lastEval.attempted > 0 && (
        <div className="rounded-md border border-slate-800 bg-slate-950/40 p-2 text-[10px] text-slate-500">
          Letzter Auto-Check: {lastEval.attempted} pending geprüft, {lastEval.updated} aktualisiert, {lastEval.unverified} unverifiziert (z.B. Aktien ohne Live-Daten).
        </div>
      )}

      {entries.length === 0 && (
        <EmptyState
          title="Noch keine Journal-Einträge"
          description="Das Journal hält fest, was du gedacht hast — und wertet später automatisch aus, ob die These aufging. So findest du wiederkehrende Fehler."
          steps={[
            'Im Idea-Validator eine Trade-Idee analysieren.',
            '„Im Journal speichern" drücken — These und Score werden festgehalten.',
            'Nach 7 Tagen wird automatisch ausgewertet; Muster und Lehren erscheinen hier.'
          ]}
          actionLabel="Idee analysieren"
          onAction={() => { window.location.href = '/ideas'; }}
        />
      )}

      {entries.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 border-y border-slate-800 py-4 md:grid-cols-4">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500">Ideen analysiert</div>
              <div className="mt-1 font-mono text-2xl font-bold text-white">{stats.total}</div>
              <div className="font-mono text-[10px] text-slate-500">Ø Score {stats.avgScore.toFixed(0)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500">Aktionen</div>
              <div className="mt-1 font-mono text-base font-bold text-slate-100">
                <span className="text-emerald-300">{stats.bought}</span>
                <span className="text-slate-700"> / </span>
                <span className="text-amber-300">{stats.watched}</span>
                <span className="text-slate-700"> / </span>
                <span className="text-rose-300">{stats.rejected}</span>
              </div>
              <div className="font-mono text-[10px] text-slate-500">Kauf / Watch / Reject</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500">App-Trefferquote (7T)</div>
              <div className={`mt-1 font-mono text-2xl font-bold ${stats.appAccuracyPct !== null && stats.appAccuracyPct >= 50 ? 'text-emerald-300' : 'text-amber-300'}`}>
                {stats.appAccuracyPct !== null ? `${stats.appAccuracyPct.toFixed(0)}%` : '—'}
              </div>
              <div className="font-mono text-[10px] text-slate-500">{stats.appWasRight}R / {stats.appWasWrong}W</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500">Pending Outcomes</div>
              <div className="mt-1 font-mono text-2xl font-bold text-slate-300">
                {entries.filter((e) => e.outcome7d === 'pending').length}
              </div>
              <div className="font-mono text-[10px] text-slate-500">noch zu bewerten</div>
            </div>
          </div>

          <LessonsSection entries={entries} />

          <div className="space-y-2">
            {sorted.map((e) => (
              <EntryRow
                key={e.id}
                entry={e}
                onUpdate={(patch) => updateJournalEntry(e.id, patch)}
                onDelete={() => deleteJournalEntry(e.id)}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { parseWarningText } from '@/lib/warnings/parse-warning-text';
import { matchWarningToPositions, WarningMatchSeverity, WarningSummary } from '@/lib/warnings/match-warning-to-positions';
import { loadPositions } from '@/lib/positions';

const SAMPLE = `Verlustwarnung BMW

Setup ungültig, wenn BMW unter 72 € fällt. Optionsscheine mit Strike 84 und 100 kritisch — Restlaufzeit reicht nicht mehr für Erholung. Risiko reduzieren oder Stop nachziehen.

Betroffene WKNs: SY0N7Q, FD1D9P, HT0N3C
Stop bei 72 €.`;

function severityStyle(severity: WarningMatchSeverity): { border: string; bg: string; label: string; chipText: string } {
  switch (severity) {
    case 'critical': return { border: 'border-rose-500/60', bg: 'bg-rose-950/30', label: 'KRITISCH', chipText: 'text-rose-200' };
    case 'danger': return { border: 'border-rose-500/40', bg: 'bg-rose-950/15', label: 'GEFAHR', chipText: 'text-rose-300' };
    case 'warning': return { border: 'border-amber-500/40', bg: 'bg-amber-950/15', label: 'WARNUNG', chipText: 'text-amber-200' };
    case 'info': return { border: 'border-sky-500/30', bg: 'bg-sky-950/15', label: 'INFO', chipText: 'text-sky-200' };
  }
}

export function WarningMatcher() {
  const [text, setText] = useState('');
  const [summary, setSummary] = useState<WarningSummary | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleAnalyze = () => {
    if (!text.trim()) return;
    const parsed = parseWarningText(text);
    const positions = loadPositions();
    const result = matchWarningToPositions(parsed, positions);
    setSummary(result);
  };

  const handleReset = () => {
    setText('');
    setSummary(null);
  };

  if (!mounted) return null;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Verlustwarnung einfügen</h2>
          <button
            onClick={() => setText(SAMPLE)}
            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] uppercase tracking-wider text-slate-400 hover:border-rose-500/40 hover:text-rose-300"
          >
            Beispiel-Warnung laden
          </button>
        </div>
        <p className="mb-3 text-xs text-slate-500">
          Warntext einfügen (aus Chat, Newsletter, eigener Notiz). Die App parst betroffene Basiswerte/WKNs und prüft gegen deine offenen Positionen — und sagt klar wenn dein Trade direkt betroffen ist.
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Warntext hier einfügen…"
          className="min-h-[120px] w-full rounded-lg border border-slate-700 bg-slate-950 p-3 font-mono text-xs text-slate-100 placeholder:text-slate-600 focus:border-rose-400 focus:outline-none"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={handleAnalyze}
            disabled={!text.trim()}
            className="rounded-md border border-rose-400/50 bg-rose-500/20 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/30 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Warnung prüfen →
          </button>
          <button
            onClick={handleReset}
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-400 hover:border-slate-600 hover:text-slate-200"
          >
            Zurücksetzen
          </button>
        </div>
      </div>

      {summary && (
        <>
          <section className={`rounded-2xl border-2 p-5 ${summary.affectedCount > 0 ? severityStyle(summary.highestSeverity).border + ' ' + severityStyle(summary.highestSeverity).bg : 'border-emerald-500/30 bg-emerald-950/15'}`}>
            <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">
              Warning-Match · {summary.totalPositions} offene Position(en) geprüft
            </div>
            {summary.affectedCount === 0 ? (
              <>
                <h2 className="mt-1 text-2xl font-bold text-emerald-200">Keine deiner Positionen betroffen</h2>
                <p className="mt-1 text-sm text-slate-300">
                  Die Warnung erwähnt {summary.warning.detectedUnderlyings.length > 0 ? summary.warning.detectedUnderlyings.join(', ') : 'unklare Assets'}, aber das matched nichts aus deiner Position-Liste.
                </p>
              </>
            ) : (
              <>
                <h2 className="mt-1 text-2xl font-bold text-rose-200">
                  Diese Warnung betrifft {summary.affectedCount} deiner Positionen
                </h2>
                <p className="mt-1 text-sm text-slate-300">
                  Detail-Match unten. Nicht automatisch verkaufen — These prüfen, Stop respektieren, Exit-Regel anwenden.
                </p>
              </>
            )}
          </section>

          {summary.affectedPositions.map((m) => {
            const s = severityStyle(m.severity);
            return (
              <div key={m.position.id} className={`rounded-xl border ${s.border} ${s.bg} p-4`}>
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-mono text-base font-bold text-white">{m.position.underlying}</span>
                  {m.position.wkn && <span className="font-mono text-[11px] text-slate-400">{m.position.wkn}</span>}
                  <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${s.border} ${s.chipText}`}>{s.label}</span>
                  <span className="text-[10px] text-slate-500">{m.position.broker} · {m.position.instrumentType}</span>
                </div>
                <ul className="mt-2 space-y-1">
                  {m.reasons.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-200">
                      <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-rose-400" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
                <div className={`mt-3 rounded-md border ${s.border} bg-slate-950/40 p-2 text-[11px]`}>
                  <span className="font-semibold text-slate-200">Empfehlung: </span>
                  <span className="text-slate-300">{m.recommendation}</span>
                </div>
              </div>
            );
          })}

          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-[11px] text-slate-500">
            <div className="font-semibold text-slate-300">Erkannte Daten in der Warnung</div>
            <div className="mt-1">Basiswerte: <span className="text-slate-200">{summary.warning.detectedUnderlyings.join(', ') || '—'}</span></div>
            <div>WKNs: <span className="font-mono text-slate-200">{summary.warning.detectedWkns.join(', ') || '—'}</span></div>
            <div>Ticker: <span className="font-mono text-slate-200">{summary.warning.detectedTickers.join(', ') || '—'}</span></div>
            <div>Invalidierungs-Levels: <span className="text-slate-200">{summary.warning.invalidationLevels.map((l) => `${l.asset} @ ${l.level}€`).join(', ') || '—'}</span></div>
            <div>Hebel erwähnt: <span className="text-slate-200">{summary.warning.mentionsHebelprodukte ? 'ja' : 'nein'}</span> · Risk-Reduktion empfohlen: <span className="text-slate-200">{summary.warning.mentionsRiskReduction ? 'ja' : 'nein'}</span></div>
          </div>
        </>
      )}
    </div>
  );
}

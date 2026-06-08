'use client';

// Lern-Overlay über dem Vorstand. Liest das lokale Firma-Tagebuch + BTC-
// Preis-Snapshots aus dem Intel-Memory, berechnet pro Firma die Hit-Rate,
// rechnet den Vorstand mit Skill-Gewichten neu durch und blendet eine
// kompakte Lern-Notiz ein. Wenn noch zu wenig Daten vorhanden sind, zeigt
// die Komponente einen ehrlichen „Lernt noch"-Hinweis.

import { useEffect, useState } from 'react';
import { FIRMA_DECISIONS_CHANGED_EVENT, loadFirmaLog } from '@/lib/firma-memory';
import { INTEL_LOG_CHANGED_EVENT, loadIntelLog } from '@/lib/intel/memory';
import { computeFirmaAccuracy, MIN_EVAL_FOR_SKILL, skillMap, type FirmaAccuracy } from '@/lib/firma-accuracy';
import { vorstandMediation, type VorstandReport } from '@/lib/agents/vorstand';
import { VORSTAND_LOG_CHANGED_EVENT, computeVorstandAccuracy, loadVorstandLog, type VorstandAccuracy } from '@/lib/agents/vorstand-memory';
import type { AgentVerdict, PersonaId } from '@/lib/agents/personas';
import { applyLearnedOverridesToVerdicts, countFlips, type LearnedVerdict } from '@/lib/agents/learned-verdicts';

const FIRMA_TONE: Record<PersonaId, string> = {
  conservative: 'border-sky-400/40 bg-sky-500/10 text-sky-100',
  balanced: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100',
  aggressive: 'border-amber-400/40 bg-amber-500/10 text-amber-100'
};

interface Props {
  personas: AgentVerdict[];
  // Server-seitig gerenderte Vorstands-Entscheidung. Wir vergleichen, wie
  // das Skill-Gewicht das Bild verschiebt.
  serverReport: VorstandReport;
}

export function VorstandLearningOverlay({ personas, serverReport }: Props) {
  const [mounted, setMounted] = useState(false);
  const [accuracy, setAccuracy] = useState<FirmaAccuracy[]>([]);
  const [vorstandAcc, setVorstandAcc] = useState<VorstandAccuracy | null>(null);
  const [learnedReport, setLearnedReport] = useState<VorstandReport>(serverReport);
  const [overriddenReport, setOverriddenReport] = useState<VorstandReport>(serverReport);
  const [flipCount, setFlipCount] = useState(0);
  const [learnedVerdicts, setLearnedVerdicts] = useState<LearnedVerdict[]>([]);

  useEffect(() => {
    const sync = () => {
      const log = loadFirmaLog();
      const intelLog = loadIntelLog();
      const vorstandLog = loadVorstandLog();
      const priceMap = new Map<string, number>();
      for (const s of intelLog) if (s.btcPriceAtRecord !== null) priceMap.set(s.date, s.btcPriceAtRecord);
      const acc = computeFirmaAccuracy(log, (d) => priceMap.get(d) ?? null);
      setAccuracy(acc);
      setVorstandAcc(computeVorstandAccuracy(vorstandLog, (d) => priceMap.get(d) ?? null));
      const skill = skillMap(acc);
      setLearnedReport(vorstandMediation(personas, skill.size > 0 ? skill : null));

      // Tiefer: wende Learned-Override pro Firma an UND rechne den Vorstand
      // dann auf der überstimmten Persona-Liste neu durch. Damit kippt der
      // Track-Record nicht nur die Konfidenz, sondern auch die Anzahl der
      // gezählten BUYs — also den Vorstand-Verdict-Typ selbst.
      const accMap = new Map<PersonaId, FirmaAccuracy>();
      for (const a of acc) accMap.set(a.firma, a);
      const overridden = applyLearnedOverridesToVerdicts(personas, accMap);
      setLearnedVerdicts(overridden);
      setFlipCount(countFlips(overridden));
      setOverriddenReport(vorstandMediation(overridden, skill.size > 0 ? skill : null));
    };
    sync();
    setMounted(true);
    window.addEventListener(FIRMA_DECISIONS_CHANGED_EVENT, sync);
    window.addEventListener(INTEL_LOG_CHANGED_EVENT, sync);
    window.addEventListener(VORSTAND_LOG_CHANGED_EVENT, sync);
    return () => {
      window.removeEventListener(FIRMA_DECISIONS_CHANGED_EVENT, sync);
      window.removeEventListener(INTEL_LOG_CHANGED_EVENT, sync);
      window.removeEventListener(VORSTAND_LOG_CHANGED_EVENT, sync);
    };
  }, [personas]);

  if (!mounted) return null;

  const trained = accuracy.filter((a) => a.evaluated >= MIN_EVAL_FOR_SKILL);
  const allEvaluated = accuracy.reduce((s, a) => s + a.evaluated, 0);

  // Phase 1 — Lernt noch. Erst ab MIN_EVAL_FOR_SKILL pro Firma haben wir
  // Aussagekraft. Ehrlicher Hinweis statt vorgetäuschtem Lern-Effekt.
  if (trained.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3 text-[11px] leading-relaxed text-slate-400">
        <div className="text-[9.5px] font-semibold uppercase tracking-wider text-slate-500">Vorstand · Lern-Status</div>
        <p className="mt-1">
          Die drei Firmen werden aktuell trainiert. Jede vergangene Entscheidung wird mit dem nächsten BTC-Tagespreis abgeglichen, um die Trefferquote zu lernen.
          {' '}<span className="text-slate-300">Bisher {allEvaluated} bewertbare Entscheidung{allEvaluated === 1 ? '' : 'en'}</span> — ab je 5 pro Firma fließt das Lern-Signal in den Vorstand ein.
        </p>
      </section>
    );
  }

  const verdictChanged = learnedReport.verdict !== serverReport.verdict;
  const bestFirma = [...accuracy]
    .filter((a) => a.evaluated >= MIN_EVAL_FOR_SKILL && a.hitRatePct !== null)
    .sort((a, b) => (b.hitRatePct ?? 0) - (a.hitRatePct ?? 0))[0];

  return (
    <section className="space-y-2 rounded-2xl border-2 border-sky-400/40 bg-sky-950/15 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-300">Vorstand · Track-Record</span>
        <span className="text-[10px] text-slate-400">
          {trained.length} von {accuracy.length} Firma{accuracy.length === 1 ? '' : 'en'} eingelernt
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {accuracy.map((a) => {
          const enough = a.evaluated >= MIN_EVAL_FOR_SKILL;
          const hit = a.hitRatePct;
          return (
            <div key={a.firma} className={`rounded-md border px-2 py-1 ${enough ? FIRMA_TONE[a.firma] : 'border-slate-800 bg-slate-900/40 text-slate-500'}`}>
              <div className="text-[9.5px] uppercase tracking-wider opacity-80">{a.firmaName}</div>
              <div className="mt-0.5 font-mono text-sm font-bold">
                {hit !== null ? `${hit}%` : '—'}
              </div>
              <div className="text-[9px] opacity-70">
                {a.rightCalls}/{a.evaluated} richtig
              </div>
            </div>
          );
        })}
      </div>

      {learnedReport.skillNote && (
        <p className="rounded-md border border-sky-400/30 bg-sky-950/20 p-2 text-[11.5px] leading-relaxed text-sky-100">
          <span className="font-semibold text-sky-200">Lern-Hinweis: </span>{learnedReport.skillNote}
        </p>
      )}

      {verdictChanged && (
        <p className="rounded-md border border-amber-400/40 bg-amber-950/20 p-2 text-[11.5px] leading-relaxed text-amber-100">
          <span className="font-semibold">Skill-gewichtet würde der Vorstand abweichen:</span> raw &bdquo;{serverReport.verdict.replace(/_/g, ' ')}&ldquo; → Track-Record &bdquo;{learnedReport.verdict.replace(/_/g, ' ')}&ldquo;. Anlass für Vorsicht.
        </p>
      )}

      {/* Tiefer: hier zeigen wir den Vorstand auf Basis der Persona-Verdicts
          NACH dem Learned-Override. Wenn z.B. 2 Firmen ihre BUY-Stimme verlieren,
          kippt der Vorstand-Typ selbst (KAUFEN_VORSICHTIG → WATCHLIST etc.). */}
      {flipCount > 0 && overriddenReport.verdict !== serverReport.verdict && (
        <p className="rounded-md border border-rose-400/50 bg-rose-950/20 p-2 text-[11.5px] leading-relaxed text-rose-100">
          <span className="font-semibold">Lern-Override kippt den Vorstand: </span>
          {flipCount} {flipCount === 1 ? 'Firma' : 'Firmen'} verlieren wegen schlechtem Track-Record ihren BUY.
          Roh: &bdquo;{serverReport.verdict.replace(/_/g, ' ')}&ldquo; → nach Override: <span className="font-bold">&bdquo;{overriddenReport.verdict.replace(/_/g, ' ')}&ldquo;</span>.
          {learnedVerdicts.filter((v) => v.override.kind === 'downgrade-buy').map((v) => (
            <span key={v.persona} className="ml-1 block text-rose-200/80">· {v.name}: {v.override.reason}</span>
          ))}
        </p>
      )}
      {flipCount > 0 && overriddenReport.verdict === serverReport.verdict && (
        <p className="text-[10.5px] leading-snug text-amber-200/80">
          Lern-Override stuft {flipCount} Persona-BUY herunter, der Vorstand bleibt trotzdem auf &bdquo;{serverReport.verdict.replace(/_/g, ' ')}&ldquo; — die anderen Stimmen tragen.
        </p>
      )}

      {learnedReport.skillWeightedConfidence !== null && (
        <p className="text-[10.5px] leading-snug text-slate-400">
          Skill-gewichtete Konfidenz: <span className="font-mono font-bold text-slate-200">{Math.round(learnedReport.skillWeightedConfidence * 100)} %</span> der historisch gewichteten Stimme.
          {bestFirma && (
            <> Stärkster Track-Record aktuell: <span className="font-semibold text-slate-200">{bestFirma.firmaName}</span> mit {bestFirma.hitRatePct} %.</>
          )}
        </p>
      )}

      {vorstandAcc && vorstandAcc.evaluated >= MIN_EVAL_FOR_SKILL && vorstandAcc.hitRatePct !== null && (
        <div className="rounded-md border border-slate-800 bg-slate-950/40 p-2 text-[10.5px] leading-snug">
          <div className="flex items-baseline justify-between gap-1">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">Vorstand insgesamt</span>
            <span className={`font-mono font-bold ${
              vorstandAcc.hitRatePct >= 60 ? 'text-emerald-300'
              : vorstandAcc.hitRatePct >= 45 ? 'text-slate-200'
              : 'text-rose-300'
            }`}>
              {vorstandAcc.hitRatePct} %
            </span>
          </div>
          <p className="text-slate-400">
            {vorstandAcc.rightCalls}/{vorstandAcc.evaluated} kollektive Verdicts richtig.{' '}
            {vorstandAcc.perVerdict.KLARER_KAUF.evaluated >= 3 && vorstandAcc.perVerdict.KLARER_KAUF.hitRatePct !== null && (
              <>Bei KLARER_KAUF: <span className="text-slate-200">{vorstandAcc.perVerdict.KLARER_KAUF.hitRatePct} %</span>. </>
            )}
            {vorstandAcc.perVerdict.CASH_HALTEN.evaluated >= 3 && vorstandAcc.perVerdict.CASH_HALTEN.hitRatePct !== null && (
              <>Bei CASH_HALTEN: <span className="text-slate-200">{vorstandAcc.perVerdict.CASH_HALTEN.hitRatePct} %</span>.</>
            )}
          </p>
        </div>
      )}
    </section>
  );
}

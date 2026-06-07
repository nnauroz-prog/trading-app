// Große Status-Karte oben auf /daily. Zeigt klar: was ist heute der Modus?
// Keine Marketing-Sprache, kein „garantiert".

import type { ModeAssessment } from '@/lib/daily/daily-decision-engine';

const MODE_LABEL: Record<ModeAssessment['mode'], { headline: string; emoji: string; tone: string }> = {
  OFFENSIV:  { headline: 'OFFENSIV',  emoji: '🎯', tone: 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100' },
  SELEKTIV:  { headline: 'SELEKTIV',  emoji: '🎚️', tone: 'border-sky-400/50 bg-sky-500/15 text-sky-100' },
  DEFENSIV:  { headline: 'DEFENSIV',  emoji: '🛡️', tone: 'border-amber-400/50 bg-amber-500/15 text-amber-100' },
  CASH:      { headline: 'CASH / WARTEN', emoji: '💰', tone: 'border-slate-600 bg-slate-900/50 text-slate-200' }
};

const QUALITY_LABEL: Record<ModeAssessment['dataQuality'], { label: string; tone: string; explainer: string }> = {
  high:   { label: 'Datenlage gut',       tone: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100', explainer: 'Mehrere Quellen liefern.' },
  medium: { label: 'Datenlage teilweise', tone: 'border-amber-400/40 bg-amber-500/10 text-amber-100',     explainer: 'Nicht alle Quellen liefern — Entscheidung mit Vorbehalt.' },
  low:    { label: 'Datenlage dünn',      tone: 'border-rose-400/40 bg-rose-500/10 text-rose-100',         explainer: 'Zu wenig Quellen — Modus-Call ist ein Hinweis, keine Empfehlung.' }
};

export function DailyMarketModeCard({ assessment, generatedAtIso }: { assessment: ModeAssessment; generatedAtIso?: string }) {
  const m = MODE_LABEL[assessment.mode];
  const q = QUALITY_LABEL[assessment.dataQuality];
  const metrics = assessment.metrics;
  const confidencePct = Math.round(assessment.modeConfidence * 100);
  return (
    <section className={`space-y-3 rounded-2xl border-2 p-5 ${m.tone}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="text-3xl leading-none" aria-hidden>{m.emoji}</div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.25em] opacity-80">Heute · Markt-Modus</div>
            <h1 className="text-3xl font-bold tracking-tight">{m.headline}</h1>
            {generatedAtIso && (
              <div className="mt-0.5 text-[10px] opacity-70">Stand: {formatBerlinTime(generatedAtIso)}</div>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 text-right">
          <span className={`rounded border px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider ${q.tone}`} title={q.explainer}>
            {q.label}
          </span>
          <span className="rounded border border-current/40 px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider opacity-80">
            Confidence {confidencePct} %
          </span>
        </div>
      </div>
      <p className="text-[12px] leading-snug opacity-90">{assessment.reason}</p>
      <p className="text-[10.5px] leading-snug opacity-70">{q.explainer}</p>
      <div className="grid grid-cols-2 gap-2 text-center text-[11px] sm:grid-cols-4">
        <Stat label="Aktien Grade A" value={`${metrics.stocksGradeA}`} sub={`+${metrics.stocksGradeB} B`} />
        <Stat label="Rohstoffe Grade A" value={`${metrics.commoditiesGradeA}`} sub={`+${metrics.commoditiesGradeB} B`} />
        <Stat label="Sport ≥85 %" value={`${metrics.maximalSportTips}`} sub={`+${metrics.sehrSichereSportTips} ≥78 %`} />
        <Stat label="Vorstand kauft/tippt" value={`${metrics.personaBuyCount}/${metrics.personaTotal}`} sub={metrics.cryptoMaxSafety ? 'Krypto maxSafety' : metrics.cryptoGrade ? `Krypto Grade ${metrics.cryptoGrade}` : '—'} />
      </div>
    </section>
  );
}

function formatBerlinTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('de-DE', {
      timeZone: 'Europe/Berlin',
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    }) + ' Uhr';
  } catch {
    return iso;
  }
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border border-current/30 bg-slate-950/30 p-2">
      <div className="text-[9px] uppercase tracking-wider opacity-70">{label}</div>
      <div className="mt-0.5 font-mono text-base font-bold">{value}</div>
      <div className="text-[9px] opacity-70">{sub}</div>
    </div>
  );
}

// Große Status-Karte oben auf /daily. Zeigt klar: was ist heute der Modus?
// Keine Marketing-Sprache, kein „garantiert".

import type { ModeAssessment } from '@/lib/daily/daily-decision-engine';

const MODE_LABEL: Record<ModeAssessment['mode'], { headline: string; emoji: string; tone: string }> = {
  OFFENSIV:  { headline: 'OFFENSIV',  emoji: '🎯', tone: 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100' },
  SELEKTIV:  { headline: 'SELEKTIV',  emoji: '🎚️', tone: 'border-sky-400/50 bg-sky-500/15 text-sky-100' },
  DEFENSIV:  { headline: 'DEFENSIV',  emoji: '🛡️', tone: 'border-amber-400/50 bg-amber-500/15 text-amber-100' },
  CASH:      { headline: 'CASH / WARTEN', emoji: '💰', tone: 'border-slate-600 bg-slate-900/50 text-slate-200' }
};

export function DailyMarketModeCard({ assessment }: { assessment: ModeAssessment }) {
  const m = MODE_LABEL[assessment.mode];
  const metrics = assessment.metrics;
  return (
    <section className={`space-y-3 rounded-2xl border-2 p-5 ${m.tone}`}>
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="text-3xl leading-none" aria-hidden>{m.emoji}</div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.25em] opacity-80">Heute · Markt-Modus</div>
            <h1 className="text-3xl font-bold tracking-tight">{m.headline}</h1>
          </div>
        </div>
      </div>
      <p className="text-[12px] leading-snug opacity-90">{assessment.reason}</p>
      <div className="grid grid-cols-2 gap-2 text-center text-[11px] sm:grid-cols-4">
        <Stat label="Aktien Grade A" value={`${metrics.stocksGradeA}`} sub={`+${metrics.stocksGradeB} B`} />
        <Stat label="Rohstoffe Grade A" value={`${metrics.commoditiesGradeA}`} sub={`+${metrics.commoditiesGradeB} B`} />
        <Stat label="Sport ≥85 %" value={`${metrics.maximalSportTips}`} sub={`+${metrics.sehrSichereSportTips} ≥78 %`} />
        <Stat label="Vorstand kauft/tippt" value={`${metrics.personaBuyCount}/${metrics.personaTotal}`} sub={metrics.cryptoMaxSafety ? 'Krypto maxSafety' : metrics.cryptoGrade ? `Krypto Grade ${metrics.cryptoGrade}` : '—'} />
      </div>
    </section>
  );
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

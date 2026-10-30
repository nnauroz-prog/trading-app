// Render-Komponente für das Chef-Verdict. Der eine klare Berater-Block
// ganz oben auf der Startseite. Server-Component.

import Link from 'next/link';
import type { ChefVerdict } from '@/lib/analysis/chef-verdict';

const STANCE_STYLE: Record<ChefVerdict['stance'], { ring: string; badge: string; dot: string; label: string; glow: string }> = {
  opportunity: { ring: 'border-emerald-400/50', badge: 'text-emerald-200 border-emerald-400/40 bg-emerald-500/10', dot: 'bg-emerald-400', label: 'Gelegenheit', glow: 'shadow-[0_18px_50px_-18px_rgba(52,211,153,0.55)]' },
  selective: { ring: 'border-amber-400/40', badge: 'text-amber-200 border-amber-400/40 bg-amber-500/10', dot: 'bg-amber-400', label: 'Selektiv', glow: 'shadow-[0_18px_50px_-18px_rgba(251,191,36,0.45)]' },
  patience: { ring: 'border-slate-600/60', badge: 'text-slate-300 border-slate-600/50 bg-slate-500/10', dot: 'bg-slate-400', label: 'Geduld', glow: 'shadow-[0_18px_50px_-24px_rgba(148,163,184,0.4)]' },
  no_data: { ring: 'border-slate-700/60', badge: 'text-slate-400 border-slate-700/50 bg-slate-800/40', dot: 'bg-slate-500', label: 'Keine Daten', glow: '' }
};

const CONFIDENCE_STYLE: Record<ChefVerdict['confidence'], string> = {
  hoch: 'text-emerald-300',
  mittel: 'text-amber-300',
  niedrig: 'text-slate-400'
};

export function ChefVerdictCard({ verdict }: { verdict: ChefVerdict }) {
  const s = STANCE_STYLE[verdict.stance];
  return (
    <section className={`relative space-y-3 overflow-hidden rounded-3xl border ${s.ring} bg-gradient-to-br from-slate-900/80 via-slate-950/60 to-slate-950/80 p-4 backdrop-blur-sm md:p-5 ${s.glow}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-300">
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${s.dot} ${verdict.stance === 'opportunity' ? 'shadow-[0_0_10px_2px_rgba(52,211,153,0.8)]' : ''}`} />
          <span aria-hidden>🎩</span> Dein Berater · Tages-Verdict
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-md border px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider ${s.badge}`}>
            {s.label}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-slate-500">
            Konfidenz: <span className={CONFIDENCE_STYLE[verdict.confidence]}>{verdict.confidence}</span>
          </span>
        </div>
      </div>

      <h2 className="text-xl font-bold leading-snug tracking-tight text-white sm:text-2xl">
        {verdict.headline}
      </h2>

      {verdict.primary && (
        <Link
          href={verdict.primary.href}
          className="group block rounded-2xl border border-emerald-400/30 bg-emerald-500/[0.06] p-3.5 transition duration-200 hover:-translate-y-0.5 hover:border-emerald-400/60 hover:bg-emerald-500/[0.1] hover:shadow-[0_12px_34px_-14px_rgba(52,211,153,0.6)]"
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-emerald-200">{verdict.primary.assetClass}</span>
            <span className="text-[10px] font-semibold text-emerald-300 transition group-hover:translate-x-0.5">ansehen →</span>
          </div>
          <div className="mt-1.5 text-[15px] font-bold text-white">{verdict.primary.label}</div>
          <p className="mt-1 text-[11.5px] leading-snug text-slate-300">{verdict.primary.detail}</p>
        </Link>
      )}

      {verdict.reasoning.length > 0 && (
        <div className="space-y-1">
          <div className="text-[9.5px] font-semibold uppercase tracking-wider text-slate-500">Begruendung</div>
          <ul className="space-y-0.5">
            {verdict.reasoning.map((r, i) => (
              <li key={i} className="flex gap-1.5 text-[11.5px] leading-snug text-slate-300">
                <span aria-hidden className="text-slate-600">·</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {verdict.risks.length > 0 && (
        <div className="space-y-1 rounded-lg border border-slate-800 bg-slate-950/40 p-2.5">
          <div className="text-[9.5px] font-semibold uppercase tracking-wider text-amber-400/80">Risiko im Blick</div>
          <ul className="space-y-0.5">
            {verdict.risks.map((r, i) => (
              <li key={i} className="flex gap-1.5 text-[11px] leading-snug text-slate-400">
                <span aria-hidden className="text-amber-500/60">⚠</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {verdict.dataQualityNote && (
        <p className="text-[10px] leading-snug text-amber-300/80">{verdict.dataQualityNote}</p>
      )}

      <p className="text-[9.5px] leading-snug text-slate-500">
        Synthese aus Krypto-, Aktien- und Rohstoff-Signalen. Modell-Hinweis, kein Anlageratschlag — du entscheidest.
      </p>
    </section>
  );
}

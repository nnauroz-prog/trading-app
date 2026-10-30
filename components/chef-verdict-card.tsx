import Link from 'next/link';
import { ArrowUpRight, Braces, CircleAlert, CornerDownRight, ShieldAlert } from 'lucide-react';
import type { ChefVerdict } from '@/lib/analysis/chef-verdict';

const STANCE_STYLE: Record<ChefVerdict['stance'], { accent: string; badge: string; label: string; index: string }> = {
  opportunity: { accent: 'bg-[#d8ff62]', badge: 'border-[#d8ff62]/35 bg-[#d8ff62]/[0.07] text-[#d8ff62]', label: 'Gelegenheit', index: '01' },
  selective: { accent: 'bg-[#65e6ff]', badge: 'border-[#65e6ff]/35 bg-[#65e6ff]/[0.07] text-[#65e6ff]', label: 'Selektiv', index: '02' },
  patience: { accent: 'bg-[#d8a95d]', badge: 'border-[#d8a95d]/35 bg-[#d8a95d]/[0.07] text-[#e8c387]', label: 'Geduld', index: '03' },
  no_data: { accent: 'bg-[#718496]', badge: 'border-[#536779]/50 bg-[#718496]/[0.07] text-[#9cabb9]', label: 'Keine Daten', index: '—' }
};

const CONFIDENCE_STYLE: Record<ChefVerdict['confidence'], string> = {
  hoch: 'text-[#d8ff62]', mittel: 'text-[#65e6ff]', niedrig: 'text-[#9aaaba]'
};

export function ChefVerdictCard({ verdict }: { verdict: ChefVerdict }) {
  const style = STANCE_STYLE[verdict.stance];
  return (
    <section className="terminal-panel relative overflow-hidden border border-[#253340] bg-[#101822]">
      <div aria-hidden className={`absolute left-0 top-0 h-full w-[3px] ${style.accent}`} />
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="section-kicker flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#9cadbe]"><Braces aria-hidden className="h-4 w-4 text-[#65e6ff]" />Dein Berater / Tages-Verdict</div>
          <span className={`border px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-wider ${style.badge}`}>{style.label}</span>
        </div>
        <div className="mt-5 flex items-start gap-4 sm:gap-5">
          <span aria-hidden className="hidden border-r border-[#2a3947] pr-5 font-mono text-[34px] font-light leading-none tracking-tighter text-[#4f687c] sm:block">{style.index}</span>
          <div className="min-w-0">
            <h2 className="terminal-heading max-w-3xl text-[21px] font-semibold leading-[1.3] tracking-[-0.035em] text-white sm:text-[26px]">{verdict.headline}</h2>
            <p className="mt-3 font-mono text-[10px] text-[#8093a6]">MODELL-KONFIDENZ <span className={`ml-2 uppercase ${CONFIDENCE_STYLE[verdict.confidence]}`}>{verdict.confidence}</span></p>
          </div>
        </div>

        {verdict.primary && (
          <Link href={verdict.primary.href} className="group mt-5 grid grid-cols-[1fr_auto] items-center gap-3 border border-[#d8ff62]/25 bg-[#d8ff62]/[0.035] p-4 transition-colors hover:border-[#d8ff62]/60 hover:bg-[#d8ff62]/[0.065]">
            <div className="min-w-0"><span className="font-mono text-[9px] font-semibold uppercase tracking-[0.15em] text-[#d8ff62]">{verdict.primary.assetClass}</span><h3 className="mt-1.5 text-base font-semibold text-white">{verdict.primary.label}</h3><p className="mt-1.5 text-xs leading-relaxed text-[#a8b8c7]">{verdict.primary.detail}</p></div>
            <span className="flex h-9 w-9 items-center justify-center border border-[#d8ff62]/25 text-[#d8ff62] transition-colors group-hover:bg-[#d8ff62] group-hover:text-[#101822]"><ArrowUpRight aria-hidden className="h-4 w-4" /><span className="sr-only">Analyse ansehen</span></span>
          </Link>
        )}

        <div className="mt-5 grid gap-5 border-t border-[#253340] pt-4 sm:grid-cols-2">
          {verdict.reasoning.length > 0 && (
            <div><h3 className="font-mono text-[9px] font-semibold uppercase tracking-[0.15em] text-[#8fa3b7]">Warum dieser Stand</h3><ul className="mt-2.5 space-y-2">{verdict.reasoning.map((reason, i) => <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-[#b0c0ce]"><CornerDownRight aria-hidden className="mt-0.5 h-3 w-3 shrink-0 text-[#65e6ff]/60" /><span>{reason}</span></li>)}</ul></div>
          )}
          {verdict.risks.length > 0 && (
            <div className="border-l border-[#d8a95d]/35 pl-4"><h3 className="flex items-center gap-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.15em] text-[#e3bc7e]"><ShieldAlert aria-hidden className="h-3.5 w-3.5" />Risiko im Blick</h3><ul className="mt-2.5 space-y-2">{verdict.risks.map((risk, i) => <li key={i} className="text-xs leading-relaxed text-[#a8b7c6]">{risk}</li>)}</ul></div>
          )}
        </div>
        {verdict.dataQualityNote && <p className="mt-4 flex items-start gap-2 border-t border-[#253340] pt-3 text-[11px] leading-relaxed text-[#d8b77f]"><CircleAlert aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>{verdict.dataQualityNote}</span></p>}
        <p className="mt-4 text-[10px] leading-relaxed text-[#7f92a6]">Synthese aus Krypto-, Aktien- und Rohstoff-Signalen. Modell-Hinweis, kein Anlageratschlag.</p>
      </div>
    </section>
  );
}

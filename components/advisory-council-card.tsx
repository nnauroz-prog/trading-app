import { BrainCircuit, ChevronDown, Compass, Fingerprint, ShieldCheck, TrendingUp, UsersRound, type LucideIcon } from 'lucide-react';
import type { AgentStance, CouncilResult } from '@/lib/analysis/advisory-council';

const STANCE_STYLE: Record<AgentStance, { chip: string; label: string }> = {
  bullish: { chip: 'border-[#d8ff62]/30 bg-[#d8ff62]/[0.06] text-[#d8ff62]', label: 'bullisch' },
  constructive: { chip: 'border-[#65e6ff]/30 bg-[#65e6ff]/[0.06] text-[#65e6ff]', label: 'konstruktiv' },
  neutral: { chip: 'border-[#43596d]/60 bg-[#718496]/[0.06] text-[#a6b6c5]', label: 'neutral' },
  caution: { chip: 'border-[#d8a95d]/35 bg-[#d8a95d]/[0.06] text-[#e3bc7e]', label: 'vorsichtig' },
  bearish: { chip: 'border-[#ff879b]/30 bg-[#ff879b]/[0.06] text-[#ff9cae]', label: 'bärisch' }
};

const AGENT_ICON: Record<string, LucideIcon> = {
  'Trend-Analyst': TrendingUp,
  'Risk-Manager': ShieldCheck,
  'Sentiment-Analyst': Fingerprint,
  'Disziplin-Coach': BrainCircuit,
  'Chef-Analyst': Compass
};

export function AdvisoryCouncilCard({ council }: { council: CouncilResult }) {
  const net = STANCE_STYLE[council.netStance];
  return (
    <section className="terminal-panel overflow-hidden border border-[#253340] bg-[#101822]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#253340] px-5 py-4 sm:px-6">
        <div className="section-kicker flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.15em] text-[#9cadbe]"><UsersRound aria-hidden className="h-4 w-4 text-[#65e6ff]" />Der Rat / Analysten</div>
        <span className={`border px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-wider ${net.chip}`}>Konsens: {net.label}</span>
      </header>

      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-3 sm:gap-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-[#65e6ff]/25 bg-[#65e6ff]/[0.04] text-[#65e6ff]"><Compass aria-hidden className="h-[18px] w-[18px]" /></span>
          <div className="min-w-0"><p className="font-mono text-[9px] font-semibold uppercase tracking-[0.15em] text-[#65e6ff]">Chef-Direktive</p><p className="terminal-heading mt-2 text-[16px] font-medium leading-relaxed tracking-[-0.02em] text-[#edf4fa] sm:text-lg">{council.chiefDirective}</p></div>
        </div>
      </div>

      {council.voices.length > 1 && (
        <details className="group border-t border-[#253340]">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3.5 text-[11px] text-[#a6b8c8] transition-colors hover:bg-white/[0.025] hover:text-white sm:px-6">
            <span className="flex items-center gap-2.5"><span className="border border-[#334b5e] px-1.5 py-0.5 font-mono text-[10px] text-[#65e6ff]">{council.voices.length.toString().padStart(2, '0')}</span>Analysten-Stimmen im Detail</span>
            <ChevronDown aria-hidden className="h-3.5 w-3.5 text-[#65e6ff] transition-transform group-open:rotate-180" />
          </summary>
          <ul className="grid gap-px border-t border-[#253340] bg-[#253340] sm:grid-cols-2">
            {council.voices.map((voice, i) => {
              const stance = STANCE_STYLE[voice.stance];
              const Icon = AGENT_ICON[voice.name] ?? Compass;
              return (
                <li key={i} className="min-w-0 bg-[#0c141e] p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex min-w-0 items-start gap-2.5"><Icon aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-[#65e6ff]/80" /><div><h3 className="text-xs font-semibold text-[#edf4fa]">{voice.name}</h3><p className="mt-1 text-[10px] text-[#8197aa]">{voice.role}</p></div></div>
                    <span className={`border px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider ${stance.chip}`}>{stance.label}</span>
                  </div>
                  <p className="mt-3 text-[12px] leading-relaxed text-[#a9bac9]">{voice.say}</p>
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </section>
  );
}

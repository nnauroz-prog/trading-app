// "Der Rat" — zeigt die einzelnen Analysten-Stimmen (inkl. Markt-Emotion
// und Disziplin-Coach) und die Chef-Direktive. Server-Component.

import type { AgentStance, CouncilResult } from '@/lib/analysis/advisory-council';

const STANCE_STYLE: Record<AgentStance, { chip: string; label: string }> = {
  bullish: { chip: 'text-emerald-200 border-emerald-400/40 bg-emerald-500/10', label: 'bullisch' },
  constructive: { chip: 'text-emerald-200/90 border-emerald-400/30 bg-emerald-500/5', label: 'konstruktiv' },
  neutral: { chip: 'text-slate-300 border-slate-600/50 bg-slate-500/10', label: 'neutral' },
  caution: { chip: 'text-amber-200 border-amber-400/40 bg-amber-500/10', label: 'vorsichtig' },
  bearish: { chip: 'text-rose-200 border-rose-400/40 bg-rose-500/10', label: 'baerisch' }
};

const AGENT_EMOJI: Record<string, string> = {
  'Trend-Analyst': '📈',
  'Risk-Manager': '🛡️',
  'Sentiment-Analyst': '🎭',
  'Disziplin-Coach': '🧠',
  'Chef-Analyst': '🎩'
};

export function AdvisoryCouncilCard({ council }: { council: CouncilResult }) {
  const net = STANCE_STYLE[council.netStance];
  return (
    <section className="space-y-3 rounded-2xl border border-slate-700/60 bg-slate-950/40 p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">
          Der Rat · mehrere Analysten
        </div>
        <span className={`rounded-md border px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider ${net.chip}`}>
          Konsens: {net.label}
        </span>
      </div>

      {/* Chef-Direktive zuerst — die Synthese */}
      <div className="rounded-xl border border-emerald-400/30 bg-emerald-950/15 p-3">
        <div className="flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-wider text-emerald-300">
          <span aria-hidden>🎩</span> Chef-Direktive
        </div>
        <p className="mt-1 text-[12.5px] font-semibold leading-snug text-white">{council.chiefDirective}</p>
      </div>

      {/* Einzelne Stimmen */}
      <ul className="space-y-1.5">
        {council.voices.map((v, idx) => {
          const st = STANCE_STYLE[v.stance];
          return (
            <li key={idx} className="rounded-lg border border-slate-800 bg-slate-900/40 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-100">
                  <span aria-hidden>{AGENT_EMOJI[v.name] ?? '•'}</span>
                  {v.name}
                  <span className="text-[9.5px] font-normal text-slate-500">· {v.role}</span>
                </span>
                <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[8.5px] font-semibold uppercase tracking-wider ${st.chip}`}>
                  {st.label}
                </span>
              </div>
              <p className="mt-1 text-[11.5px] leading-snug text-slate-300">{v.say}</p>
            </li>
          );
        })}
      </ul>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-2.5">
          <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">🎭 Markt-Emotion</div>
          <p className="mt-0.5 text-[11px] leading-snug text-slate-300">{council.emotionRead}</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-2.5">
          <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">🧠 Deine Psychologie</div>
          <p className="mt-0.5 text-[11px] leading-snug text-slate-300">{council.disciplineReminder}</p>
        </div>
      </div>
    </section>
  );
}

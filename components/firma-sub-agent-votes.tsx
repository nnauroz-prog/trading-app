// Zeigt die ECHTEN Stimmen der Sub-Agenten einer Firma — nicht nur die Namen.
// Pro Agent: Stimme + Begründung, farbcodiert nach voteTone.

import type { SubAgentReport } from '@/lib/agents/sub-agents';

const TONE: Record<SubAgentReport['voteTone'], string> = {
  good:    'border-emerald-400/50 bg-emerald-500/10 text-emerald-200',
  neutral: 'border-slate-700 bg-slate-900/60 text-slate-300',
  bad:     'border-rose-400/50 bg-rose-500/10 text-rose-200'
};

const ROLE_EMOJI: Record<SubAgentReport['role'], string> = {
  analyst:   '📊',
  scout:     '🔭',
  risk:      '🛡️',
  news:      '📰',
  position:  '⚖️',
  liquidity: '💧',
  backtest:  '🧪'
};

export function FirmaSubAgentVotes({ team }: { team: SubAgentReport[] }) {
  if (team.length === 0) return null;
  const positives = team.filter((t) => t.voteTone === 'good').length;
  const negatives = team.filter((t) => t.voteTone === 'bad').length;

  return (
    <div className="rounded-md border border-slate-800 bg-slate-950/40 p-2 text-[11px]">
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-[9px] uppercase tracking-wider text-slate-500">Sub-Agenten-Team ({team.length})</div>
        <div className="font-mono text-[9.5px] text-slate-400">
          <span className="text-emerald-300">{positives}+</span>
          {' / '}
          <span className="text-slate-400">{team.length - positives - negatives}~</span>
          {' / '}
          <span className="text-rose-300">{negatives}−</span>
        </div>
      </div>
      <ul className="mt-1.5 space-y-1">
        {team.map((agent) => (
          <li key={agent.role} className={`grid grid-cols-[auto_1fr_auto] gap-2 rounded border px-2 py-1 text-[10.5px] ${TONE[agent.voteTone]}`}>
            <span className="text-[12px] leading-none" aria-hidden>{ROLE_EMOJI[agent.role]}</span>
            <div className="min-w-0">
              <div className="truncate font-semibold">{agent.title}</div>
              <div className="truncate text-[9.5px] opacity-80">{agent.reason}</div>
            </div>
            <span className="shrink-0 font-mono text-[9.5px] font-bold uppercase tracking-wider opacity-80">
              {agent.vote}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

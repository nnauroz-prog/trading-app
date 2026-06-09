// Vier Agenten-Karten — Datenpruefer, Modellpruefer, Risiko-Veto,
// Kalibrierungswaechter. Status pro Agent: OK | WARNUNG | BLOCKIERT,
// kurzer Grund, betroffene Picks.

import type { AgentStatus, PrecisionAgentStatus } from '@/lib/sport/sport-precision-gate';

interface AgentSummary {
  status: PrecisionAgentStatus;
  affectedPicks: number;
}

interface Props {
  agents: AgentSummary[];
}

const STATUS_CLASS: Record<AgentStatus, string> = {
  OK: 'border-emerald-500/40 bg-emerald-950/15 text-emerald-100',
  WARNUNG: 'border-amber-500/40 bg-amber-950/20 text-amber-100',
  BLOCKIERT: 'border-rose-500/40 bg-rose-950/20 text-rose-100'
};

const STATUS_DOT: Record<AgentStatus, string> = {
  OK: 'bg-emerald-400',
  WARNUNG: 'bg-amber-400',
  BLOCKIERT: 'bg-rose-400'
};

export function SportAgentCheck({ agents }: Props) {
  if (agents.length === 0) return null;
  return (
    <section className="space-y-2" aria-label="Agenten-Check">
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Agenten-Check</div>
      <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {agents.map(({ status, affectedPicks }) => (
          <li key={status.id} className={`rounded-lg border p-2 ${STATUS_CLASS[status.status]}`}>
            <div className="flex items-center gap-1.5">
              <span className={`inline-block h-2 w-2 rounded-full ${STATUS_DOT[status.status]}`} aria-hidden />
              <span className="text-[10px] font-semibold uppercase tracking-wider">{status.label}</span>
            </div>
            <div className="mt-1 text-[10px] font-mono uppercase tracking-wider opacity-80">{status.status}</div>
            <p className="mt-1 line-clamp-3 text-[10.5px] leading-snug opacity-90">{status.reason}</p>
            {affectedPicks > 0 && (
              <p className="mt-1 text-[9.5px] opacity-60">betrifft {affectedPicks} Pick{affectedPicks === 1 ? '' : 's'}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

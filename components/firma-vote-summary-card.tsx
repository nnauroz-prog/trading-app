import type { FirmaVoteSummary } from '@/lib/agents/firma-vote-aggregator';
import type { SubAgentReport } from '@/lib/agents/sub-agents';
import type { PersonaId } from '@/lib/agents/personas';
import { SubAgentHitRateBadge } from '@/components/sub-agent-hit-rate-badge';

interface Props {
  voteSummary: FirmaVoteSummary;
  team: SubAgentReport[];
  firmaName: string;
  firmaId: PersonaId;
}

const DIRECTION_STYLE: Record<FirmaVoteSummary['direction'], { tone: string; label: string }> = {
  kaufen: { tone: 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100', label: 'KAUFEN' },
  warten: { tone: 'border-rose-400/50 bg-rose-500/15 text-rose-200', label: 'WARTEN' },
  mixed: { tone: 'border-amber-400/50 bg-amber-500/10 text-amber-200', label: 'GEMISCHT' }
};

const ROLE_LABEL: Record<string, string> = {
  analyst: 'Analyst',
  scout: 'Scout',
  risk: 'Risiko-Manager',
  news: 'News-Watcher',
  position: 'Position-Manager',
  liquidity: 'Liquiditäts-Spezialist',
  backtest: 'Backtest-Auditor'
};

// Übertragung des Sport-Firma-Vote-Patterns auf die drei Trading-Firmen.
// Jede Firma hat 7 Sub-Agenten — ihre Stimmen werden aggregiert und mit jeder
// einzelnen Begründung sichtbar gemacht.
export function FirmaVoteSummaryCard({ voteSummary, team, firmaName, firmaId }: Props) {
  const style = DIRECTION_STYLE[voteSummary.direction];
  return (
    <div className="space-y-2 rounded-xl border border-slate-800/80 bg-slate-950/40 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Konsens der {firmaName}</h4>
        <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${style.tone}`}>
          {style.label}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-1.5 text-center">
        <Stat label="Positiv" value={voteSummary.positiveVotes} tone="emerald" />
        <Stat label="Neutral" value={voteSummary.neutralVotes} tone="slate" />
        <Stat label="Negativ" value={voteSummary.negativeVotes} tone="rose" />
      </div>
      <details className="rounded border border-slate-800 bg-slate-950/60">
        <summary className="cursor-pointer p-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200">
          ▸ Alle {team.length} Stimmen lesen ({voteSummary.positiveVotes + voteSummary.negativeVotes} eindeutig, {voteSummary.neutralVotes} neutral)
        </summary>
        <ul className="space-y-1 p-2 pt-0">
          {team.map((r, i) => (
            <li key={`${r.role}-${i}`} className="grid grid-cols-[auto_1fr_auto] gap-2 rounded border border-slate-800 bg-slate-950/40 p-1.5 text-[10.5px]">
              <span className={`font-mono text-[9px] uppercase tracking-wider ${r.voteTone === 'good' ? 'text-emerald-300' : r.voteTone === 'bad' ? 'text-rose-300' : 'text-slate-400'}`}>
                {r.voteTone === 'good' ? '✓' : r.voteTone === 'bad' ? '✗' : '○'}
              </span>
              <span>
                <span className="font-semibold text-slate-200">{ROLE_LABEL[r.role] ?? r.role}</span>
                <span className="ml-1 text-slate-500">→ {r.vote}</span>
                <div className="text-[10px] text-slate-400">{r.reason}</div>
              </span>
              <SubAgentHitRateBadge firma={firmaId} role={r.role} />
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: 'emerald' | 'rose' | 'slate' }) {
  const cls = tone === 'emerald' ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
    : tone === 'rose' ? 'border-rose-400/30 bg-rose-500/10 text-rose-300'
    : 'border-slate-700 bg-slate-900/40 text-slate-300';
  return (
    <div className={`rounded border p-1 ${cls}`}>
      <div className="text-[8.5px] uppercase tracking-wider opacity-70">{label}</div>
      <div className="mt-0.5 font-mono text-sm font-bold">{value}</div>
    </div>
  );
}

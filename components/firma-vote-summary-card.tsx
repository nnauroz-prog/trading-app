'use client';

import { useEffect, useState } from 'react';
import type { FirmaVoteSummary } from '@/lib/agents/firma-vote-aggregator';
import { summariseFirmaVotes } from '@/lib/agents/firma-vote-aggregator';
import type { SubAgentReport } from '@/lib/agents/sub-agents';
import type { PersonaId } from '@/lib/agents/personas';
import { SubAgentHitRateBadge } from '@/components/sub-agent-hit-rate-badge';
import { FIRMA_DECISIONS_CHANGED_EVENT, loadFirmaLog } from '@/lib/firma-memory';
import { INTEL_LOG_CHANGED_EVENT, loadIntelLog } from '@/lib/intel/memory';
import { computeSubAgentAccuracy } from '@/lib/agents/sub-agent-accuracy';

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
  // Client-seitig: lokale Hit-Rates dazuholen und skill-gewichteten Konsens
  // berechnen. Wenn keine Daten vorhanden sind, identisch zum Server-Aggregat.
  const [skillSummary, setSkillSummary] = useState<FirmaVoteSummary>(voteSummary);
  useEffect(() => {
    const sync = () => {
      const firmaLog = loadFirmaLog();
      const intelLog = loadIntelLog();
      const priceMap = new Map<string, number>();
      for (const s of intelLog) if (s.btcPriceAtRecord !== null) priceMap.set(s.date, s.btcPriceAtRecord);
      const rows = computeSubAgentAccuracy(firmaLog, (d) => priceMap.get(d) ?? null);
      const hitRates = new Map<string, number>();
      for (const r of rows) {
        if (r.firma === firmaId && r.hitRatePct !== null && r.evaluated >= 5) {
          hitRates.set(r.role, r.hitRatePct);
        }
      }
      setSkillSummary(summariseFirmaVotes(team, hitRates));
    };
    sync();
    window.addEventListener(FIRMA_DECISIONS_CHANGED_EVENT, sync);
    window.addEventListener(INTEL_LOG_CHANGED_EVENT, sync);
    return () => {
      window.removeEventListener(FIRMA_DECISIONS_CHANGED_EVENT, sync);
      window.removeEventListener(INTEL_LOG_CHANGED_EVENT, sync);
    };
  }, [firmaId, team]);

  const style = DIRECTION_STYLE[skillSummary.direction];
  const showSkillBoost = Math.abs(skillSummary.skillWeightedConfidence - skillSummary.confidence) > 0.05;
  return (
    <div className="space-y-2 rounded-xl border border-slate-800/80 bg-slate-950/40 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Konsens der {firmaName}</h4>
        <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${style.tone}`}>
          {style.label}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-1.5 text-center">
        <Stat label="Positiv" value={skillSummary.positiveVotes} tone="emerald" />
        <Stat label="Neutral" value={skillSummary.neutralVotes} tone="slate" />
        <Stat label="Negativ" value={skillSummary.negativeVotes} tone="rose" />
      </div>
      {showSkillBoost && (
        <p className="text-[9.5px] leading-snug text-slate-500">
          Skill-gewichtet: <span className="font-mono text-slate-300">{Math.round(skillSummary.skillWeightedConfidence * 100)} %</span>
          {' '}(roh: {Math.round(skillSummary.confidence * 100)} %). Sub-Agenten mit höherer Trefferquote zählen mehr.
        </p>
      )}
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

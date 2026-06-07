import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { CEO_BIOS, SUBAGENT_BIOS } from '@/lib/agents/personalities';
import { evaluatePersonas, type PersonaId } from '@/lib/agents/personas';
import { buildMasterSignal, type TradeMode } from '@/lib/analysis/master-signal-engine';
import { getBacktestSummary } from '@/lib/analysis/backtest-summary';
import { runSpaeher } from '@/lib/akademie/spaeher';
import { getCryptoNews } from '@/lib/news/news-agent';
import { listMacroEventsThisWeek } from '@/lib/calendar/macro-events';
import { computeEventWindow } from '@/lib/calendar/event-window';
import { generateTradeMemo } from '@/lib/agents/trade-memo';
import { SubAgentHitRateBadge } from '@/components/sub-agent-hit-rate-badge';
import { FirmaSubAgentVotes } from '@/components/firma-sub-agent-votes';
import { FirmaTradeMemoPanel } from '@/components/firma-trade-memo-panel';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

interface PageProps {
  params: Promise<{ firmaId: string }>;
}

const FIRMA_LABEL: Record<PersonaId, string> = {
  conservative: 'Konservativ',
  balanced: 'Balanciert',
  aggressive: 'Aggressiv'
};

const FIRMA_TONE: Record<PersonaId, string> = {
  conservative: 'border-sky-400/50 bg-sky-950/15',
  balanced: 'border-emerald-400/50 bg-emerald-950/15',
  aggressive: 'border-amber-400/50 bg-amber-950/15'
};

const ROLE_LABEL: Record<string, string> = {
  analyst: 'Markt-Analyst',
  scout: 'Scout',
  risk: 'Risiko-Manager',
  news: 'News-Watcher',
  liquidity: 'Liquiditäts-Spezialist',
  backtest: 'Backtest-Auditor',
  position: 'Position-Manager'
};

function isPersonaId(s: string): s is PersonaId {
  return s === 'conservative' || s === 'balanced' || s === 'aggressive';
}

function hueFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default async function FirmaDetailPage({ params }: PageProps) {
  const { firmaId } = await params;
  if (!isPersonaId(firmaId)) return notFound();

  const ceo = CEO_BIOS[firmaId];
  const subAgents = SUBAGENT_BIOS[firmaId];
  const subAgentEntries = Object.entries(subAgents);

  // Live-Entscheidung der Firma berechnen — daraus wird die Top-Card oben.
  const tradeMode: TradeMode = (await cookies()).get('trade-mode')?.value === 'daytrade' ? 'daytrade' : 'swing';
  const [report, backtest, newsItems] = await Promise.all([
    buildMasterSignal(tradeMode),
    getBacktestSummary(),
    getCryptoNews()
  ]);
  const spaeher = runSpaeher(newsItems);
  const eventWindow = computeEventWindow(listMacroEventsThisWeek());
  const allVerdicts = evaluatePersonas(report, backtest, spaeher, eventWindow);
  const myVerdict = allVerdicts.find((v) => v.persona === firmaId) ?? null;
  const memo = myVerdict ? generateTradeMemo(myVerdict) : null;
  const isBuy = myVerdict?.verdict === 'BUY';

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <Link href="/agent" className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-emerald-300">
        ← zurück zu allen Firmen
      </Link>

      <header className={`rounded-2xl border-2 p-5 ${FIRMA_TONE[firmaId]}`}>
        <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">{FIRMA_LABEL[firmaId]}-Firma</div>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">{ceo.name}</h1>
        <div className="mt-0.5 text-[12px] text-slate-300">{ceo.role}</div>
        <p className="mt-3 text-[13px] leading-relaxed text-slate-200">{ceo.bio}</p>
        <blockquote className="mt-3 border-l-2 border-slate-400 pl-3 text-[12px] italic text-slate-200">
          &bdquo;{ceo.quote}&ldquo;
        </blockquote>
      </header>

      {myVerdict && (
        <section className={`space-y-3 rounded-2xl border-2 p-4 ${isBuy ? 'border-emerald-400/60 bg-emerald-950/30' : 'border-slate-700 bg-slate-900/40'}`}>
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Heutiges Verdict</div>
              <h2 className={`mt-0.5 text-xl font-bold ${isBuy ? 'text-emerald-100' : 'text-slate-100'}`}>
                {myVerdict.verdict === 'BUY'
                  ? (myVerdict.target ? `KAUFEN — ${myVerdict.target.symbol}` : 'KAUFEN')
                  : 'WARTEN'}
              </h2>
            </div>
            <span className={`shrink-0 rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${isBuy ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-100' : 'border-slate-700 bg-slate-900 text-slate-400'}`}>
              {myVerdict.verdict}
            </span>
          </div>

          <p className="text-[12px] leading-relaxed text-slate-200">{myVerdict.rationale}</p>

          {myVerdict.ceoFinalWord && (
            <p className="rounded-md border border-slate-700/60 bg-slate-950/40 p-2 text-[11px] italic leading-relaxed text-slate-300">
              CEO-Schlusswort: {myVerdict.ceoFinalWord}
            </p>
          )}

          <FirmaSubAgentVotes team={myVerdict.team} />

          {memo && <FirmaTradeMemoPanel memo={memo} />}
        </section>
      )}

      <section className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
        <header>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Sub-Agenten-Team ({subAgentEntries.length})</h2>
          <p className="mt-0.5 text-[10.5px] leading-snug text-slate-500">
            Jede Rolle hat eine Person mit Namen, Hintergrund und Lieblings-Spruch. Die Trefferquote rechts wird live aus deinem lokalen Firma-Tagebuch berechnet.
          </p>
        </header>
        <ul className="space-y-2">
          {subAgentEntries.map(([role, agent]) => {
            const hue = hueFromId(`${firmaId}-${role}`);
            return (
              <li key={role} className="grid grid-cols-[2.5rem_1fr_auto] items-start gap-2 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full font-mono text-[11px] font-bold text-white"
                  style={{ background: `hsl(${hue}, 45%, 35%)` }}
                  aria-hidden
                >
                  {initials(agent.name)}
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-white">{agent.name}</div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">{ROLE_LABEL[role] ?? role}</div>
                  <p className="mt-1 text-[11.5px] leading-snug text-slate-300">{agent.bio}</p>
                  <blockquote className="mt-1 border-l-2 border-slate-700 pl-2 text-[10.5px] italic text-slate-400">
                    &bdquo;{agent.quote}&ldquo;
                  </blockquote>
                </div>
                <SubAgentHitRateBadge firma={firmaId} role={role} />
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}

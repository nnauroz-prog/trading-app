import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CEO_BIOS, SUBAGENT_BIOS } from '@/lib/agents/personalities';
import type { PersonaId } from '@/lib/agents/personas';
import { SubAgentHitRateBadge } from '@/components/sub-agent-hit-rate-badge';

export const dynamic = 'force-static';

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
          „{ceo.quote}“
        </blockquote>
      </header>

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
                    „{agent.quote}“
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

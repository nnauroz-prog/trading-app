// Drei Persönlichkeiten geben für die heutige Rohstoff-Lage ihr Verdict ab.

import Link from 'next/link';
import type { CommodityAgentVerdict } from '@/lib/agents/commodity-personas';

const VERDICT_TONE: Record<CommodityAgentVerdict['verdict'], string> = {
  KAUFEN: 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100',
  BEOBACHTEN: 'border-amber-400/40 bg-amber-500/10 text-amber-100',
  WARTEN: 'border-slate-700 bg-slate-900/40 text-slate-300'
};

const VOTE_TONE: Record<'POSITIV' | 'NEUTRAL' | 'NEGATIV', string> = {
  POSITIV: 'text-emerald-300',
  NEUTRAL: 'text-slate-400',
  NEGATIV: 'text-rose-300'
};

const PERSONA_EMOJI: Record<string, string> = {
  conservative: '🛡️',
  balanced: '⚖️',
  aggressive: '⚡'
};

export function CommodityPersonaPanel({ verdicts }: { verdicts: CommodityAgentVerdict[] }) {
  return (
    <section className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">👥 Rohstoff-Vorstand</h2>
        <p className="mt-1 text-[10.5px] leading-snug text-slate-500">
          Drei Persönlichkeiten — eigene Risiko-Regeln, eigener Pick, eigenes Verdict.
          Wenn alle drei &bdquo;KAUFEN&ldquo; sagen: starkes Signal. Sonst: gemischt — Vorsicht.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {verdicts.map((v) => (
          <article key={v.persona} className={`flex flex-col gap-2 rounded-xl border-2 p-3 ${VERDICT_TONE[v.verdict]}`}>
            <header>
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-[13px] font-bold">
                  {PERSONA_EMOJI[v.persona] ?? ''} {v.name}
                </h3>
                <span className="rounded border border-current/40 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider">
                  {v.verdict}
                </span>
              </div>
              <p className="mt-0.5 text-[10px] italic opacity-80">&bdquo;{v.motto}&ldquo;</p>
            </header>
            {v.target ? (
              <Link
                href={`/rohstoffe/${encodeURIComponent(v.target.symbol)}`}
                className="rounded-lg border border-current/30 bg-slate-950/40 p-2 transition hover:brightness-110"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[12px] font-bold">
                    {v.target.emoji && <span className="mr-1">{v.target.emoji}</span>}
                    {v.target.name}
                  </span>
                  <span className="font-mono text-[10px] opacity-80">{v.target.assessment.grade} · {v.target.assessment.score}/100</span>
                </div>
                <div className="text-[9.5px] opacity-80">{v.target.symbol} · {v.target.group}</div>
              </Link>
            ) : (
              <div className="rounded-lg border border-current/30 bg-slate-950/40 p-2 text-[11px] italic">
                Kein Target heute.
              </div>
            )}
            <p className="text-[10.5px] leading-snug opacity-90">{v.rationale}</p>
            {v.team.length > 0 && (
              <details className="rounded-md border border-current/30 bg-slate-950/40 p-1.5">
                <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-wider opacity-80">
                  ▸ Sub-Agenten-Team ({v.team.length})
                </summary>
                <ul className="mt-1.5 space-y-1">
                  {v.team.map((t, i) => (
                    <li key={i} className="grid grid-cols-[auto_1fr] gap-2 text-[10.5px] leading-snug">
                      <span className={`font-bold ${VOTE_TONE[t.vote]}`}>
                        {t.vote === 'POSITIV' ? '✓' : t.vote === 'NEGATIV' ? '✗' : '~'}
                      </span>
                      <span className="text-slate-300">
                        <span className="font-semibold">{t.name}:</span> <span className="opacity-80">{t.detail}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

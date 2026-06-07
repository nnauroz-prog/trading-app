// Zeigt für einen konkreten Coin, was ALLE drei Firmen über ihn sagen würden —
// nicht nur, wenn sie ihn zufällig als Top-Pick haben. Ehrlicher Cross-Persona-
// Take pro Coin, damit der User auf der Detailseite die volle Bandbreite an
// Meinungen sieht.

import Link from 'next/link';
import type { AgentVerdict, PersonaId } from '@/lib/agents/personas';
import { FirmaSubAgentVotes } from '@/components/firma-sub-agent-votes';

const FIRMA_TONE: Record<PersonaId, string> = {
  conservative: 'border-sky-400/40 bg-sky-950/15',
  balanced:     'border-emerald-400/40 bg-emerald-950/15',
  aggressive:   'border-amber-400/40 bg-amber-950/15'
};

const FIRMA_LABEL: Record<PersonaId, string> = {
  conservative: 'Konservativ',
  balanced:     'Balanciert',
  aggressive:   'Aggressiv'
};

export function PerCoinFirmaTakes({ verdicts, coinSymbol }: { verdicts: AgentVerdict[]; coinSymbol: string }) {
  if (verdicts.length === 0) return null;
  const buyCount = verdicts.filter((v) => v.verdict === 'BUY').length;
  const headline = buyCount === 3
    ? `Einstimmig: Alle 3 Firmen würden ${coinSymbol} jetzt kaufen.`
    : buyCount === 0
    ? `Einstimmig: Keine Firma würde ${coinSymbol} jetzt kaufen.`
    : `${buyCount} von 3 Firmen würden ${coinSymbol} jetzt kaufen — keine Einigkeit.`;

  return (
    <section className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5" aria-label={`Firma-Takes auf ${coinSymbol}`}>
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Was die drei Firmen über {coinSymbol} sagen
        </h2>
        <p className="mt-1 text-[11px] text-slate-500">
          Jede Firma wird gezwungen, gerade {coinSymbol} zu bewerten — egal, ob er ihr Lieblings-Setup ist oder nicht. So siehst du die volle Bandbreite an Meinungen pro Coin.
        </p>
        <p className="mt-1 text-[12px] font-semibold text-slate-200">{headline}</p>
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
        {verdicts.map((v) => {
          const isBuy = v.verdict === 'BUY';
          const tone = isBuy ? 'border-emerald-400/50 bg-emerald-950/30' : FIRMA_TONE[v.persona];
          return (
            <div key={v.persona} className={`space-y-2 rounded-xl border-2 p-3 ${tone}`}>
              <div className="flex items-baseline justify-between gap-1">
                <Link
                  href={`/agent/${v.persona}`}
                  className="text-[11px] font-bold uppercase tracking-wider text-white transition hover:text-emerald-300"
                >
                  {FIRMA_LABEL[v.persona]}
                </Link>
                <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                  isBuy
                    ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-100'
                    : 'border-slate-700 bg-slate-900 text-slate-400'
                }`}>
                  {isBuy ? 'KAUFEN' : 'WARTEN'}
                </span>
              </div>

              {v.safety && (
                <div className="text-[10px] text-slate-400">
                  Note <span className="font-mono font-bold text-slate-200">{v.safety.grade}</span>{' '}
                  · {v.safety.passedHard}/{v.safety.totalHard} Kriterien
                </div>
              )}

              <p className="text-[11px] leading-snug text-slate-300">{v.rationale}</p>

              {v.voteSummary.total > 0 && (
                <div className="flex flex-wrap gap-1 text-[9px] font-semibold uppercase tracking-wider">
                  <span className="rounded border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 text-emerald-200">
                    {v.voteSummary.positiveVotes}+
                  </span>
                  <span className="rounded border border-slate-700 bg-slate-900/60 px-1.5 py-0.5 text-slate-300">
                    {v.voteSummary.neutralVotes}o
                  </span>
                  <span className="rounded border border-rose-500/40 bg-rose-500/10 px-1.5 py-0.5 text-rose-200">
                    {v.voteSummary.negativeVotes}−
                  </span>
                </div>
              )}

              {v.team.length > 0 && (
                <details className="rounded border border-slate-800 bg-slate-950/40">
                  <summary className="cursor-pointer p-1.5 text-[9px] font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-300">
                    ▸ Sub-Agenten zu {coinSymbol}
                  </summary>
                  <div className="p-1.5 pt-0">
                    <FirmaSubAgentVotes team={v.team} />
                  </div>
                </details>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// Zeigt für EINE Firma die Bewertung von mehreren Top-Kandidaten — nicht nur
// den eigenen Lieblings-Pick, sondern auch, was die Firma über die anderen Coins
// sagen würde. So sieht der User die REJECTION-Logik, nicht nur die Auswahl.

import Link from 'next/link';
import type { AgentVerdict } from '@/lib/agents/personas';

export function FirmaCandidateRundown({ verdicts, firmaName }: { verdicts: AgentVerdict[]; firmaName: string }) {
  if (verdicts.length === 0) return null;

  const buyCount = verdicts.filter((v) => v.verdict === 'BUY').length;
  const waitCount = verdicts.length - buyCount;

  return (
    <section className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4" aria-label={`Bewertungen aller Kandidaten durch ${firmaName}`}>
      <header>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          Bewertung aller {verdicts.length} Top-Kandidaten
        </h2>
        <p className="mt-0.5 text-[10.5px] leading-snug text-slate-500">
          So bewertet {firmaName} jeden einzelnen Top-Coin heute — die meisten landen auf „warten“. Genau das ist ehrlich: nur sehr wenige Setups passen wirklich.
        </p>
        <p className="mt-1 text-[11px] font-semibold text-slate-200">
          {buyCount > 0
            ? `${buyCount} würde${buyCount === 1 ? '' : 'n'} ${firmaName} kaufen, ${waitCount} nicht.`
            : `Heute ist keiner der ${verdicts.length} Top-Coins für ${firmaName} ein Kauf.`}
        </p>
      </header>

      <ul className="space-y-1.5">
        {verdicts.map((v) => {
          const isBuy = v.verdict === 'BUY';
          const target = v.target;
          if (!target) return null;
          const tone = isBuy ? 'border-emerald-400/50 bg-emerald-950/30' : 'border-slate-700 bg-slate-950/40';
          return (
            <li key={target.coinId} className={`grid grid-cols-[1fr_auto] items-start gap-2 rounded-lg border p-2.5 ${tone}`}>
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-1.5">
                  <Link
                    href={`/assets/${target.symbol.toLowerCase()}`}
                    className="font-mono text-[12px] font-bold text-white transition hover:text-emerald-300"
                  >
                    {target.symbol}
                  </Link>
                  <span className="text-[10px] text-slate-500">
                    {target.passedCount}/12 Häkchen
                    {v.safety && ` · Note ${v.safety.grade}`}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] leading-snug text-slate-300">{v.rationale}</p>
              </div>
              <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                isBuy
                  ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-100'
                  : 'border-slate-700 bg-slate-900 text-slate-400'
              }`}>
                {isBuy ? 'KAUFEN' : 'WARTEN'}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

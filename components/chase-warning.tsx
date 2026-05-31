import { ChaseSignal, OpportunitySignal } from '@/lib/analysis/chase-detector';

interface Props {
  chase: ChaseSignal[];
  opportunity: OpportunitySignal[];
}

export function ChaseWarning({ chase, opportunity }: Props) {
  if (chase.length === 0 && opportunity.length === 0) return null;
  return (
    <section className="space-y-3">
      {chase.length > 0 && (
        <div className="space-y-2 rounded-2xl border-2 border-amber-400/50 bg-amber-950/20 p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-amber-200">Schon gelaufen — nicht hinterherjagen</h2>
            <span className="rounded border border-amber-400/50 bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-100">
              {chase.length} Coin{chase.length === 1 ? '' : 's'}
            </span>
          </div>
          <p className="text-[11px] text-amber-100/80">
            Bei diesen Coins ist die News bereits eingepreist. Wer jetzt einsteigt, kauft am oberen Ende der Impulswelle.
          </p>
          <ul className="space-y-1.5">
            {chase.map((s) => (
              <li key={s.coin} className="space-y-1 rounded-lg border border-amber-500/30 bg-slate-950/40 p-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-mono text-sm font-bold text-white">{s.coin}</span>
                  <span className={`font-mono text-[11px] font-bold ${s.priceChangePct24h >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {s.priceChangePct24h >= 0 ? '+' : ''}{s.priceChangePct24h.toFixed(1)}% in 24h
                  </span>
                </div>
                <p className="text-[11px] leading-snug text-slate-300">{s.reason}</p>
                {s.topHeadline && (
                  <p className="text-[10px] italic text-slate-500">„{s.topHeadline}“</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {opportunity.length > 0 && (
        <div className="space-y-2 rounded-2xl border-2 border-sky-400/50 bg-sky-950/20 p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-sky-200">Angst war übertrieben — Setup wird besser</h2>
            <span className="rounded border border-sky-400/50 bg-sky-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-sky-100">
              {opportunity.length} Coin{opportunity.length === 1 ? '' : 's'}
            </span>
          </div>
          <p className="text-[11px] text-sky-100/80">
            Diese Coins sind heute schon gefallen, aber die Nachrichtenlage ist nicht eindeutig bärisch. Das ist das klassische „kaufen, wenn andere panisch verkaufen“-Setup — nur einsteigen, wenn auch der Setup-Scout grünes Licht gibt.
          </p>
          <ul className="space-y-1.5">
            {opportunity.map((s) => (
              <li key={s.coin} className="space-y-1 rounded-lg border border-sky-500/30 bg-slate-950/40 p-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-mono text-sm font-bold text-white">{s.coin}</span>
                  <span className="font-mono text-[11px] font-bold text-rose-300">
                    {s.priceChangePct24h.toFixed(1)}% in 24h
                  </span>
                </div>
                <p className="text-[11px] leading-snug text-slate-300">{s.reason}</p>
                {s.topHeadline && (
                  <p className="text-[10px] italic text-slate-500">„{s.topHeadline}“</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

// Zeigt die fairen Modell-Quoten (1/p) für 1/X/2 — rein informativ, kein
// Wettanbieter-Input, kein Profit-Versprechen. Nur Wahrscheinlichkeits-Mathe.

import { fmtOdds } from '@/lib/sport/implied-odds';

interface Props {
  pHome: number;
  pDraw: number;
  pAway: number;
  homeTeam: string;
  awayTeam: string;
}

export function FairOddsLine({ pHome, pDraw, pAway, homeTeam, awayTeam }: Props) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-2.5">
      <div className="text-[9px] uppercase tracking-wider text-slate-500">
        Faire Modell-Quoten (1 / Wahrscheinlichkeit) — nur Mathe, keine Empfehlung
      </div>
      <dl className="mt-1.5 grid grid-cols-3 gap-1.5 text-[10.5px]">
        <Box label={`${homeTeam} gewinnt`} prob={pHome} />
        <Box label="Remis" prob={pDraw} />
        <Box label={`${awayTeam} gewinnt`} prob={pAway} />
      </dl>
    </div>
  );
}

function Box({ label, prob }: { label: string; prob: number }) {
  return (
    <div className="rounded-md border border-slate-700 bg-slate-900/60 p-1.5">
      <dt className="truncate text-slate-400">{label}</dt>
      <dd className="font-mono text-[12px] font-bold text-amber-300">{fmtOdds(prob)}</dd>
      <dd className="font-mono text-[9.5px] text-slate-500">{Math.round(prob * 100)} %</dd>
    </div>
  );
}

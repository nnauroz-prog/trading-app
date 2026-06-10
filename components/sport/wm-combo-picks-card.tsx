// Zeigt 2er- und 3er-Combos der heutigen Sieger-Picks mit konkretem
// erwartetem Wert (Expected Value).
//
// Versteckt sich, wenn weniger als 2 Picks vorliegen.

import { rankWmComboPicks, type ComboPickCandidate } from '@/lib/sport/wm-combo-picks';
import type { WmWinnerPick } from '@/lib/sport/wm-winner-picks';

interface Props {
  picks: WmWinnerPick[];
}

const EV_CLASS: Record<ComboPickCandidate['evLabel'], string> = {
  POSITIV: 'border-emerald-500/40 bg-emerald-950/15 text-emerald-100',
  GRENZWERTIG: 'border-amber-500/40 bg-amber-950/20 text-amber-100',
  NEGATIV: 'border-rose-500/40 bg-rose-950/20 text-rose-100'
};

export function WmComboPicksCard({ picks }: Props) {
  const combos = rankWmComboPicks({ picks, maxSize: 3 });
  if (combos.length === 0) return null;
  const top = combos.slice(0, 5);

  return (
    <section className="space-y-2 rounded-2xl border border-slate-700 bg-slate-900/40 p-3" aria-label="Combo-Picks">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300">Combo-Picks · Top 5 nach Erwartungswert</h3>
        <span className="text-[10px] text-slate-500">2er / 3er · Default-Quote 2.00</span>
      </div>
      <ul className="space-y-1.5">
        {top.map((c, idx) => (
          <li key={idx} className={`rounded-lg border p-2 ${EV_CLASS[c.evLabel]}`}>
            <div className="flex flex-wrap items-baseline gap-2 text-[10.5px]">
              <span className="font-mono text-[9.5px] uppercase tracking-wider opacity-80">{c.evLabel}</span>
              <span className="font-mono font-bold">EV {c.expectedValuePct >= 0 ? '+' : ''}{c.expectedValuePct.toFixed(1)} %</span>
              <span className="font-mono opacity-70">Combo-Quote {c.comboOdds.toFixed(2)}</span>
              <span className="font-mono opacity-70">Joint-Prob {c.jointProbabilityPct} %</span>
            </div>
            <ul className="mt-1 space-y-0.5">
              {c.picks.map((p) => (
                <li key={p.fixture.id} className="text-[10.5px] opacity-90">
                  <span className="font-semibold">{p.winnerTeam}</span> gewinnt gegen {p.winnerSide === 'home' ? p.fixture.awayTeam : p.fixture.homeTeam}
                  <span className="ml-1 opacity-60">({p.modelProbabilityPct} %)</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      <p className="text-[9.5px] leading-snug text-slate-500">
        Joint-Wahrscheinlichkeit = Produkt der Einzel-Probabilities (Annahme statistischer Unabhaengigkeit). Combo-Quote = Produkt der Einzelquoten. EV = jointProb × (Quote−1) − (1−jointProb). POSITIV-EV-Combos haben rechnerisch Edge; das ist kein Versprechen, sondern eine Annahme die nur ueber sehr viele Combos gilt.
      </p>
    </section>
  );
}

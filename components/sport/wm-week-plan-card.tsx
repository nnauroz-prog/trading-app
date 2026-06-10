// 7-Tage-Vorschau: pro Tag eine kompakte Zeile mit Spielanzahl und
// freigegebenen Tipps. Versteckt sich an Tagen ohne WM-Spiele.

import type { WmWeekPlan } from '@/lib/sport/wm-week-plan';

interface Props {
  plan: WmWeekPlan;
}

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', timeZone: 'Europe/Berlin' });
}

export function WmWeekPlanCard({ plan }: Props) {
  const hasAnyFixture = plan.days.some((d) => d.fixturesTotal > 0);
  if (!hasAnyFixture) return null;

  return (
    <section className="space-y-2 rounded-2xl border border-emerald-400/30 bg-emerald-950/10 p-3" aria-label="Naechste 7 Tage WM">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">Naechste 7 Tage WM</h3>
        <span className="text-[10px] text-emerald-200/70">{plan.totalPicks} Tipp{plan.totalPicks === 1 ? '' : 's'} insgesamt</span>
      </div>
      <ul className="space-y-1">
        {plan.days.map((d) => (
          <li key={d.dateIso} className={`rounded border px-2 py-1.5 text-[10.5px] ${d.fixturesTotal === 0 ? 'border-slate-800/60 bg-slate-950/30 text-slate-500' : d.pickCount > 0 ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-100' : 'border-slate-700 bg-slate-900/40 text-slate-300'}`}>
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-mono font-bold uppercase">{d.weekdayLabel}</span>
              <span className="font-mono text-[9.5px] opacity-70">{fmtDate(d.dateIso)}</span>
              {d.fixturesTotal === 0 ? (
                <span className="opacity-70">spielfrei</span>
              ) : (
                <>
                  <span className="opacity-80">{d.fixturesTotal} Spiel{d.fixturesTotal === 1 ? '' : 'e'}</span>
                  {d.pickCount > 0 ? (
                    <span className="rounded border border-emerald-400/50 bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">{d.pickCount} Tipp{d.pickCount === 1 ? '' : 's'}</span>
                  ) : (
                    <span className="opacity-70">kein Tipp</span>
                  )}
                </>
              )}
            </div>
            {d.picks.length > 0 && (
              <ul className="mt-1 space-y-0.5">
                {d.picks.map((p, i) => (
                  <li key={i} className="flex flex-wrap items-baseline gap-1.5 text-[10px] opacity-90">
                    <span className={`rounded border px-1 py-0.5 text-[8.5px] font-bold uppercase ${p.tier === 'hoechste-konfluenz' ? 'border-emerald-300/70 bg-emerald-400/20' : 'border-emerald-400/50 bg-emerald-500/15'}`}>
                      {p.tier === 'hoechste-konfluenz' ? 'H' : 'M'}
                    </span>
                    <span>{p.winnerTeam} gegen {p.opponentTeam}</span>
                    <span className="font-mono opacity-70">{p.modelProbabilityPct} %</span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
      <p className="text-[9.5px] leading-snug text-slate-500">
        Tipps werden taeglich neu gerechnet — die Vorschau ist eine Momentaufnahme. Anstosszeiten siehst Du im Tagesplan.
      </p>
    </section>
  );
}

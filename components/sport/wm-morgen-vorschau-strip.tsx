// Morgen-Vorschau am Ende des Heute-Bereichs. Server-renderbar.
// Zeigt Spielanzahl morgen + freigegebene Tipps in einer Zeile pro
// Pick. Versteckt sich an spielfreien Folgetagen NICHT — "spielfrei"
// ist eine nuetzliche Information fuer die Abendplanung.

import { buildWmMorgenVorschau } from '@/lib/sport/wm-morgen-vorschau';
import type { WmWinnerPick } from '@/lib/sport/wm-winner-picks';

interface Props {
  picks: WmWinnerPick[];
  todayIso: string;
}

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'Europe/Berlin' });
}

export function WmMorgenVorschauStrip({ picks, todayIso }: Props) {
  const v = buildWmMorgenVorschau(picks, todayIso);

  return (
    <div className="space-y-1 rounded-2xl border border-indigo-400/30 bg-indigo-950/10 px-3 py-2 text-indigo-100" aria-label="Morgen-Vorschau">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300">{v.headline}</span>
        <span className="font-mono text-[9.5px] text-indigo-200/60">{fmtDate(v.dateIso)}</span>
      </div>
      {v.picks.length > 0 && (
        <ul className="space-y-0.5">
          {v.picks.map((p, i) => (
            <li key={i} className="flex flex-wrap items-baseline gap-2 text-[11px]">
              <span className="font-mono text-[10px] opacity-70">{p.time ?? '--:--'}</span>
              <span className={`rounded border px-1 py-0.5 text-[8.5px] font-bold uppercase ${p.tier === 'hoechste-konfluenz' ? 'border-emerald-300/70 bg-emerald-400/20 text-emerald-100' : 'border-indigo-300/50 bg-indigo-400/15'}`}>
                {p.tier === 'hoechste-konfluenz' ? 'H' : 'M'}
              </span>
              <span className="font-semibold">{p.winnerTeam}</span>
              <span className="opacity-75">gegen {p.opponentTeam}</span>
              <span className="font-mono text-[10px] opacity-70">{p.modelProbabilityPct} %</span>
            </li>
          ))}
        </ul>
      )}
      {v.picks.length > 0 && (
        <p className="text-[9.5px] leading-snug text-indigo-200/60">
          Tipp: Quoten schon heute Abend vergleichen — morgen frueh nur noch Stake uebernehmen.
        </p>
      )}
    </div>
  );
}

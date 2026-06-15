// Turnierbaum als sekundaere Sektion mit native HTML-Akkordeons
// (<details>). Standardmaessig sind alle Runden geschlossen ausser
// der "wichtigsten" — das ist die naechste, die noch nicht entschieden
// ist (Anteil resolvbar < 100 %).
//
// Server-Component, keine JS-Hydratation noetig.

import { WM_2026_FIXTURES, type WmFixture, type WmPhase } from '@/lib/sport/wm-schedule-2026';
import { utcToBerlin } from '@/lib/sport/wm-utc-to-berlin';

interface Props {
  todayIso: string;
}

const ROUND_ORDER: WmPhase[] = [
  'Gruppe',
  'Achtelfinale',
  'Viertelfinale',
  'Halbfinale',
  'Spiel um Platz 3',
  'Finale'
];

const ROUND_LABEL: Record<WmPhase, string> = {
  Gruppe: 'Gruppenphase',
  Achtelfinale: 'Achtelfinale',
  Viertelfinale: 'Viertelfinale',
  Halbfinale: 'Halbfinale',
  'Spiel um Platz 3': 'Spiel um Platz 3',
  Finale: 'Finale'
};

function isTbd(name: string): boolean {
  return /^(Sieger|Verlierer|Zweiter|Erster|Gruppenerster|Gruppenzweiter)\s/i.test(name.trim());
}

function summaryForRound(phase: WmPhase, fixtures: WmFixture[]): string {
  if (fixtures.length === 0) return 'Keine Spiele in dieser Runde geplant.';
  const total = fixtures.length;
  const tbdCount = fixtures.filter((f) => isTbd(f.homeTeam) || isTbd(f.awayTeam)).length;
  const resolved = total - tbdCount;
  if (phase === 'Gruppe') {
    return `${total} Gruppenspiele · ${resolved} mit feststehenden Paarungen.`;
  }
  if (tbdCount === total) {
    return `${total} Spiele · alle Paarungen warten auf vorherige Ergebnisse.`;
  }
  if (tbdCount === 0) {
    return `${total} Spiele · alle Paarungen bekannt.`;
  }
  return `${total} Spiele · ${resolved} Paarung${resolved === 1 ? '' : 'en'} bereits feststehend.`;
}

function findOpenRound(): WmPhase {
  // Wichtigste Runde = die erste, die noch unresolved-Paarungen hat
  // und nicht die Gruppenphase ist. Sonst Achtelfinale als Default.
  for (const phase of ROUND_ORDER) {
    if (phase === 'Gruppe') continue;
    const fxs = WM_2026_FIXTURES.filter((f) => f.phase === phase);
    if (fxs.length === 0) continue;
    const hasUnresolved = fxs.some((f) => isTbd(f.homeTeam) || isTbd(f.awayTeam));
    if (hasUnresolved) return phase;
  }
  return 'Achtelfinale';
}

export function WmDashboardBracket({ todayIso }: Props) {
  const openRound = findOpenRound();
  void todayIso; // reserviert fuer spaetere "naechste Spiele"-Variante

  return (
    <section
      aria-label="Turnierpfad / Simulation"
      className="rounded-2xl border border-slate-700/60 bg-slate-900/40 p-4 sm:p-5"
    >
      <h3 className="text-[12px] font-bold uppercase tracking-[0.18em] text-slate-200">
        Turnierpfad / Simulation
      </h3>
      <p className="mt-1 text-[10.5px] text-slate-400">
        Sekundäre Sicht. Klicke eine Runde an, um die Spiele zu sehen.
      </p>

      <div className="mt-3 space-y-2">
        {ROUND_ORDER.map((phase) => {
          const fixtures = WM_2026_FIXTURES.filter((f) => f.phase === phase);
          const isOpen = phase === openRound;
          return (
            <details
              key={phase}
              open={isOpen}
              className="rounded-lg border border-slate-700/70 bg-slate-950/50 px-3 py-2 [&[open]>summary>span.chevron]:rotate-90"
            >
              <summary className="flex cursor-pointer items-baseline justify-between gap-2 list-none">
                <span className="flex items-baseline gap-2">
                  <span aria-hidden="true" className="chevron inline-block text-[11px] text-slate-500 transition-transform">›</span>
                  <span className="text-[13px] font-bold text-slate-100">{ROUND_LABEL[phase]}</span>
                  <span className="text-[10px] text-slate-500">{fixtures.length}</span>
                </span>
                <span className="text-[10px] text-slate-400">
                  {summaryForRound(phase, fixtures)}
                </span>
              </summary>

              {fixtures.length === 0 ? (
                <p className="mt-2 text-[10.5px] text-slate-500">Noch keine Spiele in dieser Runde im Spielplan.</p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {fixtures.map((f) => {
                    const berlin = utcToBerlin(f.date, f.time);
                    return (
                      <li
                        key={f.id}
                        className="flex flex-wrap items-baseline gap-2 rounded border border-slate-800 bg-slate-900/40 px-2 py-1 text-[11px]"
                      >
                        <span className="font-mono text-[9.5px] text-slate-500">{berlin.dateIso} · {berlin.time ?? '--:--'}</span>
                        <span className="text-slate-200">{f.homeTeam}</span>
                        <span className="text-slate-500">vs</span>
                        <span className="text-slate-200">{f.awayTeam}</span>
                        {f.group && (
                          <span className="text-[9.5px] text-slate-500">Gr. {f.group}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </details>
          );
        })}
      </div>
    </section>
  );
}

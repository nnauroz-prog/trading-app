// Turnier-Tipp: minimalistisch. Pro Spiel nur der Gewinner.
//
// Anzeige:
//  1. Weltmeister-Tipp ganz oben (gross).
//  2. Gruppen-Sieger als kompakte Liste — pro Gruppe der erstplatzierte
//     plus zweitplatzierte (beide kommen weiter), Rest fliegt raus.
//  3. KO pro Phase: nur die Sieger-Namen.
//
// Keine Punkte, keine Tor-Differenz, keine Datum/Zeit, kein Begruendungs-Text.

import { buildWmTournamentForecast, type KoPrediction } from '@/lib/sport/wm-tournament-forecast';
import type { WmFixture } from '@/lib/sport/wm-schedule-2026';

const PHASE_LABEL: Record<WmFixture['phase'], string> = {
  Gruppe: 'Gruppe',
  Achtelfinale: 'Achtelfinale-Sieger',
  Viertelfinale: 'Viertelfinale-Sieger',
  Halbfinale: 'Halbfinale-Sieger',
  'Spiel um Platz 3': 'Spiel um Platz 3',
  Finale: 'Finale'
};

const PHASE_ORDER: WmFixture['phase'][] = ['Achtelfinale', 'Viertelfinale', 'Halbfinale', 'Spiel um Platz 3', 'Finale'];

export function WmTurnierTippCard() {
  const fc = buildWmTournamentForecast();

  const koByPhase = new Map<WmFixture['phase'], KoPrediction[]>();
  for (const k of fc.ko) {
    if (!koByPhase.has(k.phase)) koByPhase.set(k.phase, []);
    koByPhase.get(k.phase)!.push(k);
  }

  return (
    <section className="space-y-3 rounded-2xl border border-emerald-400/30 bg-emerald-950/15 p-3" aria-label="WM Turnier-Tipp">
      <h2 className="text-[14px] font-bold text-slate-100">WM 2026 — wer gewinnt?</h2>

      {fc.championPick && (
        <div className="rounded border border-emerald-400/60 bg-emerald-500/15 px-3 py-2">
          <div className="text-[9.5px] uppercase tracking-[0.2em] text-emerald-200/80">Weltmeister</div>
          <div className="text-[20px] font-bold text-emerald-100">{fc.championPick}</div>
        </div>
      )}

      {fc.groups.length > 0 && (
        <section aria-label="Gruppen-Sieger">
          <h3 className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Gruppen-Sieger</h3>
          <ul className="space-y-0.5">
            {fc.groups.map((g) => (
              <li key={g.group} className="flex items-baseline gap-2 text-[12px]">
                <span className="w-12 font-mono text-[10px] text-slate-500">Gruppe {g.group}</span>
                <span className="font-bold text-emerald-200">{g.advancing[0]}</span>
                <span className="text-slate-500">·</span>
                <span className="text-sky-200">{g.advancing[1]}</span>
              </li>
            ))}
          </ul>
          {fc.incompleteGroups.length > 0 && (
            <p className="mt-1 text-[9.5px] text-amber-300/70">
              Gruppen {fc.incompleteGroups.join(', ')}: Auslosung noch nicht voll bekannt.
            </p>
          )}
        </section>
      )}

      {PHASE_ORDER.map((phase) => {
        const items = koByPhase.get(phase);
        if (!items || items.length === 0) return null;
        return (
          <section key={phase} aria-label={PHASE_LABEL[phase]}>
            <h3 className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{PHASE_LABEL[phase]}</h3>
            <ul className="space-y-0.5">
              {items.map((k, i) => (
                <li key={k.fixtureId} className="flex items-baseline gap-2 text-[12px]">
                  <span className="w-6 font-mono text-[10px] text-slate-500">{i + 1}.</span>
                  {k.predictedWinner ? (
                    <span className="font-bold text-emerald-200">{k.predictedWinner}</span>
                  ) : (
                    <span className="text-slate-500">Paarung noch offen</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </section>
  );
}

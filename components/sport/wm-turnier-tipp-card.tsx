// Turnier-Tipp: Gruppen-Endstand + kompletter Turnierbaum bis zum
// Weltmeister-Tipp. Server-renderbar.

import { buildWmTournamentForecast, type KoPrediction } from '@/lib/sport/wm-tournament-forecast';
import type { WmFixture } from '@/lib/sport/wm-schedule-2026';

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

const PHASE_LABEL: Record<WmFixture['phase'], string> = {
  Gruppe: 'Gruppe',
  Achtelfinale: 'Achtelfinale',
  Viertelfinale: 'Viertelfinale',
  Halbfinale: 'Halbfinale',
  'Spiel um Platz 3': 'Spiel um Platz 3',
  Finale: 'Finale'
};

export function WmTurnierTippCard() {
  const fc = buildWmTournamentForecast();

  // KO nach Phase gruppieren.
  const koByPhase = new Map<WmFixture['phase'], KoPrediction[]>();
  for (const k of fc.ko) {
    if (!koByPhase.has(k.phase)) koByPhase.set(k.phase, []);
    koByPhase.get(k.phase)!.push(k);
  }
  const phaseOrder: WmFixture['phase'][] = ['Achtelfinale', 'Viertelfinale', 'Halbfinale', 'Spiel um Platz 3', 'Finale'];

  return (
    <section className="space-y-4 rounded-2xl border border-emerald-400/30 bg-emerald-950/15 p-3" aria-label="WM Turnier-Tipp">
      <header className="space-y-1">
        <h2 className="text-[14px] font-bold text-slate-100">WM 2026 — Turnier-Tipp</h2>
        <p className="text-[10.5px] leading-snug text-slate-400">
          Gruppen-Endstand + Turnierbaum bis zum Sieger. Alles berechnet aus dem Modell
          (ELO + Form + Spielort + Hosts). Modell-Tipp, keine Garantie.
        </p>
        {fc.championPick && (
          <div className="mt-2 rounded border border-emerald-400/60 bg-emerald-500/15 px-3 py-2">
            <div className="text-[9.5px] uppercase tracking-[0.2em] text-emerald-200/80">Weltmeister-Tipp</div>
            <div className="text-[18px] font-bold text-emerald-100">{fc.championPick}</div>
            {fc.thirdPlacePick && (
              <div className="text-[10.5px] text-emerald-200/80">Spiel um Platz 3: {fc.thirdPlacePick}</div>
            )}
          </div>
        )}
      </header>

      {/* Gruppen-Endstand */}
      <section aria-label="Gruppen-Endstand" className="space-y-2">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-300">Gruppen-Endstand</h3>
        <ol className="grid gap-2 sm:grid-cols-2">
          {fc.groups.map((g) => (
            <li key={g.group} className="rounded border border-slate-800 bg-slate-950/50 p-2">
              <div className="mb-1 text-[10.5px] font-bold text-emerald-300">Gruppe {g.group}</div>
              <ol className="space-y-0.5">
                {g.table.map((row) => {
                  const tone =
                    row.position === 1 ? 'text-emerald-200' :
                    row.position === 2 ? 'text-sky-200' :
                    'text-slate-400';
                  const advances = row.position <= 2;
                  return (
                    <li key={row.team} className="flex items-baseline gap-2 text-[11px]">
                      <span className={`w-4 text-right font-mono text-[10px] ${tone}`}>{row.position}.</span>
                      <span className={`font-semibold ${tone}`}>{row.team}</span>
                      {advances && <span className="text-[8.5px] uppercase tracking-wider text-emerald-300/70">weiter</span>}
                      <span className="ml-auto font-mono text-[9.5px] text-slate-500">
                        {row.expectedPoints.toFixed(1)} P · {row.expectedGoalDiff >= 0 ? '+' : ''}{row.expectedGoalDiff.toFixed(1)} TD
                      </span>
                    </li>
                  );
                })}
              </ol>
            </li>
          ))}
        </ol>
        {fc.groups.length === 0 && (
          <p className="text-[10.5px] text-slate-500">
            Spielplan enthaelt noch keine vollstaendigen Gruppen (4 Teams pro Gruppe noetig).
          </p>
        )}
      </section>

      {/* Turnierbaum */}
      <section aria-label="Turnierbaum" className="space-y-2">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-300">Turnierbaum</h3>
        {phaseOrder.map((phase) => {
          const items = koByPhase.get(phase);
          if (!items || items.length === 0) return null;
          return (
            <div key={phase} className="rounded border border-slate-800 bg-slate-950/50 p-2">
              <div className="mb-1 text-[10.5px] font-bold uppercase tracking-wider text-emerald-300/80">{PHASE_LABEL[phase]}</div>
              <ul className="space-y-0.5">
                {items.map((k) => {
                  const home = k.homeTeam ?? k.homeLabel;
                  const away = k.awayTeam ?? k.awayLabel;
                  const winner = k.predictedWinner;
                  const resolvable = k.homeTeam !== null && k.awayTeam !== null;
                  return (
                    <li key={k.fixtureId} className="flex flex-wrap items-baseline gap-2 text-[11px]">
                      <span className="font-mono text-[9.5px] text-slate-500">{fmtDate(k.dateIso)} {k.time ?? ''}</span>
                      <span className={resolvable ? 'text-slate-200' : 'text-slate-500'}>
                        <span className={winner === k.homeTeam ? 'font-bold text-emerald-200' : ''}>{home}</span>
                        <span className="mx-1 text-slate-500">vs.</span>
                        <span className={winner === k.awayTeam ? 'font-bold text-emerald-200' : ''}>{away}</span>
                      </span>
                      {winner && (
                        <span className="ml-auto rounded border border-emerald-400/50 bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-100">
                          → {winner}
                        </span>
                      )}
                      {!resolvable && (
                        <span className="ml-auto text-[9.5px] text-slate-500">Paarung baut auf Gruppen-Ende auf</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </section>

      <p className="text-[9.5px] leading-snug text-slate-500">
        Berechnungs-Basis: pro Spiel die 1X2-Verteilung der Modell-Engine, summiert zu erwarteten Punkten
        und Tor-Differenz. KO-Sieger via Verlaengerungs-bereinigter Sieg-Wahrscheinlichkeit. Vergangenheit ist kein Versprechen.
      </p>
    </section>
  );
}

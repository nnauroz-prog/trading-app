// WM-Sieger-Picks — die strengste Auswahl auf /sport.
//
// Zeigt nur 1X2-Sieger-Tipps, die ALLE Pruefungen bestehen:
//   - ELO-Vorteil >= 80, Pick-Klarheit = strong, Confidence >= 60 %
//   - Daten-Confidence >= 85, max 7 Tage entfernt
//   - Profi-Tipper-Agent stimmt zu
//
// Wording: keine verbotenen Begriffe. "Modell-Favorit" statt "Bank",
// "Hoechste Konfluenz" als strengste Stufe, ehrlicher Risiko-Hinweis
// auf jeder Karte.

import type { WmWinnerPick } from '@/lib/sport/wm-winner-picks';
import { WmKickoffBadge } from '@/components/sport/wm-kickoff-badge';

interface Props {
  picks: WmWinnerPick[];
  todayIso: string;
  horizonDays: number;
}

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'Europe/Berlin' });
}

const TIER_LABEL: Record<WmWinnerPick['tier'], string> = {
  'hoechste-konfluenz': 'HOECHSTE KONFLUENZ',
  'modell-favorit': 'MODELL-FAVORIT'
};

const TIER_CLASS: Record<WmWinnerPick['tier'], string> = {
  'hoechste-konfluenz': 'border-emerald-300/70 bg-emerald-400/20 text-emerald-100',
  'modell-favorit': 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200'
};

export function WmWinnerPicksCard({ picks, todayIso, horizonDays }: Props) {
  if (picks.length === 0) {
    return (
      <section className="space-y-2 rounded-2xl border border-slate-700 bg-slate-900/40 p-4" aria-label="WM Sieger-Picks">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">🏆 WM Sieger-Picks · Profi-Filter</h2>
          <span className="text-[10px] text-slate-500">naechste {horizonDays} Tage · {fmtDate(todayIso)}</span>
        </div>
        <h3 className="text-base font-bold text-slate-100">Heute kein Sieger-Pick durchgekommen</h3>
        <p className="text-[11.5px] leading-snug text-slate-300">
          Profi-Tipper-Agent hat alle WM-Spiele der naechsten {horizonDays} Tage geprueft — keiner erfuellt heute alle Pflicht-Kriterien (ELO-Vorteil ≥ 80, Engine-Klarheit &bdquo;strong&ldquo;, Modell-Wahrscheinlichkeit ≥ 60 %, Daten-Confidence ≥ 85, xG-Konfluenz). Lieber heute keinen Tipp als ein erzwungener.
        </p>
      </section>
    );
  }

  const highest = picks.filter((p) => p.tier === 'hoechste-konfluenz');

  return (
    <section className="space-y-3 rounded-2xl border border-emerald-400/40 bg-emerald-950/15 p-4" aria-label="WM Sieger-Picks">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">🏆 WM Sieger-Picks · Profi-Filter</h2>
        <span className="text-[10px] text-emerald-200/70">
          {picks.length} Pick{picks.length === 1 ? '' : 's'} · {highest.length} hoechste Konfluenz
        </span>
      </div>

      <p className="text-[10.5px] leading-snug text-emerald-100/80">
        1X2-Sieger-Tipps, gefiltert durch den Profi-Tipper-Agenten — strengste Schwellen der App: ELO-Vorteil ≥ 80, Engine-Klarheit &bdquo;strong&ldquo;, Modell-Wahrscheinlichkeit ≥ 60 %, xG-Konfluenz, Lineup-Sensitivitaet. Lineup &amp; Verletzungen vor Anstoss pruefen — Modell-Tendenzen, keine Ergebnis-Zusage.
      </p>

      <ul className="space-y-2">
        {picks.map((p) => (
          <li key={p.fixture.id} className="rounded-lg border border-slate-800 bg-slate-950/40 p-2.5">
            <header className="flex flex-wrap items-baseline gap-2">
              <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${TIER_CLASS[p.tier]}`}>{TIER_LABEL[p.tier]}</span>
              <span className="font-mono text-[10px] text-slate-500">{p.modelProbabilityPct} %</span>
              <span className="font-mono text-[10px] text-slate-500">ELO Δ {p.eloDiff >= 0 ? '+' : ''}{p.eloDiff}</span>
              <WmKickoffBadge dateIso={p.fixture.date} time={p.fixture.time} />
              <span className="ml-auto text-[10px] text-slate-500">{fmtDate(p.fixture.date)}{p.fixture.time ? ` · ${p.fixture.time}` : ''}</span>
            </header>

            <div className="mt-2 text-[13px] text-slate-100">
              <span className="font-semibold">{p.fixture.homeTeam}</span>
              <span className="mx-2 text-slate-500">vs.</span>
              <span className="font-semibold">{p.fixture.awayTeam}</span>
            </div>

            <div className="mt-1 text-[12px] font-semibold text-emerald-200">
              → <span className="uppercase tracking-wider">{p.winnerTeam}</span> gewinnt
            </div>

            <div className="mt-1 text-[10px] text-slate-500">
              {p.fixture.phase}{p.fixture.group ? ` ${p.fixture.group}` : ''} · {p.fixture.venue}
            </div>

            <ul className="mt-2 list-disc space-y-0.5 pl-4 text-[11px] text-slate-300">
              {p.reasons.slice(0, 3).map((r, i) => <li key={i}>{r}</li>)}
            </ul>

            {p.conditions.factors.length > 0 && (
              <details className="mt-2 rounded border border-slate-800 bg-slate-950/40 p-2">
                <summary className="cursor-pointer text-[10.5px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200">
                  ▸ Umfeld-Faktoren ({p.conditions.factors.length}) · ELO-Shift {p.conditions.homeEloDeltaTotal - p.conditions.awayEloDeltaTotal >= 0 ? '+' : ''}{Math.round(p.conditions.homeEloDeltaTotal - p.conditions.awayEloDeltaTotal)} · Daten {Math.round(p.conditions.dataCoverage * 100)} %
                </summary>
                <ul className="mt-1.5 space-y-1 text-[10.5px] leading-snug text-slate-300">
                  {p.conditions.factors.map((c) => (
                    <li key={c.id} className="rounded border border-slate-800/60 bg-slate-950/30 p-1.5">
                      <span className="font-mono text-[9.5px] uppercase tracking-wider text-slate-500">{c.id}</span>
                      <p className="mt-0.5">{c.label}</p>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[9.5px] text-slate-500">
                        <span>Heim ×{c.homeGoalMultiplier.toFixed(2)}</span>
                        <span>Auswaerts ×{c.awayGoalMultiplier.toFixed(2)}</span>
                        <span>ELO Δ {c.homeEloDelta >= 0 ? '+' : ''}{Math.round(c.homeEloDelta)} / {c.awayEloDelta >= 0 ? '+' : ''}{Math.round(c.awayEloDelta)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </details>
            )}

            {p.riskNotes.length > 0 && (
              <div className="mt-2 rounded border border-amber-500/30 bg-amber-950/15 p-1.5 text-[10.5px] leading-snug text-amber-100">
                ⚠ {p.riskNotes[0]}
                {p.riskNotes.length > 1 && (
                  <span className="block text-amber-200/70">+ {p.riskNotes.length - 1} weitere Hinweise.</span>
                )}
              </div>
            )}

            <p className="mt-1.5 text-[9.5px] text-slate-500">
              Profi-Tipper-Conviction: {Math.round(p.proTipper.conviction * 100)} % · Status {p.proTipper.status} · Conditions-Confidence {p.conditions.confidenceShiftTotal >= 0 ? '+' : ''}{Math.round(p.conditions.confidenceShiftTotal)}
            </p>
          </li>
        ))}
      </ul>

      <p className="text-[9.5px] leading-snug text-emerald-100/55">
        Datenbasis: ELO + Form + xG + Spielort + Profi-Tipper-Pruefung. Vergangenheit ≠ Zukunft, keine Garantie auf Sieg.
      </p>
    </section>
  );
}

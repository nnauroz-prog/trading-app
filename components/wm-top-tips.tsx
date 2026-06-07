// Top-Empfehlungen für die WM — sortiert nach Profi-Tipp-Klarheit. Zeigt
// die N klarsten Spiele mit Kompakt-Box. Für tiefere Analyse je Spiel
// gibt es WmDayPicker / WmNextMatches mit voller Karte.

import { rankWmTips } from '@/lib/sport/wm-tip-ranking';

interface Props {
  todayIso: string;
  openingIso?: string;
  limit?: number;
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime()) / (24 * 60 * 60 * 1000));
}

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'Europe/Berlin' });
}

const CLARITY_CHIP: Record<string, string> = {
  strong: 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100',
  leaning: 'border-sky-400/40 bg-sky-500/10 text-sky-100',
  open: 'border-amber-500/40 bg-amber-500/10 text-amber-100'
};

export function WmTopTips({ todayIso, openingIso = '2026-06-11', limit = 5 }: Props) {
  const days = daysBetween(todayIso, openingIso);
  if (days > 30 || days < -50) return null;

  const ranked = rankWmTips(todayIso, 14).slice(0, limit);
  if (ranked.length === 0) return null;

  // Aufteilung: klare + leaning vs. offene Spiele
  const clear = ranked.filter((r) => r.prediction.pick.clarity !== 'open');
  const open = ranked.filter((r) => r.prediction.pick.clarity === 'open');

  return (
    <section className="space-y-3 rounded-2xl border border-emerald-400/40 bg-emerald-950/15 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">🎯 WM-Top-Tipps (nächste 14 Tage)</h2>
        <span className="text-[10px] text-emerald-200/60">{ranked.length} Spiele</span>
      </div>
      <p className="text-[10.5px] leading-snug text-emerald-100/80">
        Sortiert nach Profi-Engine-Klarheit (ELO + Form + xG + Spielort + Datenbasis-Sicherheit). Klare Tipps oben, offene Spiele am Ende.
      </p>

      {clear.length > 0 && (
        <ul className="space-y-1.5">
          {clear.map((r, i) => {
            const { fixture: f, prediction: p } = r;
            return (
              <li key={f.id} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2 rounded-md border border-slate-800 bg-slate-950/60 px-2.5 py-1.5 text-[11px]">
                <span className="font-mono text-[10px] text-emerald-300">#{i + 1}</span>
                <span className="min-w-0">
                  <span className="block truncate text-slate-100">
                    <span className="font-semibold">{f.homeTeam}</span>
                    <span className="mx-1 text-slate-500">–</span>
                    <span className="font-semibold">{f.awayTeam}</span>
                  </span>
                  <span className="block truncate text-[9.5px] text-slate-500">
                    {fmtDate(f.date)}{f.time && ` · ${f.time}`} · {f.phase}{f.group ? ` ${f.group}` : ''}
                  </span>
                  <span className="block truncate text-[10px] text-emerald-300">
                    → {p.pick.winnerName} ({p.pick.confidencePct} %)
                  </span>
                </span>
                <span className={`rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold ${CLARITY_CHIP[p.pick.clarity]}`}>
                  {p.pick.confidencePct}%
                </span>
                <span className="text-[9.5px] text-slate-500">ELO Δ {p.eloDiff >= 0 ? '+' : ''}{p.eloDiff}</span>
              </li>
            );
          })}
        </ul>
      )}

      {open.length > 0 && (
        <details>
          <summary className="cursor-pointer text-[10.5px] uppercase tracking-wider text-slate-500 hover:text-slate-300">
            ▸ Offene Spiele anzeigen ({open.length})
          </summary>
          <ul className="mt-2 space-y-1">
            {open.map((r) => {
              const f = r.fixture;
              return (
                <li key={f.id} className="grid grid-cols-[1fr_auto] gap-2 rounded-md border border-amber-500/20 bg-amber-950/10 px-2.5 py-1.5 text-[10.5px]">
                  <span className="min-w-0 truncate text-slate-300">
                    {f.homeTeam} – {f.awayTeam}
                    <span className="ml-1 text-amber-300/70">· {fmtDate(f.date)}</span>
                  </span>
                  <span className="text-[10px] text-amber-200/80">offen — nicht tippen</span>
                </li>
              );
            })}
          </ul>
        </details>
      )}

      <p className="text-[9.5px] leading-snug text-emerald-100/55">
        Datenbasis 06/2026, ELO-Stand + xG-Modell. Profi-Engine, keine Garantie — Trefferquote über das ganze Turnier ist das, was zählt.
      </p>
    </section>
  );
}

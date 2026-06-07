// WM-Sieger-Outright-Karte: Wer wird Weltmeister?
//
// Nutzt computeOutright() aus lib/sport/wm-outright.ts mit:
// - ELO-Rating der Teilnehmer (Argentinien 2155, Frankreich 2120, …)
// - Form-Index (Spanien +5, Argentinien +4, Frankreich +3)
// - Host-Bonus für USA/Mexiko/Kanada
// - Gruppen-Überlebens-Quote nach ELO-Rang
// - 6 KO-Runden mit Median-ELO der Gegner-Kohorte
//
// Zeigt Top-10 Anwärter mit den Wahrscheinlichkeiten für Champion,
// Finale, Halbfinale, Viertelfinale.

import { computeOutright, type OutrightTeam } from '@/lib/sport/wm-outright';

interface Props {
  todayIso: string;
  openingIso?: string;
  limit?: number;
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime()) / (24 * 60 * 60 * 1000));
}

function fmtPct(value: number): string {
  if (value >= 0.1) return `${(value * 100).toFixed(1)} %`;
  if (value >= 0.01) return `${(value * 100).toFixed(2)} %`;
  if (value >= 0.001) return `${(value * 100).toFixed(2)} %`;
  return '< 0,1 %';
}

export function WmOutrightCard({ todayIso, openingIso = '2026-06-11', limit = 10 }: Props) {
  const daysToOpen = daysBetween(todayIso, openingIso);
  // Aktiv im Fenster -50 (Turnier-Ende +14 Tage) bis +60 vor Eröffnung.
  if (daysToOpen > 60 || daysToOpen < -50) return null;

  const outright = computeOutright();
  const top: OutrightTeam[] = outright.slice(0, limit);
  if (top.length === 0) return null;

  return (
    <section className="space-y-3 rounded-2xl border border-emerald-400/40 bg-emerald-950/15 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">🏆 Wer wird Weltmeister?</h2>
        <span className="text-[10px] text-emerald-200/60">Top {limit} · 48 Teilnehmer</span>
      </div>
      <p className="text-[10.5px] leading-snug text-emerald-100/80">
        Profi-Engine-Schätzung aus ELO-Stand + Form-Index + Gruppen-Überlebens-Quote + 6 KO-Runden gegen den Median-ELO
        der erwarteten Gegner. Keine Wett-Empfehlung — Vergangenheit ≠ Zukunft.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-[9.5px] uppercase tracking-wider text-emerald-200/60">
              <th className="py-1.5 text-left font-semibold">#</th>
              <th className="py-1.5 text-left font-semibold">Team</th>
              <th className="py-1.5 text-right font-semibold">ELO</th>
              <th className="py-1.5 text-right font-semibold">1/8</th>
              <th className="py-1.5 text-right font-semibold">1/4</th>
              <th className="py-1.5 text-right font-semibold">HF</th>
              <th className="py-1.5 text-right font-semibold">Finale</th>
              <th className="py-1.5 text-right font-semibold text-emerald-200">Champion</th>
            </tr>
          </thead>
          <tbody>
            {top.map((t, i) => (
              <tr key={t.team.name} className="border-t border-emerald-400/10">
                <td className="py-1.5 font-mono text-[10px] text-emerald-300">#{i + 1}</td>
                <td className="py-1.5 font-semibold text-slate-100">
                  {t.team.name}
                  {t.team.isHost && <span className="ml-1 text-[9px] text-amber-300" title="Gastgeber-Nation">🏠</span>}
                </td>
                <td className="py-1.5 text-right font-mono text-[10px] text-slate-400">{t.team.elo}</td>
                <td className="py-1.5 text-right font-mono text-slate-300">{fmtPct(t.round16)}</td>
                <td className="py-1.5 text-right font-mono text-slate-300">{fmtPct(t.quarter)}</td>
                <td className="py-1.5 text-right font-mono text-slate-300">{fmtPct(t.semi)}</td>
                <td className="py-1.5 text-right font-mono text-slate-200">{fmtPct(t.final)}</td>
                <td className="py-1.5 text-right font-mono font-bold text-emerald-200">{fmtPct(t.champion)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[9.5px] leading-snug text-emerald-100/55">
        Lesart: Argentinien {fmtPct(top[0].champion)} Champion ≈ in {Math.round(1 / Math.max(0.001, top[0].champion))} simulierten Turnieren würde Argentinien einmal Weltmeister. Tatsächliches Turnier ist ein einzelner Lauf — Streuung ist real.
      </p>
    </section>
  );
}

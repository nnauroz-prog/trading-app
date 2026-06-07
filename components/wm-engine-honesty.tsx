// Ehrliche Selbstauskunft der Profi-Engine. Erklärt, was die Engine kann
// und was nicht — keine Backtest-Zahlen, weil wir keine historischen
// WM-Spiele live nachrechnen können. Stattdessen klare Grenzen.

import Link from 'next/link';

interface Props {
  todayIso: string;
  openingIso?: string;
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime()) / (24 * 60 * 60 * 1000));
}

export function WmEngineHonesty({ todayIso, openingIso = '2026-06-11' }: Props) {
  const days = daysBetween(todayIso, openingIso);
  if (days > 30 || days < -50) return null;

  return (
    <details className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
      <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-slate-300 hover:text-slate-100">
        ▸ Was die Profi-Engine kann — und was nicht
      </summary>
      <div className="mt-3 space-y-3 text-[11px] leading-snug text-slate-300">
        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">Was die Engine kann</div>
          <ul className="space-y-0.5 text-slate-400">
            <li>· ELO-Stand für 41 wahrscheinliche WM-Teams (Stand 06/2026)</li>
            <li>· Form-Index ±5 pro Team aus aktueller Länderspiel-Reihe</li>
            <li>· xG-Modell (erwartete Tore) aus Offense × Defense</li>
            <li>· Poisson-Verteilung → Über/Unter 1,5–3,5, BTTS, Clean-Sheet, Top-3-Endergebnisse</li>
            <li>· Spielort-Faktoren: Höhenlage Mexico City, Hitze-Hotspots im US-Süden, Host-Bonus</li>
            <li>· Verlängerungs-Wahrscheinlichkeit für KO-Spiele</li>
          </ul>
        </div>

        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-amber-300">Was die Engine NICHT kann</div>
          <ul className="space-y-0.5 text-slate-400">
            <li>· Spielerstärke individuell — Verletzungen / Sperren / Aufstellungen werden nicht modelliert</li>
            <li>· Wetter live (Regen, Wind) am Spieltag</li>
            <li>· Schiedsrichter-Tendenzen</li>
            <li>· Mannschafts-Bilanzen seit der letzten WM gegen Spezifika eines Gegners (limitiert auf ELO)</li>
            <li>· Real-time-Updates nach Mannschafts-Bekanntgabe</li>
          </ul>
        </div>

        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-sky-300">Ehrliche Trefferquoten-Erwartung</div>
          <p className="text-slate-400">
            Eine gute Profi-Engine schafft bei 1X2-Tipps zwischen 50–58 % Trefferquote, bei stabilen Tor-Märkten (Über 1,5,
            BTTS) 60–70 %. Alles darüber wäre verdächtig. Die App garantiert keine Treffer — sie filtert nur konsequent
            das Unwahrscheinliche raus und macht die Begründung sichtbar.
          </p>
        </div>

        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Tipprunde-Strategie</div>
          <p className="text-slate-400">
            Klare Tipps (≥ 58 % Confidence) abgeben, offene Spiele auslassen, Wochenziel im Tipprunde-Bereich tracken.{' '}
            <Link href="/sport#tipprunde" className="text-emerald-300 hover:text-emerald-200">→ Tipprunde-Karte</Link>
          </p>
        </div>
      </div>
    </details>
  );
}

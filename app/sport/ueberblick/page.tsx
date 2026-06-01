import Link from 'next/link';
import { SPORT_FIRMA_SIZE, countByDepartment } from '@/lib/sport/firma/roster';
import { FOOTBALL_LEAGUES } from '@/lib/sport/leagues';

export const dynamic = 'force-static';

export default function SportOverviewPage() {
  const counts = countByDepartment();
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <Link href="/sport" className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-emerald-300">
        ← zurück zum Sport-Reiter
      </Link>
      <header className="space-y-1">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400">Überblick</div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Sport · Was kannst du hier?</h1>
        <p className="text-sm text-slate-400">
          Alle Funktionen und Seiten des Sport-Reiters auf einen Blick. So findest du dich schneller zurecht.
        </p>
      </header>

      <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Sport-Redaktion · {SPORT_FIRMA_SIZE} Mitarbeiter</h2>
        <ul className="space-y-1 text-[11.5px] text-slate-200">
          <li><Link href="/sport/firma" className="text-emerald-300 hover:underline">Personalakte</Link> · alle Mitarbeiter, gruppiert nach Abteilung</li>
          <li><span className="text-slate-400">{counts.chef} Chefs · {counts.league_scout} Liga-Scouts · {counts.team_analyst} Mannschafts-Analysten · {counts.form_analyst} Form-Analysten · {counts.tactical_analyst} Taktik · {counts.international_watch} International · {counts.transfer_watch} Transfer-Markt · {counts.politik_watch} Politik · {counts.schedule_gatekeeper + counts.safety_picker + counts.h2h_specialist + counts.daily_pick_curator} Wächter/Spezialisten</span></li>
        </ul>
      </section>

      <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Auswertungen</h2>
        <ul className="space-y-1 text-[11.5px] text-slate-200">
          <li><span className="font-semibold">Sehr sichere Tipps:</span> nur Begegnungen ≥ 65 % Konfidenz, kuratiert von Roland Vogt.</li>
          <li><span className="font-semibold">Tipp des Tages:</span> immer der beste verfügbare Tipp, kuratiert von Margit Wiesinger.</li>
          <li><span className="font-semibold">Top-Tipp pro Liga:</span> aus jeder aktiven Liga das stärkste Setup.</li>
          <li><span className="font-semibold">Liga-Heatmap:</span> in welcher Liga gibt es jetzt die meisten klaren Tipps.</li>
          <li><span className="font-semibold">Kombi-Tipp der Woche:</span> bis zu 5 sichere Picks zu einem Schein.</li>
          <li><span className="font-semibold">Highlights der Woche:</span> pro Spieltag das stärkste Spiel.</li>
          <li><span className="font-semibold">H2H:</span> Direktvergleichs-Bilanz für jedes Spiel von Sigrid Achterberg.</li>
          <li><span className="font-semibold">BTTS & Über/Unter 2.5:</span> Zusatz-Märkte aus dem Poisson-Modell.</li>
        </ul>
      </section>

      <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Persönlich</h2>
        <ul className="space-y-1 text-[11.5px] text-slate-200">
          <li><span className="font-semibold">Meine Teams:</span> Vereinen folgen, Notizen festhalten, Form mit Sparkline sehen.</li>
          <li><span className="font-semibold">Mannschaft suchen:</span> Volltext über alle Teams der eingebundenen Ligen.</li>
          <li><span className="font-semibold">Tipp-Tagebuch:</span> jeden Tipp speichern, automatische Auflösung wenn die Spiele beendet sind.</li>
          <li><span className="font-semibold">Track-Record:</span> Trefferquote der Firma, Liga-Bilanz, Hit-Streak — wächst über Zeit.</li>
        </ul>
      </section>

      <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Eingebundene Ligen ({FOOTBALL_LEAGUES.length})</h2>
        <ul className="grid grid-cols-2 gap-1 text-[11px] text-slate-200">
          {FOOTBALL_LEAGUES.map((l) => (
            <li key={l.id} className="rounded border border-slate-800 bg-slate-950/40 px-2 py-1">
              <span className="font-semibold">{l.name}</span>{' '}
              <span className="text-slate-500">· {l.country}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

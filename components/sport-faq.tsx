// Kurz-FAQ am unteren Ende des Sport-Reiters. Beantwortet die Fragen, die
// User typischerweise haben — bevor sie genervt aufgeben.

const FAQ: Array<{ q: string; a: string }> = [
  {
    q: 'Wieso sind so viele Ligen leer?',
    a: 'Anfang Juni sind die Top-Liga-Saisons in Sommerpause. TheSportsDB pflegt Sommer-aktive Ligen (MLS, Brasileirão, J1) leider lückenhaft. Saisonstart Premier League: 14. August, Bundesliga: 21. August.'
  },
  {
    q: 'Was bedeutet der Quality-Score 0–100?',
    a: 'Er kombiniert Modell-Wahrscheinlichkeit (0–45), Confidence des Pick-Labels (0–20), Datenqualität (0–20), Marktart-Risiko (0–10) und Aktualität (0–5). Hartdeckel: schwache Datenlage → max 60, instabiler Markt → max 70, beendetes Spiel → 0.'
  },
  {
    q: 'Wo bleiben meine Tipps?',
    a: 'Alles lokal im Browser (localStorage), kein Server. Wenn du den Browser-Cache leerst, sind die Tipps weg — deshalb gibt es JSON/CSV-Export im Tagebuch-Footer.'
  },
  {
    q: 'Warum wertet die App meinen Tipp nicht aus?',
    a: 'Auswertung läuft automatisch, sobald das Endergebnis aus TheSportsDB durchkommt — das kann je nach Liga 30 Min bis 24 h dauern. Du musst nichts machen.'
  },
  {
    q: 'Welche Daten verlassen meinen Browser?',
    a: 'Nur die Anfragen an TheSportsDB für die öffentlichen Spielplan- und Ergebnis-Daten. Deine Tipps, Tipprunde-Profile und Friends-Statistik bleiben strikt lokal.'
  }
];

export function SportFaq() {
  return (
    <details className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
      <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200">
        ▸ Häufige Fragen
      </summary>
      <ul className="mt-3 space-y-2">
        {FAQ.map((item) => (
          <li key={item.q}>
            <details className="rounded-md border border-slate-800 bg-slate-950/40 p-2">
              <summary className="cursor-pointer text-[11px] font-semibold text-slate-200 hover:text-emerald-300">
                {item.q}
              </summary>
              <p className="mt-1.5 text-[10.5px] leading-snug text-slate-400">
                {item.a}
              </p>
            </details>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[10px] leading-snug text-slate-500">
        Frage fehlt? Bestehende Architektur, kein Backend — dafür Disziplin und Sichtbarkeit.
      </p>
    </details>
  );
}

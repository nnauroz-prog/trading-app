// "So nutzt Du das WM-System" — einfache Erklaerung des taeglichen
// Workflows ohne Technik-Sprache. Aufklappbar, server-renderbar.
//
// Wording ohne verbotene Begriffe.

export function WmSystemGuide() {
  return (
    <details className="rounded-2xl border border-slate-800/80 bg-slate-900/30">
      <summary className="cursor-pointer p-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200">
        ▸ So nutzt Du das WM-System (taeglicher Ablauf)
      </summary>
      <div className="space-y-3 p-3 pt-0 text-[12px] leading-relaxed text-slate-300">

        <ol className="space-y-2.5 pl-1">
          <li className="flex gap-2">
            <span className="font-mono font-bold text-emerald-300">1.</span>
            <span>
              <span className="font-semibold text-slate-100">Morgens oeffnen → &bdquo;Heute bei der WM&ldquo; lesen.</span>{' '}
              Da steht jedes heutige Spiel mit Anstosszeit (deutsche Zeit) und ob es einen Pick gibt. Wenn ein Spiel geblockt ist, steht der Grund direkt daneben — z. B. &bdquo;Paarung nicht verifiziert&ldquo;. Kein Pick ist auch eine Entscheidung.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="font-mono font-bold text-emerald-300">2.</span>
            <span>
              <span className="font-semibold text-slate-100">Picks pruefen.</span>{' '}
              &bdquo;HOECHSTE KONFLUENZ&ldquo; ist die strengste Stufe (ELO-Vorteil ≥ 120, alle Profi-Checks bestanden), &bdquo;MODELL-FAVORIT&ldquo; die Standard-Stufe. Unter jedem Pick stehen die Gruende und die Umfeld-Faktoren (Hitze, Hoehe, Jetlag, Reise, Publikum). Wichtig: kurz vor Anstoss selbst die Aufstellung pruefen — die kennt das System nicht.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="font-mono font-bold text-emerald-300">3.</span>
            <span>
              <span className="font-semibold text-slate-100">Quote eintragen, Stake uebernehmen.</span>{' '}
              In der Bankroll-Karte einmal Deine Bankroll setzen (z. B. 500 EUR). Dann pro Pick die echte Quote Deines Anbieters eintragen — die Empfehlung (Half-Kelly, max 4 %/2 % pro Pick) passt sich live an. &bdquo;Stake uebernehmen&ldquo; schreibt den Einsatz ins Ledger.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="font-mono font-bold text-emerald-300">4.</span>
            <span>
              <span className="font-semibold text-slate-100">Nach den Spielen: Ergebnisse kommen rein.</span>{' '}
              Meist automatisch aus der Daten-Quelle. Falls nicht, kannst Du den Endstand in der &bdquo;Ergebnisse nachpflegen&ldquo;-Karte in 5 Sekunden selbst eintragen.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="font-mono font-bold text-emerald-300">5.</span>
            <span>
              <span className="font-semibold text-slate-100">Das System lernt von selbst.</span>{' '}
              Mit jedem Ergebnis: die Team-Staerken (ELO) ziehen nach, die Umfeld-Faktoren werden verstaerkt oder gedaempft je nachdem ob sie wirklich Treffer bringen, und die Eigenkalibrierung prueft ob die Prozent-Angaben halten. Dein Ledger zeigt Netto-P&amp;L und ROI uebers ganze Turnier.
            </span>
          </li>
        </ol>

        <div className="rounded border border-amber-500/30 bg-amber-950/15 p-2.5 text-[11px] leading-snug text-amber-100">
          <span className="font-semibold">Die drei Ehrlichkeits-Regeln:</span>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            <li>Kein Spiel erfuellt die Kriterien → kein Pick. Das System erzwingt nichts.</li>
            <li>Im Backtest auf 78 echten Spielen lag die Trefferquote der freigegebenen Picks bei ~80 % — mit klaren Ausreissern bei Turnier-Upsets. Vergangenheit ist kein Versprechen.</li>
            <li>Nur Geld einsetzen, dessen Verlust Dich nicht schmerzt. Die Tier-Caps (max 4 % pro Pick) sind genau dafuer da.</li>
          </ul>
        </div>
      </div>
    </details>
  );
}

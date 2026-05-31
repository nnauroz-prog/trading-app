// Permanent honesty card. Lists what this app cannot do, so a user never
// confuses "die App zeigt was an" mit "die App weiß, was passieren wird".
export function EhrlicheGrenzen() {
  return (
    <details className="rounded-2xl border border-slate-700/60 bg-slate-950/40 p-3">
      <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200">
        Was die App nicht kann (ehrlich)
      </summary>
      <ul className="mt-3 space-y-2 text-[12px] leading-relaxed text-slate-300">
        <li>
          <span className="font-bold text-slate-100">Nicht in die Zukunft schauen.</span>{' '}
          Alle Aussagen sind aus historischen Daten abgeleitet. „Setup hat 75% Trefferquote gehabt“
          heißt <em>nicht</em>, dass der nächste Trade zu 75% gewinnt — nur dass vergleichbare
          Setups in der Vergangenheit so liefen.
        </li>
        <li>
          <span className="font-bold text-slate-100">Keine Black-Swan-Events vorhersehen.</span>{' '}
          Hacks, Regulierungs-Schocks, Liquidationswellen, Stablecoin-De-pegs — passieren ohne
          Vorwarnung und brechen jeden Backtest.
        </li>
        <li>
          <span className="font-bold text-slate-100">Nichts ausführen.</span>{' '}
          Die App kauft, verkauft und handelt nichts. Du musst jede Entscheidung selber treffen
          und am eigenen Broker eingeben.
        </li>
        <li>
          <span className="font-bold text-slate-100">Keine Hebel-, Futures- oder Options-Trades.</span>{' '}
          Alles ist auf Spot-Krypto ausgelegt. Wer Optionen oder Perpetuals tradet, braucht andere
          Werkzeuge — diese App hat dafür weder Daten noch Risiko-Logik.
        </li>
        <li>
          <span className="font-bold text-slate-100">Keine Steuer- oder Rechtsberatung.</span>{' '}
          Krypto-Steuer-Recht ist je nach Land unterschiedlich. Frag einen Steuerberater, bevor
          du auf größere Gewinne setzt — die App kennt deine persönliche Lage nicht.
        </li>
        <li>
          <span className="font-bold text-slate-100">Keinen Ersatz für Risiko-Management.</span>{' '}
          Position-Größe, Maximalverlust pro Tag, Diversifikation — bleiben deine Verantwortung.
          Die App gibt Ideen, kein Geld-Management.
        </li>
        <li>
          <span className="font-bold text-slate-100">Daten können falsch sein.</span>{' '}
          Binance/Bybit-Feeds können Lücken haben, Bots können falsche Trades melden, RSS-Feeds
          können Fake-News durchlassen. Bei wichtigen Entscheidungen: zweite Quelle prüfen.
        </li>
      </ul>
      <p className="mt-3 rounded-md border border-amber-500/20 bg-amber-950/10 p-2 text-[11px] text-amber-200/80">
        <span className="font-bold">Faustregel:</span> Wenn dir die App ein Setup zeigt, das du
        nicht in einem Satz erklären kannst — handle es nicht.
      </p>
    </details>
  );
}

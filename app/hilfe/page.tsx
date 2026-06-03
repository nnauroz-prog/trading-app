import Link from 'next/link';

export const dynamic = 'force-static';

export default function HilfePage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-emerald-300">
        ← zurück zum Trading Desk
      </Link>
      <header className="space-y-1">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400">Hilfe</div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Wie funktioniert diese App?</h1>
        <p className="text-sm text-slate-400">
          Eine ehrliche Erklärung der wichtigsten Begriffe und Filter — ohne Werbe-Sprache.
        </p>
      </header>

      <section className="space-y-2 rounded-2xl border border-yellow-300/40 bg-yellow-950/15 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-yellow-300">⚜ Tier 90</h2>
        <p className="text-[12px] leading-relaxed text-slate-200">
          Höchste Sicherheitsstufe der App. Ein Pick erscheint hier nur wenn alle fünf Analyse-Säulen
          (bei Trading) oder mindestens 10 von 11 Signalen (bei Sport) gleichzeitig grünes Licht geben.
          Empirisch liegt die Treffer-Quote solcher Multi-Signal-Konsens-Picks bei rund 88–92 % über
          viele Trades — auf das einzelne Spiel bleibt aber Restrisiko. Lieber zwei Wochen warten als
          einen Fehler-Pick.
        </p>
      </section>

      <section className="space-y-2 rounded-2xl border border-emerald-400/40 bg-emerald-950/15 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Sehr sichere Tipps (Sport)</h2>
        <p className="text-[12px] leading-relaxed text-slate-200">
          Begegnungen mit ≥ 65 % Poisson-Konfidenz. Kuratiert von Roland Vogt (siehe Sport-Redaktion).
          Reicht für Tippspiele unter Freunden — bei Wetten würde ich auf Tier 90 hochschalten.
        </p>
      </section>

      <section className="space-y-2 rounded-2xl border border-sky-400/40 bg-sky-950/15 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-sky-300">Die drei Firmen (Trading)</h2>
        <p className="text-[12px] leading-relaxed text-slate-200">
          Konservativ, Balanciert, Aggressiv — drei Persönlichkeiten mit unterschiedlicher Risiko-
          Toleranz. Jede hat ein Team aus sieben Sub-Agenten (Analyst, Scout, Risiko-Manager,
          News-Watcher, Position-Manager, Liquiditäts-Spezialist, Backtest-Auditor). Die Stimmen
          werden mit historischer Trefferquote gewichtet — gute Sub-Agenten zählen mehr.
        </p>
      </section>

      <section className="space-y-2 rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Was die App NICHT kann</h2>
        <ul className="space-y-1 text-[12px] leading-relaxed text-slate-200">
          <li>• <span className="font-semibold">Garantierte Gewinne.</span> Auch ein 90-%-Pick geht in 1 von 10 Fällen schief — und der eine kann der nächste sein.</li>
          <li>• <span className="font-semibold">Verletzungen / Aufstellungen / Tagesform.</span> Das Modell sieht Form aus den letzten Spielen, nicht ob der Star-Stürmer heute krank ist.</li>
          <li>• <span className="font-semibold">Live-Spiel-Anpassungen.</span> Empfehlungen sind vor Anstoß. Sobald ein Tor fällt, ist die Vorhersage Geschichte.</li>
          <li>• <span className="font-semibold">Aktien-Empfehlungen.</span> Aktien-Daten sind nicht angebunden (Finnhub-Key fehlt). Es kommen keine Aktien-Tipps.</li>
        </ul>
      </section>

      <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Datenquellen</h2>
        <ul className="space-y-1 text-[12px] leading-relaxed text-slate-300">
          <li>• <span className="font-semibold">Sport:</span> TheSportsDB (öffentlich, kostenlos) — Spielpläne, letzte Ergebnisse, 3 Saisons Historie</li>
          <li>• <span className="font-semibold">Krypto:</span> Bybit (primär), Binance (Fallback), CoinGecko (Marktdaten)</li>
          <li>• <span className="font-semibold">Sentiment:</span> Fear & Greed Index (Alternative.me), Funding-Rates (Bybit)</li>
          <li>• <span className="font-semibold">News:</span> RSS-Feeds aus dem deutschsprachigen Krypto-Raum</li>
        </ul>
      </section>

      <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Lokales Tagebuch</h2>
        <p className="text-[12px] leading-relaxed text-slate-200">
          Alle Tier-90-Picks, Sport-Tipps und Konsens-Entscheidungen werden lokal in deinem Browser
          gespeichert (localStorage). Sie verlassen dein Gerät nicht. Der Track-Record wächst über Tage
          und wird im Tier-90-Tagebuch angezeigt — echte Empirik statt Werbe-Versprechen.
        </p>
      </section>
    </main>
  );
}

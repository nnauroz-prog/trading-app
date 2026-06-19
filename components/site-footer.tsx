// Globaler Footer. Bewusst knapp: Datenquellen, Disclaimer,
// Versions-Hinweis. Auf jeder Seite sichtbar — macht klar, dass die
// Empfehlungen Modell-Hinweise sind, keine Wertpapier-Beratung.

import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="mx-auto mt-8 mb-20 max-w-5xl space-y-3 px-4 pt-6 text-[10.5px] leading-snug text-slate-500 md:mb-6 md:px-6">
      <div className="rounded-lg border border-slate-800/80 bg-slate-900/30 p-3">
        <div className="font-semibold uppercase tracking-[0.2em] text-slate-400">Wichtig</div>
        <p className="mt-1 text-slate-400">
          Dieses Tool liefert <span className="font-semibold text-slate-300">Modell-basierte Hinweise</span> auf Basis offener
          Markt-Daten. Es ist <span className="font-semibold text-amber-300">keine Wertpapier-Beratung</span>, keine
          Anlageempfehlung und keine Garantie auf zukuenftige Kursverlaeufe. Verluste sind moeglich, bei Hebelprodukten
          (Optionsscheine, Knock-Outs) bis zum Totalverlust. Eigene Recherche und Risiko-Pruefung ersetzt das Tool nicht.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div>
          <div className="font-semibold uppercase tracking-wider text-slate-400">Datenquellen</div>
          <ul className="mt-1 space-y-0.5">
            <li>Krypto: Binance, CoinGecko</li>
            <li>Aktien/Rohstoffe: Yahoo Finance</li>
            <li>WM/Sport: TheSportsDB, hartkodierter FIFA-Spielplan</li>
            <li>Sentiment: Alternative.me, Finnhub</li>
          </ul>
        </div>
        <div>
          <div className="font-semibold uppercase tracking-wider text-slate-400">Methodik</div>
          <ul className="mt-1 space-y-0.5">
            <li>Aktien-Sicherheits-Check: 8 harte Kriterien</li>
            <li>Optionsscheine: vereinfachte Black-Scholes-Approximation</li>
            <li>Volatilitaet: 60/90-Tage realisiert, annualisiert</li>
            <li>Sport: Elo-Modell + Form-Index</li>
          </ul>
        </div>
        <div>
          <div className="font-semibold uppercase tracking-wider text-slate-400">Schnellzugriff</div>
          <ul className="mt-1 space-y-0.5">
            <li><Link href="/hilfe" className="hover:text-emerald-300">Hilfe &amp; FAQ</Link></li>
            <li><Link href="/settings" className="hover:text-emerald-300">Einstellungen</Link></li>
            <li><Link href="/watchlist" className="hover:text-emerald-300">Watchlist</Link></li>
            <li><Link href="/heute-sicher" className="hover:text-emerald-300">Heute besonders sicher</Link></li>
          </ul>
        </div>
      </div>

      <p className="text-center text-[9.5px] text-slate-600">
        Privates Decision-Support-Tool · alle gespeicherten Daten (Watchlists, Notizen, Tipp-Tagebuch) bleiben lokal im Browser.
      </p>
    </footer>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Hilfe & FAQ',
  description: 'Wie liest man den Sicherheits-Check, die Optionsschein-Vorschlaege und das WM-Modell richtig — kompakt erklaert.'
};

export const dynamic = 'force-static';

interface FaqItem {
  q: string;
  a: React.ReactNode;
  highlight?: boolean;
}

const FAQ: FaqItem[] = [
  {
    q: 'Was bedeutet 8/8 Kriterien beim Aktien-Sicherheits-Check?',
    highlight: true,
    a: (
      <>
        <p>
          Acht harte Kriterien, die gleichzeitig erfüllt sein müssen, bevor eine Aktie als &bdquo;Grade A&ldquo; gilt:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-4">
          <li>Preis über MA200 (Langfrist-Trend ok)</li>
          <li>Preis über MA50 (Mittelfrist-Trend ok)</li>
          <li>MA50 über MA200 (kein Death-Cross, gesunder MA-Stack)</li>
          <li>RSI unter 70 (kein Overbought-FOMO)</li>
          <li>RSI über 30 (kein fallendes Messer)</li>
          <li>52-Wochen-Position 30–90 % (gesunde Lage zwischen Tief und Hoch)</li>
          <li>Volumen ≥ 50 % des 20-Tage-Schnitts (Markt schaut hin)</li>
          <li>1-Monats-Performance zwischen −5 % und +20 % (kein vertikaler Spike)</li>
        </ul>
        <p className="mt-2 text-slate-400">
          Auch ein 8/8-Treffer ist <span className="font-semibold text-amber-300">keine Garantie</span> — Märkte können
          jederzeit drehen. Das Gitter filtert aber konsistent die haarsträubenden Setups raus.
        </p>
      </>
    )
  },
  {
    q: 'Wie lese ich die drei Optionsschein-Vorschläge (niedrig / mittel / hoch)?',
    highlight: true,
    a: (
      <>
        <p>
          Wenn die App eine Aktie oder einen Coin zum Kauf qualifiziert, kommen drei vorgerechnete Setups
          mit konkreten Strike- und Verfallswerten. Die Stufen unterscheiden sich nach Risiko-Charakter:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-4">
          <li><span className="text-emerald-300">Niedrig</span>: Strike 15 % im Geld, 18 Monate Laufzeit. Folgt der Aktie fast 1:1.</li>
          <li><span className="text-amber-300">Mittel</span>: Strike am Geld, 9 Monate. Klassischer 6-12-Monats-Trade.</li>
          <li><span className="text-rose-300">Hoch</span>: Strike 20 % aus dem Geld, 3 Monate. Hoher Hebel, Theta frisst.</li>
        </ul>
        <p className="mt-2 text-slate-400">
          Die exakten WKN listet die App nicht (keine Live-Daten der Emittenten). Beim Broker mit diesen
          Parametern suchen. Position max. 1–3 % des Kapitals.
        </p>
      </>
    )
  },
  {
    q: 'Sind die Sport-Tipps Wett-Empfehlungen?',
    highlight: true,
    a: (
      <>
        <p>
          <span className="font-semibold text-amber-300">Nein.</span> Die App liefert Modell-Tendenzen pro Spiel — sortiert nach Konfidenz und
          Quality-Score — für Tippspiele unter Freunden. Sie ist kein Wett-Berater, keine Wett-Strategie und keine
          Erfolgs-Garantie. Auf das einzelne Spiel bleibt immer Restrisiko, egal wie hoch die Konfidenz ist.
        </p>
      </>
    )
  },
  {
    q: 'Was ist Tier 90?',
    a: (
      <>
        <p>
          Höchste Sicherheitsstufe der App. Ein Pick erscheint hier nur wenn alle fünf Analyse-Säulen (Trading)
          oder mindestens 10 von 11 Signalen (Sport) gleichzeitig grünes Licht geben. Empirisch liegt die
          Treffer-Quote solcher Multi-Signal-Konsens-Picks bei rund <span className="font-mono text-emerald-300">88–92 %</span> über viele Trades — auf das
          einzelne Spiel bleibt aber Restrisiko. Lieber zwei Wochen warten als einen Fehl-Pick.
        </p>
      </>
    )
  },
  {
    q: 'Was bedeutet die σ-Anzeige (Modell-Vola)?',
    a: (
      <>
        <p>
          Annualisierte realisierte Volatilität des Basiswerts aus den letzten 60 (Aktien) bzw. 90 (Krypto)
          Handelstagen. Wird ins Optionsschein-Modell eingespeist, damit die Hebel- und Premium-Schätzungen
          zur echten Marktrealität passen statt zu einer pauschalen 30 %-Annahme. Bei einer ruhigen Blue-Chip
          rechnet das Modell vielleicht mit 22 %, bei BTC mit 60–80 %.
        </p>
      </>
    )
  },
  {
    q: 'Wann sollte ich verkaufen?',
    a: (
      <>
        <p>
          Die App gibt drei konkrete Verkaufs-Signale:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-4">
          <li>Sicherheits-Check fällt auf Grade C oder D (Kriterien-Drift)</li>
          <li>Stop-Loss aus dem Trade-Plan ist erreicht (im Gold-Bereich auch der Trail-Stop)</li>
          <li>Take-Profit-Ziel ist erreicht — Teilverkauf nach dem 2× R-Multiple gilt als Standard</li>
        </ul>
        <p className="mt-2 text-slate-400">
          Keine dieser Regeln ist absolut — der Tag der Veröffentlichung-Daten oder ein Earnings-Call können
          alles verschieben. Disziplin schlägt Bauchgefühl.
        </p>
      </>
    )
  },
  {
    q: 'Was passiert mit meinen Tipps, Watchlists und Notizen?',
    a: (
      <>
        <p>
          Alles bleibt <span className="font-semibold text-emerald-300">lokal in deinem Browser</span> (localStorage). Kein Server, kein Account, keine
          Übertragung. Wenn du das Gerät wechselst oder den Browser-Cache leerst, sind die Daten weg.
          Über <Link href="/settings" className="underline hover:text-emerald-300">Einstellungen → Daten-Backup</Link> kannst du jederzeit ein JSON exportieren und auf einem anderen Gerät wieder einspielen.
        </p>
      </>
    )
  },
  {
    q: 'Muss ich kaufen, wenn die App „KAUFEN" sagt?',
    a: (
      <>
        <p>
          <span className="font-semibold text-amber-300">Nein.</span> &bdquo;KAUFEN&ldquo; heißt: alle 8 Sicherheits-Kriterien sind erfüllt, das Setup ist
          modell-mäßig sauber. Die Entscheidung über die Größe deiner Position, deinen Stop-Loss, dein
          Timing und ob das überhaupt zu deinem Risiko-Profil passt, triffst nur du. Die App liefert die
          Grundlage, nicht den Auftrag.
        </p>
      </>
    )
  },
  {
    q: 'Wie ehrlich sind die Backtests?',
    a: (
      <>
        <p>
          So ehrlich wie möglich, aber mit Caveat:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-4">
          <li>Modell-Prämien basieren auf vereinfachter Black-Scholes-Approximation, nicht auf echten Schein-Kursen</li>
          <li>Spread, Slippage und Vola-Sprünge sind nicht abgebildet</li>
          <li>Sample-Größe pro Stufe ist klein (10–25 Trades über 2 Jahre)</li>
          <li>Strike-Rundung wie im Live-Pfad — Backtest und Anzeige sind konsistent</li>
        </ul>
        <p className="mt-2 text-slate-400">
          Win-Rate ist ein Hinweis, keine Garantie. Reale Schein-Kurse beim Emittenten können spürbar abweichen.
        </p>
      </>
    )
  },
  {
    q: 'Warum steht da manchmal „Heute kein Pick"?',
    a: (
      <>
        <p>
          Genau dann, wenn die Pflichtkriterien an dem Tag von keinem Setup erfüllt werden. Bewusst:
          <span className="font-semibold text-emerald-300"> kein Pick ist besser als ein erzwungener.</span> Die App treibt dich nicht zum
          Handeln — sie sagt explizit &bdquo;Cash bleibt eine Position&ldquo;, wenn die Daten kein Signal hergeben.
        </p>
      </>
    )
  },
  {
    q: 'Was die App NICHT kann',
    a: (
      <>
        <ul className="space-y-2">
          <li>• <span className="font-semibold">Garantierte Gewinne.</span> Auch ein 90-%-Pick geht in 1 von 10 Fällen schief.</li>
          <li>• <span className="font-semibold">Verletzungen / Aufstellungen / Tagesform.</span> Das Modell sieht Form aus den letzten Spielen, nicht den heutigen Krankenstand.</li>
          <li>• <span className="font-semibold">Live-Spiel-Anpassungen.</span> Empfehlungen sind vor Anstoß. Sobald ein Tor fällt, ist die Vorhersage Geschichte.</li>
          <li>• <span className="font-semibold">Order-Ausführung.</span> Die App ist kein Broker. Sie liefert die Analyse, du klickst im Broker.</li>
          <li>• <span className="font-semibold">Steuerberatung.</span> Gewinne/Verluste sind steuerlich relevant — sprich mit deinem Steuerberater.</li>
        </ul>
      </>
    )
  }
];

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
          Ehrliche Erklärung der wichtigsten Konzepte, Filter und Modelle — ohne Werbe-Sprache.
        </p>
      </header>

      {/* Erste-Schritte-Block */}
      <section className="space-y-3 rounded-2xl border-2 border-emerald-400/40 bg-emerald-950/15 p-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-300">Erste Schritte · 3 Klicks</div>
        <h2 className="text-lg font-bold tracking-tight text-white">Du bist neu hier? So fängst du an.</h2>
        <ol className="space-y-2 text-[12.5px] leading-relaxed text-slate-200">
          <li className="flex items-baseline gap-2">
            <span className="font-mono text-emerald-300">1.</span>
            <span>
              <Link href="/heute-sicher" className="font-semibold text-emerald-200 underline hover:text-emerald-100">→ Heute besonders sicher</Link>
              {' '}öffnen — der Cross-Asset-Schnellblick zeigt dir Grade-A-Picks über Krypto, Aktien und WM auf einer Seite.
            </span>
          </li>
          <li className="flex items-baseline gap-2">
            <span className="font-mono text-emerald-300">2.</span>
            <span>
              Wenn dir ein Asset auffällt:{' '}
              <Link href="/aktien" className="font-semibold text-emerald-200 underline hover:text-emerald-100">→ Aktien</Link>{' '}oder{' '}
              <Link href="/" className="font-semibold text-emerald-200 underline hover:text-emerald-100">→ Krypto</Link>{' '}öffnen,
              auf das Symbol klicken — Sicherheits-Check und (bei Grade A/B) Optionsschein-Setups erscheinen sofort.
            </span>
          </li>
          <li className="flex items-baseline gap-2">
            <span className="font-mono text-emerald-300">3.</span>
            <span>
              Tipps speichern: in jeder Detail-Karte gibt&apos;s einen &bdquo;★ Watchlist&ldquo;-Button. Alles bleibt
              lokal im Browser — du musst dich nirgendwo anmelden.
            </span>
          </li>
        </ol>
      </section>

      {/* FAQ als <details> */}
      <section className="space-y-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">FAQ</div>
        <h2 className="text-lg font-bold tracking-tight text-white">Häufige Fragen</h2>
        <p className="text-[11.5px] text-slate-500">Drei meistgestellte Fragen sind aufgeklappt. Klick auf eine Frage zum Lesen.</p>
        <div className="space-y-2">
          {FAQ.map((item, i) => (
            <details
              key={i}
              open={item.highlight}
              className={`group rounded-xl border p-3 transition ${
                item.highlight
                  ? 'border-emerald-400/30 bg-emerald-950/10'
                  : 'border-slate-800 bg-slate-900/30'
              }`}
            >
              <summary className="cursor-pointer list-none">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[12.5px] font-semibold text-slate-100">{item.q}</span>
                  <span aria-hidden className="shrink-0 text-slate-500 transition group-open:rotate-90">▸</span>
                </div>
              </summary>
              <div className="mt-2 text-[12px] leading-relaxed text-slate-300">{item.a}</div>
            </details>
          ))}
        </div>
      </section>

      {/* Datenquellen + Vertrauensbasis */}
      <section className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Woher kommen die Daten?</h2>
        <ul className="space-y-1 text-[12px] leading-relaxed text-slate-300">
          <li>• <span className="font-semibold">Krypto:</span> Binance, Bybit (Fallback), CoinGecko (Marktdaten), Alternative.me (Fear &amp; Greed)</li>
          <li>• <span className="font-semibold">Aktien:</span> Yahoo Finance (Quotes &amp; Historie), Finnhub (Headlines)</li>
          <li>• <span className="font-semibold">Rohstoffe:</span> Yahoo Finance (Continuous-Front-Month-Futures)</li>
          <li>• <span className="font-semibold">Sport:</span> TheSportsDB (Spielpläne, Ergebnisse, 3 Saisons Historie), hartkodierter FIFA-Spielplan für WM 2026</li>
          <li>• <span className="font-semibold">News:</span> Öffentliche RSS-Feeds aus dem deutschsprachigen Krypto-Raum</li>
        </ul>
        <p className="text-[10.5px] text-slate-500">
          Alle Quellen sind öffentlich und kostenlos. Es gibt keine privaten Tipps, keine Telegram-Insider, keine Hinterzimmer-Signale.
        </p>
      </section>

      {/* Methodik */}
      <section className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Methodik in 30 Sekunden</h2>
        <ul className="space-y-1 text-[12px] leading-relaxed text-slate-300">
          <li>• <span className="font-semibold">Aktien:</span> 8-Punkt-Sicherheits-Check (Trend + Lage + Volumen + Momentum)</li>
          <li>• <span className="font-semibold">Krypto:</span> Master-Signal-Engine mit 5 Säulen (Markt-Mood, Setup-Qualität, Sentiment, Liquidität, Backtest-Trefferquote)</li>
          <li>• <span className="font-semibold">Optionsscheine:</span> Vereinfachte Black-Scholes-Approximation mit realisierter Vola, Standard-Ratio 10:1 (Aktien) / 100:1 (Krypto)</li>
          <li>• <span className="font-semibold">Sport:</span> Elo-Modell + Form-Index aus den letzten 5 Spielen + Direktvergleich aus 3 Saisons</li>
          <li>• <span className="font-semibold">Tier 90:</span> Multi-Signal-Konsens, mindestens 5 unabhängige Säulen einig</li>
        </ul>
      </section>

      <p className="text-center text-[10.5px] text-slate-500">
        Modell-Hinweise, kein Anlageratschlag. Verluste sind möglich, bei Hebelprodukten bis zum Totalverlust.
      </p>
    </main>
  );
}

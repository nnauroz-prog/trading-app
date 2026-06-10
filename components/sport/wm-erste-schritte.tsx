'use client';

// "Erste Schritte" — die 4-Schritt-Karte fuer User, die die App das
// erste Mal oeffnen. Bleibt sichtbar bis der User auf "verstanden"
// klickt (localStorage).

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'trading-app.wm-erste-schritte-dismissed-v1';

interface Schritt {
  nr: string;
  titel: string;
  beschreibung: string;
}

const SCHRITTE: Schritt[] = [
  {
    nr: '1',
    titel: 'Schau auf "Was passiert jetzt?"',
    beschreibung: 'Die gelbe Karte ganz oben sagt Dir in einem Satz, ob heute Tipps da sind oder nicht.'
  },
  {
    nr: '2',
    titel: 'Bankroll einmalig setzen',
    beschreibung: 'In der "Bankroll-Empfehlung"-Karte gibst Du an, wie viel Geld Du insgesamt fuer Tipps zur Verfuegung hast. Wird nur lokal auf Deinem Geraet gespeichert.'
  },
  {
    nr: '3',
    titel: 'Quote eintragen, Stake uebernehmen',
    beschreibung: 'Pro Tipp die Quote Deines Anbieters eintragen und auf "Stake uebernehmen" klicken. Die App rechnet Dir den passenden Einsatz aus.'
  },
  {
    nr: '4',
    titel: 'Ergebnisse pflegen sich von selbst',
    beschreibung: 'Nach dem Spiel kommen die Endergebnisse automatisch rein. Notfalls kannst Du sie in der "Ergebnisse nachpflegen"-Karte selbst eintragen.'
  }
];

export function WmErsteSchritte() {
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setDismissed(window.localStorage.getItem(STORAGE_KEY) === '1');
  }, []);

  if (dismissed === null) return null;
  if (dismissed) return null;

  const handleDismiss = () => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, '1');
    setDismissed(true);
  };

  return (
    <section className="space-y-2 rounded-2xl border-2 border-emerald-400/50 bg-emerald-950/15 p-3 sm:p-4" aria-label="Erste Schritte">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-300">Erste Schritte (nur einmal sichtbar)</h2>
        <button
          type="button"
          onClick={handleDismiss}
          className="rounded border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] uppercase tracking-wider text-slate-400 hover:border-emerald-400/50 hover:text-emerald-300"
        >verstanden</button>
      </div>
      <p className="text-[11.5px] leading-snug text-emerald-100/90">
        So nutzt Du das System taeglich:
      </p>
      <ol className="space-y-1.5">
        {SCHRITTE.map((s) => (
          <li key={s.nr} className="rounded border border-slate-800 bg-slate-950/40 p-2">
            <div className="flex items-baseline gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-[11px] font-bold text-emerald-200">{s.nr}</span>
              <h3 className="text-[12px] font-semibold text-slate-100">{s.titel}</h3>
            </div>
            <p className="mt-1 pl-7 text-[11px] leading-snug text-slate-300">{s.beschreibung}</p>
          </li>
        ))}
      </ol>
      <p className="text-[10px] leading-snug text-emerald-100/70">
        Tipp: das ausfuehrliche Glossar mit allen Fachbegriffen findest Du ganz unten auf dieser Seite. Klick auf &bdquo;verstanden&ldquo; blendet diese Karte dauerhaft aus.
      </p>
    </section>
  );
}

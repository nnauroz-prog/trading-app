'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'trading-app.first-visit-hint-dismissed-v1';

export function FirstVisitHint() {
  const [dismissed, setDismissed] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    setDismissed(stored === '1');
    setMounted(true);
  }, []);

  const dismiss = () => {
    window.localStorage.setItem(STORAGE_KEY, '1');
    setDismissed(true);
  };

  if (!mounted || dismissed) return null;

  return (
    <section className="space-y-2 rounded-2xl border-2 border-sky-400/40 bg-sky-950/20 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-sky-200">Willkommen — kurz erklärt</h2>
        <button
          onClick={dismiss}
          className="text-[10px] text-slate-400 hover:text-slate-200"
          aria-label="Hinweis schließen"
        >
          ✕ verstanden
        </button>
      </div>
      <ul className="space-y-1.5 text-[12px] leading-relaxed text-slate-200">
        <li>
          <span className="font-bold text-white">HEUTE-Block ganz oben</span> ist die einzige Antwort, die du jeden Tag brauchst:
          KAUFEN, WARTEN oder VORSICHT — mit Coin, Stop und Ziel.
        </li>
        <li>
          <span className="font-bold text-white">Konfidenz 0–100</span> sagt dir, wie sicher die App sich ist.
          Höchstens 75 = wirklich gutes Setup, unter 35 = besser warten.
        </li>
        <li>
          Über die Nav-Leiste kommst du in die Tiefe: <span className="text-emerald-300">Firmen</span> (drei
          Trader-Persönlichkeiten), <span className="text-emerald-300">Recherche</span> (12 Spezialisten + Chefredakteur),
          <span className="text-emerald-300"> News</span>, <span className="text-emerald-300">Akademie</span> (was die App
          dazu lernt).
        </li>
        <li>
          Unten findest du eine ehrliche „Was die App nicht kann“-Sektion. Lies sie einmal — sie hält dich vor
          den klassischen Fallen sicher.
        </li>
      </ul>
    </section>
  );
}

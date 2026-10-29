// Post-WM-Fokus: wird oben auf dem Sport-Reiter gezeigt, sobald die WM
// vorbei ist. Holt den Blick zurueck auf den laufenden Vereinsfussball
// (Champions League, europaeische Top-Ligen) — genau das, was "nach der
// WM kommt". Server-Component, reine Links/Anker, keine Live-Daten noetig.

import Link from 'next/link';

const COMPETITIONS = [
  { label: 'Champions League', emoji: '🏆' },
  { label: 'Bundesliga', emoji: '🇩🇪' },
  { label: 'Premier League', emoji: '🏴' },
  { label: 'La Liga', emoji: '🇪🇸' },
  { label: 'Serie A', emoji: '🇮🇹' },
  { label: 'Europa League', emoji: '🥈' }
];

export function PostWmFootballFocus() {
  return (
    <section className="space-y-2 rounded-2xl border border-emerald-400/40 bg-gradient-to-br from-emerald-950/40 to-slate-900/40 p-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-300">
        Jetzt im Fokus · Vereinsfußball
      </div>
      <h2 className="text-lg font-bold tracking-tight text-white sm:text-xl">
        WM vorbei — der Blick ist jetzt auf den laufenden Fußball.
      </h2>
      <p className="text-[12px] leading-snug text-slate-300">
        Champions League und die europäischen Top-Ligen laufen. Die Prognosen unten (Liga Precision
        Desk) sind auf die aktuellen Wettbewerbe ausgerichtet — Modell-Tendenz pro Spiel, keine
        Wettempfehlung.
      </p>
      <ul className="flex flex-wrap gap-1.5 pt-0.5">
        {COMPETITIONS.map((c) => (
          <li
            key={c.label}
            className="rounded-md border border-slate-700 bg-slate-900/60 px-2 py-0.5 text-[10.5px] text-slate-200"
          >
            <span aria-hidden className="mr-1">{c.emoji}</span>{c.label}
          </li>
        ))}
      </ul>
      <p className="pt-0.5 text-[10px] text-slate-500">
        WM-2026-Rückblick weiterhin verfügbar unter{' '}
        <Link href="/wm" className="underline hover:text-emerald-300">WM 2026</Link>.
      </p>
    </section>
  );
}

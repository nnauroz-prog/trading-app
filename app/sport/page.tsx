import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { LiveScoreboard } from '@/components/sport/live-scoreboard';

export const metadata: Metadata = {
  title: 'Sport · Spiele und Ergebnisse',
  description: 'Spiele, Ergebnisse und datenbasierte Prognosen für Fußball, Basketball, Eishockey und Tennis.'
};

export default function SportPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold text-white sm:text-5xl">Was läuft heute?</h1>
        <p className="max-w-xl text-sm leading-relaxed text-slate-400">Spielstände und die nächsten Spiele. Öffne ein Spiel für eine Prognose mit möglichem Ergebnis, Favorit und den Gründen dafür.</p>
      </header>
      <LiveScoreboard initialSport="football" />
      <details className="terminal-panel p-4 sm:p-5">
        <summary className="cursor-pointer text-sm font-medium text-slate-300">Weitere Spielpläne ansehen</summary>
        <nav aria-label="Weitere Sportseiten" className="mt-4 grid gap-2 sm:grid-cols-2">
          {[
            ['/basketball', 'Basketball', 'Weitere Ligen und Termine'],
            ['/tennis', 'Tennis', 'Weitere Turniere und Termine'],
            ['/eishockey', 'Eishockey', 'Weitere Ligen und Termine'],
            ['/handball', 'Handball', 'Termine und Ergebnisse'],
            ['/wm', 'WM 2026', 'Spielplan und Rückblick']
          ].map(([href, label, detail]) => <Link key={href} href={href} className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 p-4 text-sm transition hover:border-cyan-300/50"><span><span className="block font-medium text-slate-100">{label}</span><span className="mt-1 block text-xs text-slate-400">{detail}</span></span><ArrowRight size={16} className="shrink-0 text-cyan-300" aria-hidden /></Link>)}
        </nav>
      </details>
    </main>
  );
}

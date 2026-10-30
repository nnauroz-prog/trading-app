import type { Metadata } from 'next';
import Link from 'next/link';
import { getMoneyRadar } from '@/lib/news/money-radar-fetch';
import { MoneyRadarView } from '@/components/money-radar-view';

export const metadata: Metadata = {
  title: 'Geld-Radar · weltweite Chancen',
  description: 'Die aktuellsten Finanz-News weltweit, auf Deutsch nach Geld-Relevanz bewertet und gruppiert — wo bewegt sich gerade etwas.'
};

export const dynamic = 'force-dynamic';
export const revalidate = 600;

export default async function RadarPage() {
  const radar = await getMoneyRadar();
  return (
    <main className="mx-auto max-w-4xl space-y-5 p-4 pb-20 md:p-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-emerald-300">
        ← zurück zum Trading Desk
      </Link>

      <header className="relative space-y-2 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/70 via-slate-950/50 to-slate-950/70 p-5 md:p-6">
        <div className="aurora" aria-hidden />
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-300">
            <span aria-hidden>🛰️</span> Geld-Radar
          </div>
          <h1 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
            <span className="text-gradient">Womit andere gerade Geld machen</span>
          </h1>
          <p className="max-w-2xl text-[12.5px] leading-relaxed text-slate-300/90">
            Die aktuellsten Finanz-Nachrichten aus aller Welt — auf Deutsch, nach Geld-Relevanz bewertet und
            sortiert. Chancen und Risiken getrennt markiert, mit einem Satz dazu, warum es zählt. Reine
            Einordnung, kein Anlageratschlag.
          </p>
        </div>
      </header>

      <MoneyRadarView radar={radar} />

      <p className="text-center text-[10px] leading-snug text-slate-500">
        Quellen: öffentliche Finanz-Feeds (tagesschau Wirtschaft, Finanzen.net, boerse-online,
        Der Aktionär, manager magazin, BTC-ECHO u.a.). Bewertung ist regelbasiert — ein Startpunkt
        für eigene Recherche, keine Empfehlung.
      </p>
    </main>
  );
}

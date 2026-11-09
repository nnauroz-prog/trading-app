// Kompakter "Heute im Blick"-Streifen unter dem Geldplan: die drei
// geld-relevantesten News aus dem Geld-Radar plus Sprung zu Radar und
// Krypto-Signalen. Server-Component, nutzt den 10-min-Cache des Radars.

import Link from 'next/link';
import { getMoneyRadar } from '@/lib/news/money-radar-fetch';

export async function HomeSignalsStrip() {
  const radar = await getMoneyRadar();
  const top = radar.top.slice(0, 3);
  return (
    <section className="mx-auto max-w-5xl space-y-3 px-4 pb-6 md:px-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-white">Heute im Blick</h2>
        <Link href="/radar" className="text-sm text-cyan-300 hover:text-cyan-200">Geld-Radar öffnen →</Link>
      </div>
      {top.length === 0 ? (
        <p className="rounded-xl border border-slate-800 p-4 text-sm text-slate-400">Gerade keine neuen Meldungen — schau später noch einmal rein.</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-3">
          {top.map(item => (
            <li key={item.id}>
              <a href={item.link} target="_blank" rel="noopener noreferrer" className="block h-full rounded-xl border border-slate-800 bg-white/[0.02] p-3 transition hover:border-cyan-300/40">
                <span className={`text-xs font-medium ${item.direction === 'risiko' ? 'text-rose-300' : item.direction === 'chance' ? 'text-emerald-300' : 'text-slate-400'}`}>
                  {item.direction === 'risiko' ? 'Risiko' : item.direction === 'chance' ? 'Chance' : 'Info'} · {item.source}
                </span>
                <p className="mt-1 text-sm font-medium leading-snug text-slate-100">{item.title}</p>
              </a>
            </li>
          ))}
        </ul>
      )}
      <Link href="/krypto" className="flex items-center justify-between rounded-xl border border-emerald-400/30 bg-emerald-400/[0.05] p-3 text-sm text-emerald-100 hover:border-emerald-300/60">
        <span>Krypto-Kaufsignale: welcher Coin lohnt sich gerade?</span><span aria-hidden>→</span>
      </Link>
    </section>
  );
}

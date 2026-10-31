import Link from 'next/link';
import { ArrowUpRight, ShieldCheck } from 'lucide-react';

export function SiteFooter() {
  return <footer className="mx-auto mt-12 max-w-5xl border-t border-slate-800 px-4 pb-6 pt-7 md:px-6">
    <div className="flex flex-wrap items-center justify-between gap-5">
      <div><p className="section-kicker text-cyan-300">KLARER BLICK. EIGENE ENTSCHEIDUNG.</p><p className="mt-2 text-xs text-slate-500">Trading Desk · Dein Geld einfach im Blick</p></div>
      <nav aria-label="Service" className="flex flex-wrap gap-4 text-xs text-slate-300">{[['/geldplan','Mein Geldplan'],['/hilfe','Hilfe'],['/settings','Einstellungen']].map(([href,label]) => <Link key={href} href={href} className="inline-flex items-center gap-1 hover:text-cyan-200">{label}<ArrowUpRight size={12} /></Link>)}</nav>
    </div>
    <div className="mt-6 flex items-start gap-2 text-xs leading-relaxed text-slate-400"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-slate-500" /><p>Eine Hilfe für deine Entscheidung, keine persönliche Anlageberatung. Kurse können verzögert sein. Gewinne sind nicht garantiert; Verluste sind möglich.</p></div>
    <details className="mt-4 text-xs text-slate-500"><summary className="cursor-pointer py-3 hover:text-slate-300">Über die Seite &amp; deine Daten</summary><div className="grid gap-5 pb-4 pt-2 leading-relaxed sm:grid-cols-3"><div><h3 className="mb-2 font-semibold text-slate-300">Unsere Datenquellen</h3><p>Krypto: Binance, Bybit, Kraken, CoinGecko.<br />Aktien &amp; Rohstoffe: Yahoo Finance.<br />Sport-Live: ESPN. Prognosen: TheSportsDB und FIFA-Spielplan.<br />Sentiment: Alternative.me und Finnhub.</p></div><div><h3 className="mb-2 font-semibold text-slate-300">Wie entstehen die Hinweise?</h3><p>Die Seite prüft deine Angaben und verfügbare Preise nach festen Regeln. Die Hinweise können dir bei deiner Entscheidung helfen. Sie sagen keine sicheren Gewinne voraus.</p><Link href="/hilfe" className="mt-2 inline-block text-cyan-300">Mehr erfahren →</Link></div><div><h3 className="mb-2 font-semibold text-slate-300">Dein Geld bleibt deine Sache</h3><p>Die App führt keine Käufe aus. Dein Geldplan, Listen und persönliche Notizen werden lokal in deinem Browser gespeichert. Sichere sie bei Bedarf unter Einstellungen.</p></div></div></details>
  </footer>;
}

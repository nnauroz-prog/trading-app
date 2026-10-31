import Link from 'next/link';
import { ArrowUpRight, Sparkles } from 'lucide-react';

export function MoneyPlanEntry() {
  return <Link href="/geldplan" className="money-plan-entry group" aria-label="Meinen Geldplan starten">
    <div className="money-plan-entry-icon"><Sparkles size={24} strokeWidth={1.5} /></div>
    <div className="min-w-0 flex-1"><p className="section-kicker text-[#d8ff62]">DEIN GELD. DEIN PLAN.</p><h2 className="mt-1 text-xl font-semibold text-white sm:text-2xl">Wie möchtest du dein Geld aufteilen?</h2><p className="mt-2 text-sm leading-relaxed text-slate-400">Gib einen Betrag ein. Du siehst, welchen Teil du verfügbar halten oder anlegen könntest.</p></div>
    <span className="money-plan-entry-action"><span>Geldplan öffnen</span><ArrowUpRight size={19} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></span>
  </Link>;
}

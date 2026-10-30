import type { Metadata } from 'next';
import { Sparkles } from 'lucide-react';
import { MoneyPlanTerminal } from '@/components/finance/money-plan-terminal';

export const metadata: Metadata = { title: 'Mein Geldplan', description: 'Ein Betrag, dein Ziel und ein nachvollziehbarer nächster Schritt. Fünf regelbasierte Helfer prüfen deinen Plan direkt in deinem Browser.' };
export default function MoneyPlanPage() {
  return <main className="mx-auto max-w-4xl space-y-6 p-4 md:p-6"><header className="terminal-custom-header money-plan-page-header"><p className="section-kicker flex items-center gap-2 text-cyan-300"><Sparkles size={15} />DEIN GELD. DEIN TEMPO.</p><h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-white sm:text-6xl">Ein guter Plan.<br /><span className="text-[#d8ff62]">Einfach dein Ding.</span></h1><p className="mt-5 max-w-xl text-sm leading-relaxed text-slate-400">Drei kleine Angaben. Ein klarer nächster Schritt. Deine Helfer prüfen Rücklagen, Schulden, Zeit und Risiko im Hintergrund.</p></header><MoneyPlanTerminal /></main>;
}

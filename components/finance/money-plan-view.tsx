import { MoneyPlanTerminal } from '@/components/finance/money-plan-terminal';
export function MoneyPlanView() {
  return <main className="mx-auto max-w-4xl space-y-6 p-4 md:p-6"><header className="terminal-custom-header money-plan-page-header"><h1 className="font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl">Dein Geldplan</h1><p className="mt-4 max-w-xl text-base leading-relaxed text-slate-300">Wie kannst du dein verfügbares Geld aufteilen? Gib deinen Betrag ein und sieh dir einen passenden Vorschlag an.</p></header><MoneyPlanTerminal /></main>;
}

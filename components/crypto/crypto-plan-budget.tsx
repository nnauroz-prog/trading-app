'use client';
import Link from 'next/link';
import { useSavedMoneyPlan } from '@/components/finance/use-saved-money-plan';

export function CryptoPlanBudget({ hasBuySignal }: { hasBuySignal: boolean }) {
  const { plan, loaded } = useSavedMoneyPlan();
  if (!loaded || plan?.status !== 'ready') return null;
  const budget = plan.allocations.find(allocation => allocation.id === 'learning')?.amount ?? 0;
  return <div className="border-b border-slate-800 bg-cyan-300/[0.025] px-5 py-4 sm:px-6">
    <p className="text-sm font-medium text-slate-200">{budget > 0 ? `Dein geplanter Rahmen: höchstens ${budget.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}` : 'Dein Geldplan sieht keinen Krypto-Anteil vor.'}</p>
    <p className="mt-2 text-sm leading-relaxed text-slate-400">{budget > 0 ? hasBuySignal ? 'Das ist die Obergrenze für alle riskanten Käufe zusammen. Ein Kaufhinweis erhöht diesen Betrag nicht. Gebühren gehören mit dazu.' : 'Gerade gibt es keinen passenden Kaufhinweis. Lass diesen Betrag vorerst auf dem Konto.' : 'Du kannst dir die Kaufprüfung trotzdem ansehen. Ändere deinen Geldplan nur, wenn Zeitraum und Risiko weiterhin für dich passen.'}</p>
    <Link href="/" className="mt-2 inline-flex min-h-9 items-center text-sm text-cyan-300">Meinen Geldplan ansehen →</Link>
  </div>;
}

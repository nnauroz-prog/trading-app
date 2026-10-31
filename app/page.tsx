import type { Metadata } from 'next';
import { MoneyPlanView } from '@/components/finance/money-plan-view';
export const metadata: Metadata = { title: 'Dein Geldplan', description: 'Dein verfügbares Geld einfach aufteilen. Betrag, Zeitraum und Risiko auswählen und einen nachvollziehbaren Vorschlag ansehen.' };
export default function HomePage() { return <MoneyPlanView />; }

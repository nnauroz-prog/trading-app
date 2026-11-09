import type { Metadata } from 'next';
import { MoneyPlanView } from '@/components/finance/money-plan-view';
import { HomeSignalsStrip } from '@/components/home/home-signals-strip';
export const metadata: Metadata = { title: 'Dein Geldplan', description: 'Dein verfügbares Geld einfach aufteilen. Betrag, Zeitraum und Risiko auswählen und einen nachvollziehbaren Vorschlag ansehen.' };
export const revalidate = 600;
export default function HomePage() { return <><MoneyPlanView /><HomeSignalsStrip /></>; }

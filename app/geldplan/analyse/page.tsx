import type { Metadata } from 'next';
import { FundPurchaseView } from '@/components/finance/fund-purchase-view';
import { fetchFundMarketData } from '@/lib/finance/fund-market-data';

export const metadata: Metadata = { title: 'Was konkret kaufen?', description: 'Ein konkreter weltweit anlegender Fonds: Kennnummern, Kosten, letzter Kurs und Risiken passend zum gespeicherten Geldplan.' };
export const dynamic = 'force-dynamic';

export default async function InvestmentAnalysisPage() {
  const { quote, history } = await fetchFundMarketData();
  return <FundPurchaseView quote={quote} history={history} />;
}

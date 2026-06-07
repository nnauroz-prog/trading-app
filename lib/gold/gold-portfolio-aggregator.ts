// Aggregiert mehrere Gold-Positionen zu einer Portfolio-Übersicht.
// Pure Funktion — kein I/O. Berechnet Summen, blended cost basis, gesamten
// PnL, sowie Steuer-Status pro Position (für Highlight wer schon steuerfrei ist).

import {
  calculateGoldHoldingPerformance,
  type AmountUnit,
  type PurchasePriceMode,
  type MarketContext,
  GRAMS_PER_TROY_OUNCE
} from '@/lib/gold/gold-holding-calculator';
import { computeTaxStatusDe, type TaxStatusDe } from '@/lib/gold/tax-status-de';

export interface PortfolioHoldingInput {
  id: string;
  label: string;
  purchaseDate: string;
  amount: number;
  amountUnit: AmountUnit;
  purityPromille: number;
  purchasePriceMode: PurchasePriceMode;
  purchasePrice?: number;
  fees?: number;
  sellSpreadPct?: number;
  // Pro Position: historischer Goldpreis zum Kaufdatum (USD/oz), null wenn unbekannt.
  historicalGoldPricePerOz: number | null;
}

export interface PortfolioPosition {
  input: PortfolioHoldingInput;
  pureGoldOunces: number;
  pureGoldGrams: number;
  purchaseValue: number | null;
  currentValue: number | null;
  absolutePnL: number | null;
  percentPnL: number | null;
  taxStatus: TaxStatusDe;
  hasCompleteData: boolean;
}

export interface PortfolioSummary {
  positions: PortfolioPosition[];
  // Aggregate über alle Positionen mit hasCompleteData = true.
  totalPureGoldGrams: number;
  totalPureGoldOunces: number;
  totalPurchaseValue: number;
  totalCurrentValue: number;
  totalAbsolutePnL: number;
  totalPercentPnL: number | null;
  // Blended cost basis: gewichteter Durchschnittskaufpreis je Unze.
  blendedCostPerOz: number | null;
  // Positionen, deren Spekulationsfrist bereits abgelaufen ist.
  taxFreeCount: number;
  // Positionen, die als unvollständig markiert sind (z. B. Auto-Mode ohne Hist-Preis).
  incompleteCount: number;
}

export function aggregateGoldPortfolio(
  inputs: PortfolioHoldingInput[],
  currentGoldPricePerOz: number | null,
  currentDateIso: string,
  marketContext: MarketContext
): PortfolioSummary {
  const positions: PortfolioPosition[] = inputs.map((input) => {
    const result = calculateGoldHoldingPerformance({
      purchaseDate: input.purchaseDate,
      amount: input.amount,
      amountUnit: input.amountUnit,
      purityPromille: input.purityPromille,
      purchasePriceMode: input.purchasePriceMode,
      purchasePrice: input.purchasePrice,
      fees: input.fees,
      sellSpreadPct: input.sellSpreadPct,
      currentGoldPricePerOz,
      historicalGoldPricePerOz: input.historicalGoldPricePerOz,
      currentDate: currentDateIso,
      marketContext
    });
    return {
      input,
      pureGoldOunces: result.pureGoldOunces,
      pureGoldGrams: result.pureGoldGrams,
      purchaseValue: result.purchaseValue,
      currentValue: result.currentValue,
      absolutePnL: result.absolutePnL,
      percentPnL: result.percentPnL,
      taxStatus: computeTaxStatusDe(input.purchaseDate, currentDateIso),
      hasCompleteData: result.hasCompleteData
    };
  });

  let totalPureGoldGrams = 0;
  let totalPureGoldOunces = 0;
  let totalPurchaseValue = 0;
  let totalCurrentValue = 0;
  let totalAbsolutePnL = 0;
  let weightedCostOzSum = 0;
  let weightingOunces = 0;
  let incompleteCount = 0;

  for (const p of positions) {
    totalPureGoldGrams += p.pureGoldGrams;
    totalPureGoldOunces += p.pureGoldOunces;
    if (!p.hasCompleteData) {
      incompleteCount++;
      continue;
    }
    if (p.purchaseValue !== null) totalPurchaseValue += p.purchaseValue;
    if (p.currentValue !== null) totalCurrentValue += p.currentValue;
    if (p.absolutePnL !== null) totalAbsolutePnL += p.absolutePnL;
    if (p.purchaseValue !== null && p.pureGoldOunces > 0) {
      const costPerOz = p.purchaseValue / p.pureGoldOunces;
      weightedCostOzSum += costPerOz * p.pureGoldOunces;
      weightingOunces += p.pureGoldOunces;
    }
  }

  const totalPercentPnL = totalPurchaseValue > 0 ? (totalAbsolutePnL / totalPurchaseValue) * 100 : null;
  const blendedCostPerOz = weightingOunces > 0 ? weightedCostOzSum / weightingOunces : null;
  const taxFreeCount = positions.filter((p) => p.taxStatus.isTaxFree).length;

  return {
    positions,
    totalPureGoldGrams,
    totalPureGoldOunces,
    totalPurchaseValue,
    totalCurrentValue,
    totalAbsolutePnL,
    totalPercentPnL,
    blendedCostPerOz,
    taxFreeCount,
    incompleteCount
  };
}

export { GRAMS_PER_TROY_OUNCE };

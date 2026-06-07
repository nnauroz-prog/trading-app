// Steuer-Status für physisches Gold in Deutschland (§ 23 EStG).
// Spekulationsfrist: nach 365 Tagen Haltedauer ist der Veräußerungsgewinn
// steuerfrei. Pure Funktion — keine Steuerberatung.

export interface TaxStatusDe {
  isTaxFree: boolean;
  daysToTaxFree: number;
  holdingDays: number;
  label: 'steuerfrei' | 'noch steuerpflichtig' | 'kein Datum';
}

export const TAX_FREE_HOLDING_DAYS = 365;

export function computeTaxStatusDe(purchaseDateIso: string, currentDateIso: string): TaxStatusDe {
  const purchaseMs = new Date(`${purchaseDateIso}T00:00:00`).getTime();
  const currentMs = new Date(`${currentDateIso}T00:00:00`).getTime();
  if (Number.isNaN(purchaseMs) || Number.isNaN(currentMs)) {
    return { isTaxFree: false, daysToTaxFree: TAX_FREE_HOLDING_DAYS, holdingDays: 0, label: 'kein Datum' };
  }
  const days = Math.max(0, Math.floor((currentMs - purchaseMs) / (24 * 60 * 60 * 1000)));
  const isTaxFree = days >= TAX_FREE_HOLDING_DAYS;
  return {
    isTaxFree,
    holdingDays: days,
    daysToTaxFree: isTaxFree ? 0 : TAX_FREE_HOLDING_DAYS - days,
    label: isTaxFree ? 'steuerfrei' : 'noch steuerpflichtig'
  };
}

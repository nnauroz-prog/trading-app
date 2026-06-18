// Generiert drei konkrete Optionsschein-Vorschlaege (niedrig / mittel /
// hoch Risiko) fuer einen Basiswert. Wird auf den Aktien- und Krypto-
// Detail-Seiten gezeigt, wenn die App den Basiswert zum Kauf empfiehlt.
// Reine Heuristik, kein Markt-Lookup — die App kennt keine konkreten
// WKNs. Ziel ist: dem User klare Anhaltspunkte fuer Strike und Laufzeit
// zu geben, mit denen er beim Broker den passenden Schein selbst sucht.

import { analyzeOptionsscheinInput, type OptionsscheinAnalysis } from './analyze';

export type SuggestionRisk = 'niedrig' | 'mittel' | 'hoch';

export interface OptionsscheinSuggestion {
  risk: SuggestionRisk;
  direction: 'call' | 'put';
  strike: number;
  expiryIso: string;          // YYYY-MM-DD
  monthsToExpiry: number;
  moneynessLabel: string;     // z. B. "15 % ITM", "ATM", "10 % OTM"
  analysis: OptionsscheinAnalysis;
  rationale: string;
}

interface SuggestInput {
  underlyingName: string;
  underlyingPrice: number;
  direction?: 'call' | 'put';   // Default: 'call' (bullische App-Empfehlung)
  // Anker fuer Strike-Rundung. Aktien werden auf 1 / 5 EUR-Schritte
  // gerundet, Krypto auf 100 / 1000 USD-Schritte, sonst auf "nice
  // numbers" der Groesse des Kurses.
  assetClass?: 'aktie' | 'krypto';
  today?: Date;
  // Annualisierte Vola als Dezimalwert. Default 0.30. Sollte aus
  // historischen Daten kommen, damit der Modell-Hebel realistisch ist.
  sigma?: number;
}

const PROFILES: Array<{
  risk: SuggestionRisk;
  moneynessFactor: number;     // 0.85 = 15 % ITM (Call), 1.20 = 20 % OTM (Call)
  monthsToExpiry: number;
  rationale: string;
}> = [
  {
    risk: 'niedrig',
    moneynessFactor: 0.85,
    monthsToExpiry: 18,
    rationale: 'Tief im Geld + 18 Monate Laufzeit — Schein folgt dem Basiswert fast 1:1, kaum Zeitwert-Verlust, Hebel niedrig aber Kapitaleinsatz spart sich gegenueber der Aktie.'
  },
  {
    risk: 'mittel',
    moneynessFactor: 1.00,
    monthsToExpiry: 9,
    rationale: 'Am Geld + 9 Monate — typisches Setup fuer eine 6-12-Monats-These mit 3-6× Hebel und sichtbarem Zeitwert-Druck im letzten Drittel.'
  },
  {
    risk: 'hoch',
    moneynessFactor: 1.20,
    monthsToExpiry: 3,
    rationale: 'Aus dem Geld + nur 3 Monate — hoher Hebel, aber Basiswert MUSS sich bewegen, sonst frisst Theta. Nur fuer kleine Positionsgroessen.'
  }
];

function roundStrike(strike: number, assetClass: 'aktie' | 'krypto'): number {
  if (!Number.isFinite(strike) || strike <= 0) return strike;
  if (assetClass === 'krypto') {
    if (strike >= 10000) return Math.round(strike / 1000) * 1000;
    if (strike >= 1000) return Math.round(strike / 100) * 100;
    if (strike >= 100) return Math.round(strike / 10) * 10;
    if (strike >= 10) return Math.round(strike);
    return Math.round(strike * 10) / 10;
  }
  // Aktie
  if (strike >= 1000) return Math.round(strike / 10) * 10;
  if (strike >= 100) return Math.round(strike / 5) * 5;
  if (strike >= 20) return Math.round(strike);
  return Math.round(strike * 2) / 2;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  const targetMonth = d.getUTCMonth() + months;
  d.setUTCMonth(targetMonth);
  // Zum 3. Freitag des Zielmonats — analog zum klassischen Options-
  // Verfallstag. Naeherung: 15. + Wochentags-Korrektur.
  d.setUTCDate(15);
  return d;
}

function fmtIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function moneynessLabel(direction: 'call' | 'put', factor: number): string {
  const pct = Math.round((factor - 1) * 100);
  if (pct === 0) return 'ATM';
  const inMoney = direction === 'call' ? pct < 0 : pct > 0;
  return `${Math.abs(pct)} % ${inMoney ? 'ITM' : 'OTM'}`;
}

export function suggestOptionsscheine(input: SuggestInput): OptionsscheinSuggestion[] {
  if (!Number.isFinite(input.underlyingPrice) || input.underlyingPrice <= 0) return [];
  if (!input.underlyingName.trim()) return [];

  const direction: 'call' | 'put' = input.direction ?? 'call';
  const assetClass = input.assetClass ?? 'aktie';
  const today = input.today ?? new Date();

  return PROFILES.map((profile) => {
    // Bei Put invertieren wir den Moneyness-Faktor (Put profitiert, wenn
    // Kurs FAELLT, also liegt ITM-Put ueber dem Kurs).
    const rawFactor = direction === 'call' ? profile.moneynessFactor : 2 - profile.moneynessFactor;
    const rawStrike = input.underlyingPrice * rawFactor;
    const strike = roundStrike(rawStrike, assetClass);
    const expiryDate = addMonths(today, profile.monthsToExpiry);
    const expiryIso = fmtIsoDate(expiryDate);

    const analysis = analyzeOptionsscheinInput({
      underlyingName: input.underlyingName,
      underlyingPrice: input.underlyingPrice,
      strike,
      direction,
      expiryIso,
      ratio: assetClass === 'krypto' ? 100 : 10,
      sigma: input.sigma
    });

    if (!analysis) return null;

    return {
      risk: profile.risk,
      direction,
      strike,
      expiryIso,
      monthsToExpiry: profile.monthsToExpiry,
      moneynessLabel: moneynessLabel(direction, profile.moneynessFactor),
      analysis,
      rationale: profile.rationale
    } satisfies OptionsscheinSuggestion;
  }).filter((x): x is OptionsscheinSuggestion => x !== null);
}

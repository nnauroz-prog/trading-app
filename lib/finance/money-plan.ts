import { WORLD_EQUITY_FUND } from '@/lib/finance/investment-product';

/** Transparent planning rules, not market forecasts or automated orders. */
export type MoneyRiskLevel = 'conservative' | 'balanced' | 'growth';
export interface QuickMoneyPlanInput {
  amount?: number | null;
  horizonYears?: number | null;
  riskLevel?: MoneyRiskLevel;
  reserveReady?: boolean;
  debtFree?: boolean;
}
export interface MoneyAgentResult {
  id: 'reserve' | 'debt' | 'horizon' | 'risk' | 'allocation';
  name: string;
  status: 'ready' | 'attention' | 'missing';
  finding: string;
}
export interface MoneyAllocation {
  id: 'cash' | 'diversified' | 'learning';
  label: string;
  amount: number;
  percentage: number;
  explanation: string;
}
export interface MoneyPlan {
  status: 'missing' | 'attention' | 'ready';
  title: string;
  nextStep: string;
  amount: number | null;
  agents: MoneyAgentResult[];
  allocations: MoneyAllocation[];
  errors: string[];
  assumptions: string[];
}
export const MONEY_PLAN_STORAGE_KEY = 'trading-app.money-plan-v1';
export const MONEY_PLAN_CHANGED_EVENT = 'trading-app:money-plan-changed';
const euro = (amount: number) => amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
const risks: MoneyRiskLevel[] = ['conservative', 'balanced', 'growth'];

export function evaluateQuickMoneyPlan(input: QuickMoneyPlanInput): MoneyPlan {
  const errors: string[] = [];
  const validAmount = typeof input.amount === 'number' && Number.isFinite(input.amount) && input.amount >= 1 && input.amount <= 100_000_000 && Math.abs(input.amount * 100 - Math.round(input.amount * 100)) < 0.000001;
  if (!validAmount) errors.push('Gib einen Betrag zwischen 1 € und 100 Millionen € ein.');
  const validHorizon = typeof input.horizonYears === 'number' && Number.isFinite(input.horizonYears) && input.horizonYears > 0 && input.horizonYears <= 50;
  if (!validHorizon) errors.push('Wähle, wann du das Geld wieder brauchst.');
  const validRisk = risks.includes(input.riskLevel as MoneyRiskLevel);
  if (!validRisk) errors.push('Wähle, womit du dich wohlfühlst.');
  const amount = validAmount ? Math.round(input.amount! * 100) / 100 : null;
  const safetyReady = input.reserveReady === true && input.debtFree === true;
  const agents: MoneyAgentResult[] = [
    { id: 'reserve', name: 'Puffer-Check', status: input.reserveReady === true ? 'ready' : 'attention', finding: input.reserveReady === true ? 'Du hast bestätigt: Dein Notgroschen ist getrennt von diesem Betrag.' : 'Eine verfügbare Rücklage für unerwartete Ausgaben geht vor. Wie hoch sie sein sollte, hängt von deinen laufenden Kosten ab.' },
    { id: 'debt', name: 'Schulden-Check', status: input.debtFree === true ? 'ready' : 'attention', finding: input.debtFree === true ? 'Du hast bestätigt: Dieser Betrag wird nicht für teure Schulden oder Rechnungen gebraucht.' : 'Prüfe zuerst offene Rechnungen und teure Schulden. Deren Kosten sind bekannt; eine Anlagerendite ist ungewiss.' },
    { id: 'horizon', name: 'Ziel-Check', status: validHorizon ? 'ready' : 'missing', finding: !validHorizon ? 'Dein Zeitraum fehlt noch.' : input.horizonYears! < WORLD_EQUITY_FUND.minimumYears ? 'Du brauchst das Geld bald. Schwankende Anlagen passen dafür nicht in diesen Plan.' : `Du planst mit ${input.horizonYears} Jahren. Auch über mehrere Jahre bleiben Kursverluste möglich.` },
    { id: 'risk', name: 'Risiko-Check', status: validRisk ? 'ready' : 'missing', finding: !validRisk ? 'Dein Wohlfühl-Profil fehlt noch.' : input.riskLevel === 'conservative' ? 'Mehr Liquidität, weniger Schwankung. Auch ein ruhiger Plan ist nicht vor Kaufkraftverlust geschützt.' : input.riskLevel === 'balanced' ? 'Eine Mischung aus verfügbarem Geld und breit gestreuten Anlagen. Der Anlageteil kann deutlich schwanken.' : 'Ein höherer Anlageteil passt nur, wenn du zwischenzeitliche Verluste aushalten kannst. Das optionale Lernbudget bleibt auf 5 % begrenzt.' },
    { id: 'allocation', name: 'Plan-Check', status: errors.length ? 'missing' : safetyReady ? 'ready' : 'attention', finding: errors.length ? 'Erst deine Angaben ergänzen, dann rechnen wir.' : safetyReady ? `${euro(amount!)} werden vollständig aufgeteilt – ohne zusätzliches Geld oder erwartete Gewinne einzuplanen.` : 'Solange der Sicherheits-Check offen ist, wird kein Anlagebetrag freigegeben.' }
  ];
  const assumptions = [
    'Der Betrag ist einmalig, in Euro und nach deinen Angaben frei verfügbar. Einkommen und bestehendes Vermögen wurden nicht geprüft.',
    'Die Aufteilung folgt festen Orientierungsregeln, keiner Renditeprognose. Steuern, Gebühren und individuelle Anlageprodukte sind nicht berechnet.',
    'Breit gestreut bedeutet mehrere Märkte und Unternehmen statt eines einzelnen Werts. Geld, das bald gebraucht wird, bleibt liquide.',
    'Ein Lernbudget ist optional. Es ist kein aktuelles Kauf-Signal und darf bis zum Totalverlust verloren gehen; ohne geeignetes Signal bleibt es verfügbar.'
  ];
  if (errors.length) return { status: 'missing', title: 'Noch eine Angabe fehlt.', nextStep: 'Ergänze deine Angaben. Danach siehst du die Aufteilung.', amount, agents, allocations: [], errors, assumptions };
  if (!safetyReady) return { status: 'attention', title: input.reserveReady === true ? 'Kläre zuerst deine teuren Schulden.' : 'Lege zuerst Geld für Notfälle zurück.', nextStep: `Lass die ${euro(amount!)} vorerst auf einem Konto, an das du schnell herankommst. Bezahle offene Rechnungen, kümmere dich um teure Schulden und lege Geld für Notfälle zurück. Verteile danach nur das Geld, das übrig bleibt.`, amount, agents, allocations: [], errors: [], assumptions };

  const years = input.horizonYears!;
  let diversified = 0;
  let learning = 0;
  if (years >= WORLD_EQUITY_FUND.minimumYears) {
    diversified = years < 8
      ? { conservative: 30, balanced: 50, growth: 65 }[input.riskLevel!]
      : { conservative: 40, balanced: 65, growth: 80 }[input.riskLevel!];
    if (years >= 5 && input.riskLevel === 'growth') learning = 5;
  }
  const cents = Math.round(amount! * 100);
  const investmentCents = Math.floor(cents * diversified / 100);
  const learningCents = Math.floor(cents * learning / 100);
  const cashCents = cents - investmentCents - learningCents;
  const allocations: MoneyAllocation[] = [
    { id: 'cash', label: 'Auf dem Konto lassen', amount: cashCents / 100, percentage: 100 - diversified - learning, explanation: years < WORLD_EQUITY_FUND.minimumYears ? 'Du brauchst das Geld bald. Vergleiche Konten, bei denen du schnell an dein Geld kommst.' : 'Diesen Teil kannst du verfügbar halten. Vergleiche Zinsen und prüfe, wie schnell du an dein Geld kommst.' },
    ...(investmentCents > 0 ? [{ id: 'diversified' as const, label: 'Für später anlegen', amount: investmentCents / 100, percentage: diversified, explanation: 'Eine konkrete Möglichkeit: der Vanguard FTSE All-World ETF. Er enthält viele Unternehmen weltweit. In der Kaufanalyse findest du die genaue Kennnummer, Kosten und Risiken.' }] : []),
    ...(learningCents > 0 ? [{ id: 'learning' as const, label: 'Optional: riskante Anlagen', amount: learningCents / 100, percentage: learning, explanation: 'Höchstens dieser Betrag für riskante Ideen wie Krypto. Du kannst ihn vollständig verlieren. Du kannst diesen Teil auch auf dem Konto lassen.' }] : [])
  ];
  return { status: 'ready', title: years < WORLD_EQUITY_FUND.minimumYears ? 'Lass dein Geld für dein Ziel verfügbar.' : 'So kannst du dein Geld aufteilen.', nextStep: years < WORLD_EQUITY_FUND.minimumYears ? `Du brauchst das Geld in den nächsten Jahren. Lass die ${euro(amount!)} auf einem passenden Konto, damit ein Kursverlust deine Pläne nicht verzögert.` : `Die Beträge unten sind ein Vorschlag für dein freies Geld. Du wählst selbst, wo du es lässt oder anlegst.`, amount, agents, allocations, errors: [], assumptions };
}
export const evaluateMoneyPlan = evaluateQuickMoneyPlan;

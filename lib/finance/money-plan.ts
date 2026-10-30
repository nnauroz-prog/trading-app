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
    { id: 'horizon', name: 'Ziel-Check', status: validHorizon ? 'ready' : 'missing', finding: !validHorizon ? 'Dein Zeitraum fehlt noch.' : input.horizonYears! <= 3 ? 'Du brauchst das Geld bald. Schwankende Anlagen passen dafür nicht in diesen Plan.' : `Du planst mit ${input.horizonYears} Jahren. Auch über mehrere Jahre bleiben Kursverluste möglich.` },
    { id: 'risk', name: 'Risiko-Check', status: validRisk ? 'ready' : 'missing', finding: !validRisk ? 'Dein Wohlfühl-Profil fehlt noch.' : input.riskLevel === 'conservative' ? 'Mehr Liquidität, weniger Schwankung. Auch ein ruhiger Plan ist nicht vor Kaufkraftverlust geschützt.' : input.riskLevel === 'balanced' ? 'Eine Mischung aus verfügbarem Geld und breit gestreuten Anlagen. Der Anlageteil kann deutlich schwanken.' : 'Ein höherer Anlageteil passt nur, wenn du zwischenzeitliche Verluste aushalten kannst. Das optionale Lernbudget bleibt auf 5 % begrenzt.' },
    { id: 'allocation', name: 'Plan-Check', status: errors.length ? 'missing' : safetyReady ? 'ready' : 'attention', finding: errors.length ? 'Erst deine Angaben ergänzen, dann rechnen wir.' : safetyReady ? `${euro(amount!)} werden vollständig aufgeteilt – ohne zusätzliches Geld oder erwartete Gewinne einzuplanen.` : 'Solange der Sicherheits-Check offen ist, wird kein Anlagebetrag freigegeben.' }
  ];
  const assumptions = [
    'Der Betrag ist einmalig, in Euro und nach deinen Angaben frei verfügbar. Einkommen und bestehendes Vermögen wurden nicht geprüft.',
    'Die Aufteilung folgt festen Orientierungsregeln, keiner Renditeprognose. Steuern, Gebühren und individuelle Anlageprodukte sind nicht berechnet.',
    'Breit gestreut bedeutet mehrere Märkte und Unternehmen statt eines einzelnen Werts. Geld, das bald gebraucht wird, bleibt liquide.',
    'Ein Lernbudget ist optional. Es ist kein aktuelles Kauf-Signal und darf bis zum Totalverlust verloren gehen; ohne geeignetes Signal bleibt es verfügbar.'
  ];
  if (errors.length) return { status: 'missing', title: 'Dein Plan wartet auf dich.', nextStep: 'Ergänze kurz deine Angaben, dann können deine Helfer rechnen.', amount, agents, allocations: [], errors, assumptions };
  if (!safetyReady) return { status: 'attention', title: input.reserveReady === true ? 'Dein erster Schritt: teure Schulden klären.' : 'Dein erster Schritt: den Puffer sichern.', nextStep: `Halte die ${euro(amount!)} vorerst verfügbar. Kläre zuerst Rücklage, Rechnungen und teure Schulden – erst der danach freie Betrag gehört in einen Anlageplan.`, amount, agents, allocations: [], errors: [], assumptions };

  const years = input.horizonYears!;
  let diversified = 0;
  let learning = 0;
  if (years > 3) {
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
    { id: 'cash', label: 'Verfügbar halten', amount: cashCents / 100, percentage: 100 - diversified - learning, explanation: years <= 3 ? 'Für dein nahes Ziel liquide halten. Prüfe Zinsen, Zugang und Konditionen eines passenden Kontos.' : 'Der flexible Teil deines Plans. Er steht für absehbare Ausgaben und als Ruhepol bereit.' },
    ...(investmentCents > 0 ? [{ id: 'diversified' as const, label: 'Breit gestreut anlegen', amount: investmentCents / 100, percentage: diversified, explanation: 'Als Ausgangspunkt für die Auswahl breit gestreuter, kostengünstiger Anlagen. Prüfe Produkte, Kosten und Verlustrisiko vor dem Kauf.' }] : []),
    ...(learningCents > 0 ? [{ id: 'learning' as const, label: 'Optionales Lernbudget', amount: learningCents / 100, percentage: learning, explanation: 'Höchstens dieser Betrag für spekulative Ideen wie Krypto. Nicht einsetzen, wenn du das Risiko nicht tragen möchtest oder kein geeignetes Signal vorliegt.' }] : [])
  ];
  return { status: 'ready', title: years <= 3 ? 'Dein Ziel braucht Bewegungsfreiheit.' : 'Dein Geld bekommt einen klaren Platz.', nextStep: years <= 3 ? `Halte die ${euro(amount!)} für dein Ziel verfügbar. Du musst dafür kein Marktrisiko eingehen.` : `Starte mit der Aufteilung unten. Wähle passende Produkte in Ruhe; die App führt keine Käufe aus.`, amount, agents, allocations, errors: [], assumptions };
}
export const evaluateMoneyPlan = evaluateQuickMoneyPlan;

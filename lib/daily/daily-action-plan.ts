// Generiert den ehrlichen Tagesplan aus dem Markt-Modus. Reine Funktion —
// keine Garantien, keine Marketing-Sprache. Wenn unklar: stop, nicht handeln.

import type { MarketMode, ModeAssessment } from '@/lib/daily/daily-decision-engine';

export interface ActionPlanLine {
  id: string;
  headline: string;
  detail: string;
}

export interface ActionPlan {
  mode: MarketMode;
  intro: string;
  lines: ActionPlanLine[];
  residualRisk: string;
}

const RESIDUAL_RISK =
  'Modell-Hinweise, keine Garantien. Märkte können jederzeit drehen. Nie mehr riskieren als du verlieren kannst, und den Stop immer setzen.';

const BASE_LINES: ActionPlanLine[] = [
  {
    id: 'multi-system',
    headline: 'Nur handeln, wenn mehrere Systeme übereinstimmen.',
    detail: 'Ein gutes Signal kommt selten alleine. Wenn nur ein Filter grün ist, lieber abwarten.'
  },
  {
    id: 'always-stop',
    headline: 'Kein Trade ohne Stop.',
    detail: 'Vor dem Klick: Wo steige ich aus, wenn es schief geht? Standard: 2×ATR Abstand zum Einstieg.'
  },
  {
    id: 'cap-risk',
    headline: 'Maximalrisiko pro Idee klar begrenzen.',
    detail: 'Faustregel: 1–2 % vom Konto pro Trade. 10 Verluste in Folge dürfen nicht das Konto zerstören.'
  },
  {
    id: 'no-data-no-action',
    headline: 'Keine Aktion bei fehlenden Daten.',
    detail: 'Wenn API/Quote/History fehlt, lieber stoppen. Eine fundierte Entscheidung braucht eine fundierte Datenbasis.'
  }
];

export function buildActionPlan(assessment: ModeAssessment): ActionPlan {
  const mode = assessment.mode;
  let intro: string;
  if (mode === 'OFFENSIV') {
    intro = 'Heute kann mehr gehen — aber nicht jeder Wert ist offen. Konzentrier dich auf die stärksten Konsens-Setups.';
  } else if (mode === 'SELEKTIV') {
    intro = 'Gemischtes Bild. Nur Setups nehmen, bei denen Sicherheits-Gate UND Vorstand UND ggf. Sport-Engine übereinstimmen.';
  } else if (mode === 'DEFENSIV') {
    intro = 'Wenige saubere Setups, Vorstände mehrheitlich vorsichtig. Risiko klein halten oder Cash. Kein erzwungener Trade.';
  } else {
    intro = 'Kein Tagesentscheid möglich. Cash bleibt eine valide Position, bis die Datenbasis wieder steht.';
  }

  const lines: ActionPlanLine[] = [...BASE_LINES];

  // Modus-spezifische Ergänzungen — knappe, konkrete Regeln.
  if (mode === 'OFFENSIV') {
    lines.unshift({
      id: 'pick-best',
      headline: 'Top-Konsens nehmen, nicht hinterherjagen.',
      detail: 'Im OFFENSIV-Modus heißt nicht „alles kaufen". Die Top-5-Tageschancen sind dein Filter — der Rest bleibt.'
    });
  } else if (mode === 'DEFENSIV') {
    lines.unshift({
      id: 'cash-is-position',
      headline: 'Cash ist eine Position.',
      detail: 'Wenn 60 % der Persönlichkeiten warten und nichts Grade A ist, gibt es heute schlicht keinen Trade. Das ist OK.'
    });
  } else if (mode === 'CASH') {
    lines.unshift({
      id: 'wait-for-data',
      headline: 'Erst Daten, dann Entscheidung.',
      detail: 'Solange Quellen ausfallen, wird nicht entschieden. Spätere Aktualisierung abwarten.'
    });
  }

  return {
    mode,
    intro,
    lines,
    residualRisk: RESIDUAL_RISK
  };
}

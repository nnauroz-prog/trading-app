// Vergleicht die heutigen Verdicts der drei Firmen und liefert eine ehrliche
// Antwort auf „Wer ist sich einig, wer geht anders?". Pure Funktion, keine I/O.

import type { AgentVerdict, PersonaId } from '@/lib/agents/personas';

export interface FirmaDiff {
  // Alle drei sagen das Gleiche?
  unanimous: boolean;
  // Welches Verdict ist die Mehrheit?
  majorityVerdict: 'BUY' | 'WAIT' | null;
  // Wer weicht ab? (Wenn 2:1)
  dissentingFirma: PersonaId | null;
  // Konkrete Beobachtung als Text.
  observation: string;
  // Wenn unterschiedliche Targets gewählt wurden: welche?
  targetsByFirma: Record<PersonaId, string | null>;
  uniqueTargets: number;
}

const FIRMA_LABEL: Record<PersonaId, string> = {
  conservative: 'Konservativ',
  balanced: 'Balanciert',
  aggressive: 'Aggressiv'
};

export function compareFirmaVerdicts(verdicts: AgentVerdict[]): FirmaDiff {
  if (verdicts.length === 0) {
    return {
      unanimous: false,
      majorityVerdict: null,
      dissentingFirma: null,
      observation: 'Keine Firmen-Verdicts vorhanden.',
      targetsByFirma: { conservative: null, balanced: null, aggressive: null },
      uniqueTargets: 0
    };
  }
  const buys = verdicts.filter((v) => v.verdict === 'BUY');
  const waits = verdicts.filter((v) => v.verdict === 'WAIT');
  const unanimous = buys.length === verdicts.length || waits.length === verdicts.length;
  const majorityVerdict: FirmaDiff['majorityVerdict'] = buys.length > waits.length
    ? 'BUY'
    : waits.length > buys.length
      ? 'WAIT'
      : null;

  let dissentingFirma: PersonaId | null = null;
  if (!unanimous) {
    const minority = buys.length < waits.length ? buys : waits;
    if (minority.length === 1) {
      dissentingFirma = minority[0].persona;
    }
  }

  const targetsByFirma: Record<PersonaId, string | null> = {
    conservative: null, balanced: null, aggressive: null
  };
  for (const v of verdicts) {
    targetsByFirma[v.persona] = v.target?.symbol ?? null;
  }
  const uniqueTargets = new Set(verdicts.map((v) => v.target?.symbol).filter((s): s is string => !!s)).size;

  let observation: string;
  if (unanimous && majorityVerdict === 'BUY') {
    const symbols = verdicts.map((v) => v.target?.symbol).filter((s): s is string => !!s);
    const allSame = new Set(symbols).size === 1;
    observation = allSame
      ? `Volle Einstimmigkeit: alle drei Firmen kaufen ${symbols[0]}. Sehr selten — die Markt-Struktur ist eindeutig.`
      : `Einstimmig KAUFEN, aber unterschiedliche Coins: ${verdicts.map((v) => `${FIRMA_LABEL[v.persona]}→${v.target?.symbol ?? '—'}`).join(' · ')}.`;
  } else if (unanimous && majorityVerdict === 'WAIT') {
    observation = 'Alle drei Firmen warten heute. Kein Trade-Tag — Cash ist eine Position.';
  } else if (dissentingFirma !== null) {
    const direction = majorityVerdict === 'BUY' ? 'wartet' : 'kauft';
    observation = `2 von 3 Firmen ${majorityVerdict === 'BUY' ? 'kaufen' : 'warten'}, ${FIRMA_LABEL[dissentingFirma]} ${direction}.`;
  } else {
    observation = 'Gemischtes Bild — die Firmen sind sich nicht einig.';
  }

  return { unanimous, majorityVerdict, dissentingFirma, observation, targetsByFirma, uniqueTargets };
}

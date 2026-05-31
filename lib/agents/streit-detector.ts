import { VorstandSnapshot } from '@/lib/agents/vorstand-memory';

export type StreitPhase = 'konsens' | 'streit' | 'lange_pause' | 'unklar';

export interface StreitReport {
  phase: StreitPhase;
  consecutiveDays: number;
  message: string;
}

// Looks at the last N days of vorstand decisions and labels the phase.
// "streit" = ≥3 days WATCHLIST in a row (firms can't agree).
// "lange_pause" = ≥5 days CASH_HALTEN in a row (market just isn't offering).
// "konsens" = ≥3 days KLARER_KAUF / KAUFEN_VORSICHTIG in a row.
export function detectStreitPhase(log: VorstandSnapshot[]): StreitReport {
  if (log.length === 0) return { phase: 'unklar', consecutiveDays: 0, message: 'Noch keine Daten.' };
  const sorted = [...log].sort((a, b) => a.date.localeCompare(b.date));
  const last = sorted[sorted.length - 1];

  let count = 1;
  for (let i = sorted.length - 2; i >= 0; i--) {
    const prev = sorted[i];
    if (last.verdict === 'WATCHLIST' && prev.verdict === 'WATCHLIST') count++;
    else if (last.verdict === 'CASH_HALTEN' && prev.verdict === 'CASH_HALTEN') count++;
    else if ((last.verdict === 'KLARER_KAUF' || last.verdict === 'KAUFEN_VORSICHTIG') &&
             (prev.verdict === 'KLARER_KAUF' || prev.verdict === 'KAUFEN_VORSICHTIG')) count++;
    else break;
  }

  if (last.verdict === 'WATCHLIST' && count >= 3) {
    return {
      phase: 'streit',
      consecutiveDays: count,
      message: `Der Vorstand kommt seit ${count} Tagen zu keinem Konsens — Firmen wollen unterschiedliche Coins. Der Markt ist gerade strittig, Cash bleiben ist der ehrlichste Trade.`
    };
  }
  if (last.verdict === 'CASH_HALTEN' && count >= 5) {
    return {
      phase: 'lange_pause',
      consecutiveDays: count,
      message: `${count} Tage in Folge ohne Kauf-Empfehlung. Lange Trockenphase ist normal in Übergangs-Märkten — Disziplin bleibt diszipliniert.`
    };
  }
  if ((last.verdict === 'KLARER_KAUF' || last.verdict === 'KAUFEN_VORSICHTIG') && count >= 3) {
    return {
      phase: 'konsens',
      consecutiveDays: count,
      message: `${count} Tage in Folge mit Kauf-Konsens des Vorstands. Solche Phasen sind selten und meist die produktivsten — aber Stops bleiben Stops.`
    };
  }
  return {
    phase: 'unklar',
    consecutiveDays: count,
    message: 'Aktuell kein erkennbares Streit- oder Konsens-Muster.'
  };
}

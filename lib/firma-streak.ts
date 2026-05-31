import { FirmaDecision } from '@/lib/firma-memory';
import { PersonaId } from '@/lib/agents/personas';

export interface ConvictionStreak {
  firma: PersonaId;
  firmaName: string;
  coin: string;
  daysInRow: number;
}

// Looks at the recent diary entries per firma and returns any current BUY-streak
// on a single coin. "Current" means today's entry is BUY and the entry chain
// reaches back N consecutive days on the same coin.
export function detectConvictionStreaks(log: FirmaDecision[]): ConvictionStreak[] {
  if (log.length === 0) return [];
  // Group by firma, ordered by date ascending (memory store is sorted that way).
  const byFirma = new Map<PersonaId, FirmaDecision[]>();
  for (const entry of log) {
    if (!byFirma.has(entry.firma)) byFirma.set(entry.firma, []);
    byFirma.get(entry.firma)!.push(entry);
  }
  const streaks: ConvictionStreak[] = [];
  for (const [firma, entries] of byFirma.entries()) {
    if (entries.length === 0) continue;
    const last = entries[entries.length - 1];
    if (last.verdict !== 'BUY' || !last.coin) continue;
    let count = 1;
    for (let i = entries.length - 2; i >= 0; i--) {
      const e = entries[i];
      if (e.verdict === 'BUY' && e.coin === last.coin) count++;
      else break;
    }
    if (count >= 2) {
      streaks.push({
        firma,
        firmaName: last.firmaName,
        coin: last.coin,
        daysInRow: count
      });
    }
  }
  // Most convincing first.
  streaks.sort((a, b) => b.daysInRow - a.daysInRow);
  return streaks;
}

export interface ConvictionSummary {
  topStreak: ConvictionStreak | null;
  // Highest-conviction case: a coin where ≥ 2 firmas have BUY-streaks ≥ 2 days.
  agreedCoin: { coin: string; firmas: PersonaId[]; minDaysInRow: number } | null;
}

export function summarizeConviction(streaks: ConvictionStreak[]): ConvictionSummary {
  if (streaks.length === 0) return { topStreak: null, agreedCoin: null };
  const byCoin = new Map<string, ConvictionStreak[]>();
  for (const s of streaks) {
    if (!byCoin.has(s.coin)) byCoin.set(s.coin, []);
    byCoin.get(s.coin)!.push(s);
  }
  let best: ConvictionSummary['agreedCoin'] = null;
  for (const [coin, list] of byCoin.entries()) {
    if (list.length >= 2) {
      const min = Math.min(...list.map((l) => l.daysInRow));
      if (!best || min > best.minDaysInRow || (min === best.minDaysInRow && list.length > best.firmas.length)) {
        best = { coin, firmas: list.map((l) => l.firma), minDaysInRow: min };
      }
    }
  }
  return { topStreak: streaks[0], agreedCoin: best };
}

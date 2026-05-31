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

export interface TargetPersistence {
  coin: string;
  daysOnList: number; // consecutive days (up to today) the coin appeared as ANY firma's target
  avgPassedCount: number; // average Häkchen across those appearances
  firmasInvolved: PersonaId[]; // distinct firmas that named this coin in the streak
}

// Looks at the diary and reports coins that have been a *target* (recommended
// pick) of at least one firma for ≥ 2 consecutive days — even if the verdict
// was WAIT. Persistence on the candidate list is one of the strongest quality
// signals a discretionary trader uses: a one-off setup is noise, a setup that
// keeps showing up is structural.
export function detectTargetPersistence(log: FirmaDecision[]): TargetPersistence[] {
  if (log.length === 0) return [];

  // Group by date, then per-date collect the set of (firma, coin, passedCount).
  const byDate = new Map<string, FirmaDecision[]>();
  for (const e of log) {
    if (!byDate.has(e.date)) byDate.set(e.date, []);
    byDate.get(e.date)!.push(e);
  }
  const sortedDates = Array.from(byDate.keys()).sort();
  if (sortedDates.length === 0) return [];

  // Walk backwards from the most recent date, tracking which coins remain
  // present on consecutive days.
  const lastDate = sortedDates[sortedDates.length - 1];
  const todayEntries = byDate.get(lastDate)!.filter((e) => e.coin);
  if (todayEntries.length === 0) return [];

  const todayCoins = new Set(todayEntries.map((e) => e.coin as string));
  const counters = new Map<string, { days: number; passedSum: number; passedCount: number; firmas: Set<PersonaId> }>();
  for (const e of todayEntries) {
    if (!e.coin) continue;
    if (!counters.has(e.coin)) counters.set(e.coin, { days: 0, passedSum: 0, passedCount: 0, firmas: new Set() });
    const c = counters.get(e.coin)!;
    c.firmas.add(e.firma);
    if (e.passedCount !== null) {
      c.passedSum += e.passedCount;
      c.passedCount++;
    }
  }
  // Today counts as day 1; walk back.
  for (const coin of todayCoins) counters.get(coin)!.days = 1;

  for (let i = sortedDates.length - 2; i >= 0; i--) {
    const dayEntries = byDate.get(sortedDates[i])!.filter((e) => e.coin);
    const dayCoins = new Set(dayEntries.map((e) => e.coin as string));
    let anyExtended = false;
    for (const coin of todayCoins) {
      if (!dayCoins.has(coin)) continue;
      const c = counters.get(coin)!;
      // Only extend if the previous run was unbroken (i.e. days === sortedDates.length - 1 - i)
      if (c.days !== sortedDates.length - 1 - i) continue;
      c.days = sortedDates.length - i;
      anyExtended = true;
      for (const e of dayEntries) {
        if (e.coin !== coin) continue;
        c.firmas.add(e.firma);
        if (e.passedCount !== null) {
          c.passedSum += e.passedCount;
          c.passedCount++;
        }
      }
    }
    if (!anyExtended) break; // no streak can extend further
  }

  const out: TargetPersistence[] = [];
  for (const [coin, c] of counters.entries()) {
    if (c.days < 2) continue;
    out.push({
      coin,
      daysOnList: c.days,
      avgPassedCount: c.passedCount > 0 ? Math.round((c.passedSum / c.passedCount) * 10) / 10 : 0,
      firmasInvolved: Array.from(c.firmas)
    });
  }
  out.sort((a, b) => b.daysOnList - a.daysOnList || b.avgPassedCount - a.avgPassedCount);
  return out;
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

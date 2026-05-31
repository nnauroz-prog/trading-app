import { FirmaDecision } from '@/lib/firma-memory';
import { PersonaId } from '@/lib/agents/personas';

export interface KonsensStreak {
  coin: string;
  daysInRow: number;
  firmas: PersonaId[];
  buyShare: number; // share of those days that were actual BUYs (0..1)
  todayConsensus: boolean; // does the streak include today?
}

// Detects coins where multiple firms have been targeting the same coin
// (BUY OR WAIT but with the coin as target) for several consecutive days.
// A coin is in "konsens-streak" if ≥ 2 firms named it on the same days,
// for ≥ 2 consecutive days, ending today.
export function detectKonsensStreaks(log: FirmaDecision[]): KonsensStreak[] {
  if (log.length === 0) return [];
  const byDate = new Map<string, FirmaDecision[]>();
  for (const e of log) {
    if (!byDate.has(e.date)) byDate.set(e.date, []);
    byDate.get(e.date)!.push(e);
  }
  const sortedDates = Array.from(byDate.keys()).sort();
  if (sortedDates.length === 0) return [];
  const today = sortedDates[sortedDates.length - 1];
  const todayEntries = byDate.get(today)!;

  // Which coins today have ≥ 2 firms?
  const todayCoinCount = new Map<string, FirmaDecision[]>();
  for (const e of todayEntries) {
    if (!e.coin) continue;
    if (!todayCoinCount.has(e.coin)) todayCoinCount.set(e.coin, []);
    todayCoinCount.get(e.coin)!.push(e);
  }
  const candidateCoins = Array.from(todayCoinCount.entries()).filter(([, vs]) => vs.length >= 2).map(([c]) => c);

  const out: KonsensStreak[] = [];
  for (const coin of candidateCoins) {
    let days = 1;
    let totalEntries = todayCoinCount.get(coin)!.length;
    let buys = todayCoinCount.get(coin)!.filter((e) => e.verdict === 'BUY').length;
    const firmaSet = new Set<PersonaId>(todayCoinCount.get(coin)!.map((e) => e.firma));

    for (let i = sortedDates.length - 2; i >= 0; i--) {
      const dayEntries = byDate.get(sortedDates[i])!;
      const dayCoinFirmas = dayEntries.filter((e) => e.coin === coin);
      if (dayCoinFirmas.length < 2) break;
      days++;
      totalEntries += dayCoinFirmas.length;
      buys += dayCoinFirmas.filter((e) => e.verdict === 'BUY').length;
      for (const e of dayCoinFirmas) firmaSet.add(e.firma);
    }

    if (days >= 2) {
      out.push({
        coin,
        daysInRow: days,
        firmas: Array.from(firmaSet),
        buyShare: totalEntries > 0 ? buys / totalEntries : 0,
        todayConsensus: true
      });
    }
  }
  out.sort((a, b) => b.daysInRow - a.daysInRow || b.firmas.length - a.firmas.length);
  return out;
}

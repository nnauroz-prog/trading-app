import { FirmaDecision } from '@/lib/firma-memory';
import { PersonaId } from '@/lib/agents/personas';

// We don't have per-firma BTC-price snapshots like /intel does. Instead,
// we evaluate firma accuracy by reusing the intel-memory's BTC reference:
// for each firma decision day, find the BTC price recorded that day and
// the next-day price, then check whether the decision aligned with the
// actual move.

interface PriceFetcher {
  priceFor(date: string): number | null;
}

const DIRECTION_THRESHOLD = 0.5;

export interface FirmaAccuracy {
  firma: PersonaId;
  firmaName: string;
  evaluated: number;
  rightCalls: number;
  hitRatePct: number | null;
  avgGapDays: number; // average lag between recommendation and check
}

// A BUY decision is "right" if the named coin moved up ≥ 0.5% the next day.
// A WAIT decision is "right" if the broader market (BTC proxy) did NOT move
// up substantially — i.e. the firma correctly avoided a missed opportunity
// only if it would have been a flat or down day.
export function computeFirmaAccuracy(log: FirmaDecision[], btcPriceFor: PriceFetcher['priceFor']): FirmaAccuracy[] {
  const byFirma = new Map<PersonaId, FirmaDecision[]>();
  for (const d of log) {
    if (!byFirma.has(d.firma)) byFirma.set(d.firma, []);
    byFirma.get(d.firma)!.push(d);
  }

  const out: FirmaAccuracy[] = [];
  for (const [firma, entries] of byFirma.entries()) {
    let evaluated = 0;
    let right = 0;
    let gapDays = 0;
    const sortedDates = entries.map((e) => e.date).sort();

    for (const e of entries) {
      const todayPrice = btcPriceFor(e.date);
      if (todayPrice === null) continue;
      // Find next entry by date.
      const nextDate = sortedDates.find((d) => d > e.date);
      if (!nextDate) continue;
      const nextPrice = btcPriceFor(nextDate);
      if (nextPrice === null) continue;
      const movePct = ((nextPrice - todayPrice) / todayPrice) * 100;
      const wentUp = movePct >= DIRECTION_THRESHOLD;
      const wentDown = movePct <= -DIRECTION_THRESHOLD;
      const isRight = e.verdict === 'BUY' ? wentUp : (wentDown || (!wentUp && !wentDown));
      evaluated++;
      if (isRight) right++;
      // Compute gap days
      const a = new Date(e.date + 'T12:00:00');
      const b = new Date(nextDate + 'T12:00:00');
      gapDays += Math.max(1, Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)));
    }

    out.push({
      firma,
      firmaName: entries[0]?.firmaName ?? firma,
      evaluated,
      rightCalls: right,
      hitRatePct: evaluated > 0 ? Math.round((right / evaluated) * 100) : null,
      avgGapDays: evaluated > 0 ? Math.round((gapDays / evaluated) * 10) / 10 : 0
    });
  }

  const order: PersonaId[] = ['conservative', 'balanced', 'aggressive'];
  out.sort((a, b) => order.indexOf(a.firma) - order.indexOf(b.firma));
  return out;
}

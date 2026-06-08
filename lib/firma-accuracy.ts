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
  // 0.1..2.0 — Multiplikator für vorstandMediation. Neutral 1.0 bei 50 %
  // Hit-Rate; 70 % → 1.8×, 30 % → 0.2×. Bei zu wenig Daten neutral.
  skillWeight: number;
  // Neueste 10 Entscheidungen (neueste zuerst) für UI-Streak-Anzeige.
  recent: { date: string; verdict: 'BUY' | 'WAIT'; coin: string | null; right: boolean | null }[];
}

// Mindestanzahl bewerteter Entscheidungen, ab der das skillWeight wirklich
// in Konsens-Berechnungen einfließen soll. Vorher → neutral 1.0.
export const MIN_EVAL_FOR_SKILL = 5;

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
    const recent: FirmaAccuracy['recent'] = [];

    for (const e of entries) {
      const todayPrice = btcPriceFor(e.date);
      const nextDate = sortedDates.find((d) => d > e.date);
      let isRight: boolean | null = null;
      if (todayPrice !== null && nextDate) {
        const nextPrice = btcPriceFor(nextDate);
        if (nextPrice !== null) {
          const movePct = ((nextPrice - todayPrice) / todayPrice) * 100;
          const wentUp = movePct >= DIRECTION_THRESHOLD;
          const wentDown = movePct <= -DIRECTION_THRESHOLD;
          isRight = e.verdict === 'BUY' ? wentUp : (wentDown || (!wentUp && !wentDown));
          evaluated++;
          if (isRight) right++;
          const a = new Date(e.date + 'T12:00:00');
          const b = new Date(nextDate + 'T12:00:00');
          gapDays += Math.max(1, Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)));
        }
      }
      recent.push({ date: e.date, verdict: e.verdict, coin: e.coin, right: isRight });
    }
    recent.sort((a, b) => b.date.localeCompare(a.date));

    const hitRatePct = evaluated > 0 ? Math.round((right / evaluated) * 100) : null;
    // Skill-Multiplier: 50 % neutral 1.0, ±25 % verschiebt um ±1.0. Min 0.1, max 2.0.
    // Bei unter MIN_EVAL_FOR_SKILL bleibt die Firma neutral — wir wollen kein
    // verzerrtes Lern-Signal aus zu wenigen Daten ableiten.
    const skillWeight = (hitRatePct === null || evaluated < MIN_EVAL_FOR_SKILL)
      ? 1
      : Math.max(0.1, Math.min(2.0, 1 + (hitRatePct - 50) / 25));

    out.push({
      firma,
      firmaName: entries[0]?.firmaName ?? firma,
      evaluated,
      rightCalls: right,
      hitRatePct,
      avgGapDays: evaluated > 0 ? Math.round((gapDays / evaluated) * 10) / 10 : 0,
      skillWeight,
      recent: recent.slice(0, 10)
    });
  }

  const order: PersonaId[] = ['conservative', 'balanced', 'aggressive'];
  out.sort((a, b) => order.indexOf(a.firma) - order.indexOf(b.firma));
  return out;
}

// Liefert die für vorstandMediation benötigte Map firma → skillWeight.
// Nur Firmen mit ≥ MIN_EVAL_FOR_SKILL Bewertungen landen drin — sonst gibt es
// kein verlässliches Lern-Signal und der Vorstand soll neutral abstimmen.
export function skillMap(accuracy: FirmaAccuracy[]): Map<PersonaId, number> {
  const m = new Map<PersonaId, number>();
  for (const a of accuracy) {
    if (a.evaluated >= MIN_EVAL_FOR_SKILL) m.set(a.firma, a.skillWeight);
  }
  return m;
}

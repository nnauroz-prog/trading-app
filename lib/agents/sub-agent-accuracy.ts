import { FirmaDecision } from '@/lib/firma-memory';
import { PersonaId } from '@/lib/agents/personas';

type Vote = string;

interface VoteRule {
  role: string;
  // Reads the vote from the FirmaDecision entry.
  getVote: (e: FirmaDecision) => Vote | undefined;
  // For a given vote and the next-day BTC move (in %), is the call "right"?
  // null = skip (no opinion to grade).
  isRight: (vote: Vote, btcMovePct: number) => boolean | null;
}

const DIRECTION_THRESHOLD = 0.5;

// Define what "right" means per sub-agent role. Bullish-leaning votes are
// right when BTC went up, bearish-leaning right when BTC went down, etc.
// Position/liquidity/backtest votes don't predict market direction directly
// so we score them by whether the firma's overall verdict was right that day.
const RULES: VoteRule[] = [
  {
    role: 'analyst',
    getVote: (e) => e.analystVote,
    isRight: (v, m) => {
      if (v === 'POSITIV') return m >= DIRECTION_THRESHOLD;
      if (v === 'NEGATIV') return m <= -DIRECTION_THRESHOLD;
      if (v === 'NEUTRAL') return Math.abs(m) < DIRECTION_THRESHOLD;
      return null;
    }
  },
  {
    role: 'scout',
    getVote: (e) => e.scoutVote,
    isRight: (v, m) => {
      // Scout is bullish-leaning. STARK should be right on up days.
      if (v === 'STARK') return m >= DIRECTION_THRESHOLD;
      if (v === 'SCHWACH') return m < DIRECTION_THRESHOLD;
      return null; // MITTEL skipped
    }
  },
  {
    role: 'risk',
    getVote: (e) => e.riskVote,
    isRight: (v, m) => {
      // Risk OK aligns with up days, VETO aligns with down days.
      if (v === 'OK') return m >= -DIRECTION_THRESHOLD;
      if (v === 'VETO') return m < DIRECTION_THRESHOLD;
      return null;
    }
  },
  {
    role: 'news',
    getVote: (e) => e.newsVote,
    isRight: (v, m) => {
      if (v === 'POSITIV') return m >= DIRECTION_THRESHOLD;
      if (v === 'NEGATIV') return m <= -DIRECTION_THRESHOLD;
      if (v === 'NEUTRAL') return Math.abs(m) < DIRECTION_THRESHOLD;
      return null; // KEINE_DATEN skipped
    }
  },
  {
    role: 'liquidity',
    getVote: (e) => e.liquidityVote,
    isRight: (v, m) => {
      // Liquidity rule: TIEF → market should hold (low downside); DUENN → caution warranted.
      if (v === 'TIEF') return m >= -DIRECTION_THRESHOLD;
      if (v === 'DUENN') return m <= -DIRECTION_THRESHOLD;
      return null;
    }
  },
  {
    role: 'backtest',
    getVote: (e) => e.backtestVote,
    isRight: (v, m) => {
      if (v === 'BESTÄTIGT') return m >= DIRECTION_THRESHOLD;
      if (v === 'WIDERSPRUCH') return m <= -DIRECTION_THRESHOLD;
      return null;
    }
  }
];

export interface SubAgentAccuracyRow {
  firma: PersonaId;
  role: string;
  evaluated: number;
  rightCalls: number;
  hitRatePct: number | null;
}

export function computeSubAgentAccuracy(log: FirmaDecision[], btcPriceFor: (date: string) => number | null): SubAgentAccuracyRow[] {
  const byFirma = new Map<PersonaId, FirmaDecision[]>();
  for (const e of log) {
    if (!byFirma.has(e.firma)) byFirma.set(e.firma, []);
    byFirma.get(e.firma)!.push(e);
  }
  const out: SubAgentAccuracyRow[] = [];
  for (const [firma, entries] of byFirma.entries()) {
    const sortedDates = entries.map((e) => e.date).sort();
    for (const rule of RULES) {
      let evaluated = 0;
      let right = 0;
      for (const e of entries) {
        const todayPrice = btcPriceFor(e.date);
        if (todayPrice === null) continue;
        const nextDate = sortedDates.find((d) => d > e.date);
        if (!nextDate) continue;
        const nextPrice = btcPriceFor(nextDate);
        if (nextPrice === null) continue;
        const movePct = ((nextPrice - todayPrice) / todayPrice) * 100;
        const vote = rule.getVote(e);
        if (vote === undefined || vote === null) continue;
        const verdict = rule.isRight(vote, movePct);
        if (verdict === null) continue;
        evaluated++;
        if (verdict) right++;
      }
      out.push({
        firma,
        role: rule.role,
        evaluated,
        rightCalls: right,
        hitRatePct: evaluated > 0 ? Math.round((right / evaluated) * 100) : null
      });
    }
  }
  return out;
}

import { FirmaDecision } from '@/lib/firma-memory';

export interface LastSafeBuy {
  date: string;
  firmaName: string;
  coin: string | null;
  daysAgo: number;
}

// Finds the most recent Grade-A (maxSafety) signal across all firmas. Pure +
// testable: feeds a today-date in so we can verify "daysAgo" without freezing
// time. Returns null when no Grade A has ever been recorded.
export function findLastSafeBuy(log: FirmaDecision[], todayIso: string): LastSafeBuy | null {
  const aGrade = log.filter((e) => e.safetyGrade === 'A');
  if (aGrade.length === 0) return null;
  aGrade.sort((a, b) => b.date.localeCompare(a.date));
  const latest = aGrade[0];
  const daysAgo = diffDays(latest.date, todayIso);
  return {
    date: latest.date,
    firmaName: latest.firmaName,
    coin: latest.coin,
    daysAgo
  };
}

function diffDays(fromIso: string, toIso: string): number {
  const a = Date.parse(`${fromIso}T00:00:00Z`);
  const b = Date.parse(`${toIso}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

import { unstable_cache } from 'next/cache';
import { getFootballFixtures } from '@/lib/sport/fetcher';
import { backtestEmployees, type EmployeeBacktestStat } from '@/lib/sport/firma/employee-backtest';

async function compute(): Promise<EmployeeBacktestStat[]> {
  const leagues = await getFootballFixtures();
  return backtestEmployees(leagues);
}

// Heavy compute — pro Mitarbeiter pro historischem Spiel pro Liga.
// 24 h Cache reicht, weil sich der Vergangenheits-Pool eh nur einmal am Tag
// vollständig ändert (Saison-Endpoints).
export const getEmployeeBacktest = unstable_cache(compute, ['employee-backtest-v1'], { revalidate: 86400 });

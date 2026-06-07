// Pure Aggregation pro Rohstoff-Gruppe. Analog zur Aktien-Sektor-Summary.

import type { CommoditySafetyEntry } from '@/lib/market/commodity-safety-scan';

export interface GroupRow {
  group: string;
  total: number;
  a: number;
  b: number;
  c: number;
  d: number;
}

export interface HotCommodityGroup {
  group: string;
  gradeACount: number;
  total: number;
  gradeARatio: number;
}

export function summarizeCommodityGroups(entries: CommoditySafetyEntry[]): GroupRow[] {
  const map = new Map<string, GroupRow>();
  for (const e of entries) {
    let row = map.get(e.group);
    if (!row) {
      row = { group: e.group, total: 0, a: 0, b: 0, c: 0, d: 0 };
      map.set(e.group, row);
    }
    row.total++;
    if (e.assessment.grade === 'A') row.a++;
    else if (e.assessment.grade === 'B') row.b++;
    else if (e.assessment.grade === 'C') row.c++;
    else row.d++;
  }
  return [...map.values()].sort((x, y) => {
    if (y.a !== x.a) return y.a - x.a;
    if (y.b !== x.b) return y.b - x.b;
    return x.group.localeCompare(y.group);
  });
}

export function detectHotCommodityGroups(entries: CommoditySafetyEntry[], minRatio = 0.4): HotCommodityGroup[] {
  return summarizeCommodityGroups(entries)
    .filter((r) => r.total > 0 && r.a / r.total >= minRatio)
    .map((r) => ({ group: r.group, gradeACount: r.a, total: r.total, gradeARatio: r.a / r.total }))
    .sort((x, y) => y.gradeARatio - x.gradeARatio);
}

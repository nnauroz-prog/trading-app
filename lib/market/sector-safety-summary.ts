// Pure Aggregation: pro Gruppe (Sektor) Anzahl Aktien je Sicherheits-Grade.
// Extrahiert aus dem UI-Code, damit der Test pure TypeScript bleibt.

import type { StockSafetyEntry } from '@/lib/market/stock-safety-scan';

export interface SectorRow {
  group: string;
  total: number;
  a: number;
  b: number;
  c: number;
  d: number;
}

export function summarizeStockSectors(entries: StockSafetyEntry[]): SectorRow[] {
  const map = new Map<string, SectorRow>();
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

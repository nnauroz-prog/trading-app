// Gruppiert Tipps nach „Heute / Morgen / Übermorgen / Diese Woche / Später".
// Reine Funktion, testbar, kein UI-Code.

export type DayBucketKey = 'heute' | 'morgen' | 'uebermorgen' | 'woche' | 'spaeter';

export const DAY_BUCKET_LABEL: Record<DayBucketKey, string> = {
  heute: 'Heute',
  morgen: 'Morgen',
  uebermorgen: 'Übermorgen',
  woche: 'Diese Woche',
  spaeter: 'Später'
};

export function dayBucketFor(dateIso: string, todayIso: string): DayBucketKey {
  const today = new Date(`${todayIso}T00:00:00`).getTime();
  const target = new Date(`${dateIso}T00:00:00`).getTime();
  const diffDays = Math.round((target - today) / (24 * 60 * 60 * 1000));
  if (diffDays <= 0) return 'heute';
  if (diffDays === 1) return 'morgen';
  if (diffDays === 2) return 'uebermorgen';
  if (diffDays <= 7) return 'woche';
  return 'spaeter';
}

export interface BucketGroup<T> {
  key: DayBucketKey;
  label: string;
  items: T[];
}

export function groupByDayBucket<T>(items: T[], dateOf: (item: T) => string, todayIso: string): BucketGroup<T>[] {
  const buckets: Record<DayBucketKey, T[]> = {
    heute: [], morgen: [], uebermorgen: [], woche: [], spaeter: []
  };
  for (const item of items) {
    const bucket = dayBucketFor(dateOf(item), todayIso);
    buckets[bucket].push(item);
  }
  const order: DayBucketKey[] = ['heute', 'morgen', 'uebermorgen', 'woche', 'spaeter'];
  return order
    .filter((k) => buckets[k].length > 0)
    .map((k) => ({ key: k, label: DAY_BUCKET_LABEL[k], items: buckets[k] }));
}

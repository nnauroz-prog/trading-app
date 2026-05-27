import { FailureCategory, IdeaJournalEntry } from '@/lib/types/positions';
import { IdeaValidation, ParsedTelegramIdea, UserRiskProfile } from '@/lib/types/ideas';

const STORAGE_KEY = 'trading-app.journal';
export const JOURNAL_CHANGED_EVENT = 'trading-app:journal-changed';

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function loadJournal(): IdeaJournalEntry[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter((e): e is IdeaJournalEntry => typeof e === 'object' && e !== null && typeof e.id === 'string');
  } catch {
    return [];
  }
}

export function saveJournal(entries: IdeaJournalEntry[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  window.dispatchEvent(new CustomEvent(JOURNAL_CHANGED_EVENT));
}

export function addJournalEntry(
  parsed: ParsedTelegramIdea,
  validation: IdeaValidation,
  profile: UserRiskProfile,
  source = 'manual'
): IdeaJournalEntry {
  const entry: IdeaJournalEntry = {
    id: generateId(),
    ideaId: generateId(),
    underlying: parsed.underlying,
    ideaType: parsed.ideaType,
    parsedAt: parsed.parsedAt,
    source,
    appDecision: validation.decision,
    appDecisionLabel: validation.decisionLabel,
    appScore: validation.totalScore,
    userProfile: profile,
    userAction: 'pending',
    outcome1d: 'pending',
    outcome3d: 'pending',
    outcome7d: 'pending',
    outcome30d: 'pending',
    savedAt: Date.now()
  };
  const all = loadJournal();
  all.push(entry);
  saveJournal(all);
  return entry;
}

export function updateJournalEntry(id: string, patch: Partial<IdeaJournalEntry>): IdeaJournalEntry | null {
  const all = loadJournal();
  const idx = all.findIndex((e) => e.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...patch };
  saveJournal(all);
  return all[idx];
}

export function deleteJournalEntry(id: string): void {
  saveJournal(loadJournal().filter((e) => e.id !== id));
}

export interface JournalStats {
  total: number;
  bought: number;
  watched: number;
  rejected: number;
  appWasRight: number;
  appWasWrong: number;
  appAccuracyPct: number | null;
  avgScore: number;
  byDecision: Record<string, number>;
}

export function computeJournalStats(entries: IdeaJournalEntry[]): JournalStats {
  const total = entries.length;
  const bought = entries.filter((e) => e.userAction === 'bought').length;
  const watched = entries.filter((e) => e.userAction === 'watched').length;
  const rejected = entries.filter((e) => e.userAction === 'rejected').length;

  const evaluated = entries.filter((e) => e.outcome7d !== 'pending' && e.outcome7d !== undefined);
  let appWasRight = 0;
  let appWasWrong = 0;
  for (const e of evaluated) {
    const isBuy = e.appDecision === 'BUY_STRONG' || e.appDecision === 'BUY_CAUTIOUS';
    const isAvoid = e.appDecision === 'AVOID' || e.appDecision === 'NO_TRADE' || e.appDecision === 'SELL_OR_REDUCE';
    if (isBuy && e.outcome7d === 'positive') appWasRight++;
    else if (isAvoid && e.outcome7d === 'negative') appWasRight++;
    else if (e.appDecision === 'WATCH' && e.outcome7d === 'neutral') appWasRight++;
    else appWasWrong++;
  }
  const accuracy = evaluated.length > 0 ? appWasRight / evaluated.length : null;

  const avgScore = total > 0 ? entries.reduce((s, e) => s + e.appScore, 0) / total : 0;

  const byDecision: Record<string, number> = {};
  for (const e of entries) {
    byDecision[e.appDecision] = (byDecision[e.appDecision] ?? 0) + 1;
  }

  return {
    total,
    bought,
    watched,
    rejected,
    appWasRight,
    appWasWrong,
    appAccuracyPct: accuracy === null ? null : accuracy * 100,
    avgScore,
    byDecision
  };
}

export interface LessonsAggregation {
  byCategory: Array<{ category: FailureCategory; count: number; examples: IdeaJournalEntry[] }>;
  preventionRules: Array<{ rule: string; count: number; relatedEntries: IdeaJournalEntry[] }>;
  totalFailures: number;
}

export function aggregateLessons(entries: IdeaJournalEntry[]): LessonsAggregation {
  const failed = entries.filter((e) => {
    const negative = e.outcome7d === 'negative' || e.outcome30d === 'negative' || e.outcome3d === 'negative';
    return negative && (e.failureCategory || e.lessonLearned);
  });

  const byCategoryMap = new Map<FailureCategory, IdeaJournalEntry[]>();
  for (const e of failed) {
    if (!e.failureCategory) continue;
    const list = byCategoryMap.get(e.failureCategory) ?? [];
    list.push(e);
    byCategoryMap.set(e.failureCategory, list);
  }

  const byCategory = Array.from(byCategoryMap.entries())
    .map(([category, examples]) => ({ category, count: examples.length, examples: examples.slice(0, 3) }))
    .sort((a, b) => b.count - a.count);

  const ruleMap = new Map<string, IdeaJournalEntry[]>();
  for (const e of failed) {
    if (!e.preventionRule) continue;
    const normalized = e.preventionRule.trim();
    if (normalized.length === 0) continue;
    const list = ruleMap.get(normalized) ?? [];
    list.push(e);
    ruleMap.set(normalized, list);
  }
  const preventionRules = Array.from(ruleMap.entries())
    .map(([rule, relatedEntries]) => ({ rule, count: relatedEntries.length, relatedEntries }))
    .sort((a, b) => b.count - a.count);

  return {
    byCategory,
    preventionRules,
    totalFailures: failed.length
  };
}

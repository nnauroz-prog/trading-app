import { PersonaId } from '@/lib/agents/personas';
import { todayIsoBerlin } from '@/lib/agent-memory';

export interface FirmaDecision {
  date: string; // YYYY-MM-DD (Europe/Berlin)
  recordedAt: number;
  firma: PersonaId;
  firmaName: string;
  verdict: 'BUY' | 'WAIT';
  coin: string | null;
  entry: number | null;
  stopLoss: number | null;
  takeProfit1: number | null;
  safetyGrade: 'A' | 'B' | 'C' | 'D' | null;
  // Snapshot of the three sub-agent votes — useful for later audit.
  analystVote: 'POSITIV' | 'NEUTRAL' | 'NEGATIV';
  scoutVote: 'STARK' | 'MITTEL' | 'SCHWACH';
  riskVote: 'OK' | 'VETO';
  ceoFinalWord: string;
}

const STORAGE_KEY = 'trading-app.firma-decisions-v1';
const MAX_ENTRIES = 365 * 3; // ~3 firmas × 1 year

export const FIRMA_DECISIONS_CHANGED_EVENT = 'trading-app:firma-decisions-changed';

export function loadFirmaLog(): FirmaDecision[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as FirmaDecision[];
  } catch {
    return [];
  }
}

export function recordFirmaDecisions(entries: FirmaDecision[]): void {
  if (typeof window === 'undefined') return;
  const log = loadFirmaLog();
  // Replace today's entries per firma — only one canonical record per (date, firma).
  for (const entry of entries) {
    const idx = log.findIndex((e) => e.date === entry.date && e.firma === entry.firma);
    if (idx >= 0) log[idx] = entry;
    else log.push(entry);
  }
  log.sort((a, b) => (a.date.localeCompare(b.date) || a.firma.localeCompare(b.firma)));
  const trimmed = log.slice(-MAX_ENTRIES);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  window.dispatchEvent(new CustomEvent(FIRMA_DECISIONS_CHANGED_EVENT));
}

export function clearFirmaLog(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(FIRMA_DECISIONS_CHANGED_EVENT));
}

export interface FirmaStats {
  firma: PersonaId;
  firmaName: string;
  totalDays: number;
  buyDays: number;
  waitDays: number;
  uniqueCoins: number;
  lastBuyDate: string | null;
  lastCoin: string | null;
  agreementWithOthers: number; // 0–100, share of days where this firma's verdict matched both others
}

export function statsPerFirma(log: FirmaDecision[]): FirmaStats[] {
  const byFirma = new Map<PersonaId, FirmaDecision[]>();
  for (const d of log) {
    if (!byFirma.has(d.firma)) byFirma.set(d.firma, []);
    byFirma.get(d.firma)!.push(d);
  }

  // Group by day to compute agreement.
  const byDay = new Map<string, FirmaDecision[]>();
  for (const d of log) {
    if (!byDay.has(d.date)) byDay.set(d.date, []);
    byDay.get(d.date)!.push(d);
  }

  const out: FirmaStats[] = [];
  for (const [firma, entries] of byFirma.entries()) {
    const buys = entries.filter((e) => e.verdict === 'BUY');
    const coins = new Set(buys.map((e) => e.coin).filter((c): c is string => c !== null));
    const lastBuy = buys[buys.length - 1] ?? null;

    let agreementCount = 0;
    let agreementTotal = 0;
    for (const entry of entries) {
      const sameDay = byDay.get(entry.date) ?? [];
      if (sameDay.length < 3) continue; // need all three firmas to compare
      const others = sameDay.filter((e) => e.firma !== entry.firma);
      if (others.length !== 2) continue;
      agreementTotal++;
      if (others.every((o) => o.verdict === entry.verdict)) agreementCount++;
    }

    out.push({
      firma,
      firmaName: entries[0].firmaName,
      totalDays: entries.length,
      buyDays: buys.length,
      waitDays: entries.length - buys.length,
      uniqueCoins: coins.size,
      lastBuyDate: lastBuy?.date ?? null,
      lastCoin: lastBuy?.coin ?? null,
      agreementWithOthers: agreementTotal > 0 ? Math.round((agreementCount / agreementTotal) * 100) : 0
    });
  }

  const order: PersonaId[] = ['conservative', 'balanced', 'aggressive'];
  out.sort((a, b) => order.indexOf(a.firma) - order.indexOf(b.firma));
  return out;
}

export function buildFirmaDecisions(
  personas: Array<{
    persona: PersonaId;
    name: string;
    verdict: 'BUY' | 'WAIT';
    target: { symbol: string; entry: number; stopLoss: number; takeProfit1: number } | null;
    safety: { grade: 'A' | 'B' | 'C' | 'D' } | null;
    team: Array<{ role: string; vote: string }>;
    ceoFinalWord: string;
  }>
): FirmaDecision[] {
  const date = todayIsoBerlin();
  const recordedAt = Date.now();
  return personas.map((p) => {
    const analyst = p.team.find((t) => t.role === 'analyst')?.vote ?? 'NEUTRAL';
    const scout = p.team.find((t) => t.role === 'scout')?.vote ?? 'SCHWACH';
    const risk = p.team.find((t) => t.role === 'risk')?.vote ?? 'VETO';
    return {
      date,
      recordedAt,
      firma: p.persona,
      firmaName: p.name,
      verdict: p.verdict,
      coin: p.target?.symbol ?? null,
      entry: p.target?.entry ?? null,
      stopLoss: p.target?.stopLoss ?? null,
      takeProfit1: p.target?.takeProfit1 ?? null,
      safetyGrade: p.safety?.grade ?? null,
      analystVote: analyst as FirmaDecision['analystVote'],
      scoutVote: scout as FirmaDecision['scoutVote'],
      riskVote: risk as FirmaDecision['riskVote'],
      ceoFinalWord: p.ceoFinalWord
    };
  });
}

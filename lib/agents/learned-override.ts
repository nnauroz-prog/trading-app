// Learned Override: nimmt das hartcodierte Verdict einer Firma und prueft, ob
// der historische Track-Record dazu widerspricht. Reine Funktion, voll
// testbar. Wird client-seitig aufgerufen (Server hat keinen Track-Record-
// Zugriff), liefert eine vorgeschlagene Anpassung + Begruendung, ohne den
// Original-Verdict zu zerstoeren.
//
// Logik in Klartext:
//   - Eine Firma sagt BUY, ihre historische Hit-Rate liegt aber unter 40 %
//     UND sie ist auf einer Verlust-Streak (≥ 3 falsche in Folge) → wir
//     stufen das auf WAIT herunter.
//   - Eine Firma sagt WAIT, ihre historische Hit-Rate liegt ueber 65 %
//     UND sie hat eine Gewinn-Streak (≥ 3 richtige in Folge) → wir markieren
//     das als „starker Vertrauens-Override" (kein verdict-Flip, weil Vorsicht
//     immer richtig sein kann, aber sichtbar verstaerkt).
//   - Bei unzureichenden Daten (< MIN_EVALUATED) keine Aenderung.
//   - ZUSAETZLICH (P&L-Eskalation): wenn ein virtuelles P&L-Summary vorhanden
//     ist und der Trade-Durchschnitt deutlich negativ (≤ −3 %) bzw. positiv
//     (≥ +5 %) ist, eskaliert das den Override auch ohne Streak-Bedingung.
//     P&L zeigt, ob die Firma ECHT Geld verdient haette — der ehrlichste
//     Lehrer.

import type { FirmaAccuracy } from '@/lib/firma-accuracy';
import type { FirmaPnlSummary } from '@/lib/agents/firma-pnl';

export type OverrideKind = 'downgrade-buy' | 'reinforce-wait' | 'reinforce-buy' | 'flag-weak-wait' | 'none';

export interface LearnedOverride {
  kind: OverrideKind;
  effectiveVerdict: 'BUY' | 'WAIT';
  // Klartext-Begruendung fuer den User.
  reason: string;
  // 0..3 Schwere: 0 = none, 1 = subtle, 2 = noticeable, 3 = veto-strength.
  severity: 0 | 1 | 2 | 3;
}

const MIN_EVALUATED = 5;
const COLD_STREAK_LENGTH = 3;
const HOT_STREAK_LENGTH = 3;
const COLD_HIT_RATE_PCT = 40;
const HOT_HIT_RATE_PCT = 65;
// P&L-Schwellen. Negativer Schnitt ≤ -3 % je Trade ist „verliert echt Geld",
// positiver Schnitt ≥ +5 % ist „verdient deutlich". Bei < MIN_PNL_TRADES BUYs
// im Tagebuch ignorieren wir P&L — zu wenig Daten.
const COLD_PNL_PCT = -3;
const HOT_PNL_PCT = 5;
const MIN_PNL_TRADES = 5;

// Berechnet die aktuelle Streak: wie viele bewertete Entscheidungen in Folge
// waren richtig (positive Streak) bzw. falsch (negative Streak)?
// Liefert positive Zahl fuer Gewinn-Streak, negative fuer Verlust-Streak.
export function currentStreakLength(recent: FirmaAccuracy['recent']): number {
  const evaluated = recent.filter((r) => r.right !== null);
  if (evaluated.length === 0) return 0;
  const last = evaluated[0].right;
  let length = 1;
  for (let i = 1; i < evaluated.length; i++) {
    if (evaluated[i].right === last) length++;
    else break;
  }
  return last ? length : -length;
}

export function applyLearnedOverride(
  rawVerdict: 'BUY' | 'WAIT',
  accuracy: FirmaAccuracy | null,
  pnl: FirmaPnlSummary | null = null
): LearnedOverride {
  // P&L-Eskalation: ECHTER virtueller Geld-Verlust hebelt sofort aus, auch
  // ohne Hit-Rate-Daten. Wenn der Schnitt pro BUY deutlich negativ ist,
  // downgraden wir — egal wie oft die „Richtung" stimmte (man kann oft
  // richtig liegen und trotzdem verlieren, wenn Stops vor TPs zuschlagen).
  const pnlHasData = pnl && pnl.totalBuys >= MIN_PNL_TRADES;
  if (rawVerdict === 'BUY' && pnlHasData && pnl.avgPnlPct <= COLD_PNL_PCT) {
    return {
      kind: 'downgrade-buy',
      effectiveVerdict: 'WAIT',
      reason: `Virtuelles P&L: im Schnitt ${pnl.avgPnlPct.toFixed(1)} % pro BUY ueber ${pnl.totalBuys} Trades — diese Firma verliert echt Geld, BUY-Signal heruntergestuft.`,
      severity: 3
    };
  }

  if (!accuracy || accuracy.evaluated < MIN_EVALUATED || accuracy.hitRatePct === null) {
    // Aber: bei vorhandenem P&L kann es trotzdem ein flag/reinforce geben.
    if (rawVerdict === 'BUY' && pnlHasData && pnl.avgPnlPct >= HOT_PNL_PCT) {
      return {
        kind: 'reinforce-buy',
        effectiveVerdict: 'BUY',
        reason: `Virtuelles P&L: +${pnl.avgPnlPct.toFixed(1)} % pro BUY ueber ${pnl.totalBuys} Trades — diese Firma verdient echt Geld, Signal verstaerkt.`,
        severity: 2
      };
    }
    return { kind: 'none', effectiveVerdict: rawVerdict, reason: '', severity: 0 };
  }
  const hit = accuracy.hitRatePct;
  const streak = currentStreakLength(accuracy.recent);

  // Downgrade: BUY + schlecht historisch + aktuell auf Verlust-Streak
  if (rawVerdict === 'BUY' && hit < COLD_HIT_RATE_PCT && streak <= -COLD_STREAK_LENGTH) {
    return {
      kind: 'downgrade-buy',
      effectiveVerdict: 'WAIT',
      reason: `Historisch nur ${hit} % richtig und gerade ${-streak} BUYs in Folge daneben — Override stuft das KAUFEN-Signal herunter.`,
      severity: 3
    };
  }
  // Flag: BUY + schlecht historisch, aber keine aktive Verlust-Streak
  if (rawVerdict === 'BUY' && hit < COLD_HIT_RATE_PCT) {
    return {
      kind: 'flag-weak-wait',
      effectiveVerdict: 'BUY',
      reason: `Historisch nur ${hit} % richtig — Position bewusst kleiner sizen.`,
      severity: 2
    };
  }
  // Reinforce-BUY: BUY + hohe Hit-Rate + Gewinn-Streak — oder genug positives P&L.
  if (rawVerdict === 'BUY' && hit >= HOT_HIT_RATE_PCT && streak >= HOT_STREAK_LENGTH) {
    return {
      kind: 'reinforce-buy',
      effectiveVerdict: 'BUY',
      reason: `Historisch ${hit} % richtig und ${streak} BUYs in Folge erfolgreich — Track-Record stuetzt das Signal stark.`,
      severity: 2
    };
  }
  if (rawVerdict === 'BUY' && pnlHasData && pnl.avgPnlPct >= HOT_PNL_PCT) {
    return {
      kind: 'reinforce-buy',
      effectiveVerdict: 'BUY',
      reason: `Virtuelles P&L: +${pnl.avgPnlPct.toFixed(1)} % pro BUY ueber ${pnl.totalBuys} Trades — Empfehlung historisch profitabel.`,
      severity: 2
    };
  }
  // Reinforce-WAIT: WAIT + hohe Hit-Rate + Gewinn-Streak (auch beim Warten)
  if (rawVerdict === 'WAIT' && hit >= HOT_HIT_RATE_PCT && streak >= HOT_STREAK_LENGTH) {
    return {
      kind: 'reinforce-wait',
      effectiveVerdict: 'WAIT',
      reason: `Historisch ${hit} % richtig und ${streak} Tage in Folge gute Calls — das WARTEN heute hat Gewicht.`,
      severity: 1
    };
  }
  return { kind: 'none', effectiveVerdict: rawVerdict, reason: '', severity: 0 };
}

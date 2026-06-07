// Sicherheits-Gate für Aktien & Rohstoffe — gleiches Muster wie die
// Krypto-Safety-Gate, aber auf den Indikatoren aus lib/market/indicators.ts.
// Pure Funktion, vollständig testbar, kein I/O.

import type { PriceCandle } from '@/lib/market/yahoo-history';
import {
  atr, ema, fiftyTwoWeekRange, performancePct, rsi, sma, volumeRatio
} from '@/lib/market/indicators';

export interface InstrumentSafetyCriterion {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

export type InstrumentSafetyGrade = 'A' | 'B' | 'C' | 'D';

export interface InstrumentSafetyAssessment {
  score: number; // 0-100
  grade: InstrumentSafetyGrade;
  maxSafety: boolean; // alle harten Kriterien erfüllt
  passedHard: number;
  totalHard: number;
  criteria: InstrumentSafetyCriterion[];
  verdict: 'KAUFEN' | 'BEOBACHTEN' | 'NICHT KAUFEN';
  residualRiskNote: string;
}

export interface InstrumentSafetyInput {
  price: number;
  candles: PriceCandle[];
}

const RESIDUAL_RISK_NOTE =
  'Auch „A" ist keine Garantie: Märkte können jederzeit drehen. Indikatoren sind Hilfsmittel, kein Selbstläufer. Eigene Risiko-Grenzen einhalten.';

// 8 harte Kriterien aus klassischer technischer Analyse:
//   1. Preis > MA200 (übergeordneter Trend bullisch)
//   2. Preis > MA50 (mittelfristiger Trend bullisch)
//   3. MA50 > MA200 (kein Death-Cross-Risiko)
//   4. RSI ≤ 70 (nicht überkauft)
//   5. RSI ≥ 30 (kein fallendes Messer)
//   6. 52W-Position 30–90% (nicht ganz oben, nicht ganz unten)
//   7. Volumen ≥ 50% des 20-Tage-Schnitts (kein „No-Interest"-Setup)
//   8. 1-Monats-Performance ≥ −5% (kein scharfer Abverkauf)
export function evaluateInstrumentSafety(input: InstrumentSafetyInput): InstrumentSafetyAssessment {
  const closes = input.candles.map((c) => c.close);
  const ma50 = sma(closes, 50);
  const ma200 = sma(closes, 200);
  const ema20 = ema(closes, 20);
  const rsi14 = rsi(closes, 14);
  const atr14 = atr(input.candles, 14);
  const range52w = fiftyTwoWeekRange(input.candles);
  const volRatio = volumeRatio(input.candles, 20);
  const perf1m = performancePct(input.candles, 21);

  const price = input.price;
  void ema20;
  void atr14;

  const criteria: InstrumentSafetyCriterion[] = [
    {
      id: 'above-ma200',
      label: 'Preis über MA200',
      passed: ma200 !== null && price > ma200,
      detail: ma200 === null
        ? 'zu wenig Historie für MA200'
        : price > ma200
          ? `Preis ${(((price - ma200) / ma200) * 100).toFixed(1)}% über MA200`
          : `Preis ${(((ma200 - price) / ma200) * 100).toFixed(1)}% unter MA200`
    },
    {
      id: 'above-ma50',
      label: 'Preis über MA50',
      passed: ma50 !== null && price > ma50,
      detail: ma50 === null
        ? 'zu wenig Historie für MA50'
        : price > ma50
          ? `Preis ${(((price - ma50) / ma50) * 100).toFixed(1)}% über MA50`
          : `Preis ${(((ma50 - price) / ma50) * 100).toFixed(1)}% unter MA50`
    },
    {
      id: 'ma-stack',
      label: 'MA50 über MA200 (kein Death-Cross)',
      passed: ma50 !== null && ma200 !== null && ma50 > ma200,
      detail: ma50 === null || ma200 === null
        ? 'MA-Stack nicht berechenbar'
        : ma50 > ma200
          ? 'gesunder MA-Stack (mittelfristig > langfristig)'
          : 'MA50 unter MA200 — Death-Cross-Setup'
    },
    {
      id: 'rsi-not-overbought',
      label: 'RSI ≤ 70 (nicht überkauft)',
      passed: rsi14 !== null && rsi14 <= 70,
      detail: rsi14 === null ? 'RSI nicht berechenbar' : rsi14 <= 70 ? `RSI ${rsi14.toFixed(0)}` : `RSI ${rsi14.toFixed(0)} — überkauft, Rücksetzer-Risiko`
    },
    {
      id: 'rsi-not-falling-knife',
      label: 'RSI ≥ 30 (kein fallendes Messer)',
      passed: rsi14 !== null && rsi14 >= 30,
      detail: rsi14 === null ? 'RSI nicht berechenbar' : rsi14 >= 30 ? `RSI ${rsi14.toFixed(0)}` : `RSI ${rsi14.toFixed(0)} — tief überverkauft, Boden unklar`
    },
    {
      id: '52w-position',
      label: '52W-Position 30–90 %',
      passed: range52w !== null && range52w.positionPct >= 30 && range52w.positionPct <= 90,
      detail: range52w === null
        ? '52W-Range nicht berechenbar'
        : range52w.positionPct < 30
          ? `nahe Jahres-Tief (${range52w.positionPct.toFixed(0)} %) — Abwärtstrend möglich`
          : range52w.positionPct > 90
            ? `nahe Jahres-Hoch (${range52w.positionPct.toFixed(0)} %) — kein Sicherheitsabstand`
            : `gesunde Lage (${range52w.positionPct.toFixed(0)} %)`
    },
    {
      id: 'volume-alive',
      label: 'Volumen ≥ 50 % des 20-Tage-Schnitts',
      passed: volRatio !== null && volRatio >= 0.5,
      detail: volRatio === null
        ? 'Volumen-Ratio nicht berechenbar'
        : volRatio >= 0.5
          ? `Volumen ${volRatio.toFixed(2)}× des Schnitts — Marktinteresse vorhanden`
          : `Volumen nur ${volRatio.toFixed(2)}× des Schnitts — kein Interesse`
    },
    {
      id: 'momentum-1m',
      label: '1-Monats-Performance ≥ −5 %',
      passed: perf1m !== null && perf1m >= -5,
      detail: perf1m === null
        ? 'Performance nicht berechenbar'
        : perf1m >= -5
          ? `1 Monat ${perf1m >= 0 ? '+' : ''}${perf1m.toFixed(1)} %`
          : `1 Monat ${perf1m.toFixed(1)} % — scharfer Abverkauf`
    }
  ];

  const passedHard = criteria.filter((c) => c.passed).length;
  const totalHard = criteria.length;
  const score = Math.round((passedHard / totalHard) * 100);
  const maxSafety = passedHard === totalHard;
  const grade: InstrumentSafetyGrade =
    maxSafety ? 'A' : passedHard >= totalHard - 1 ? 'B' : passedHard >= totalHard - 3 ? 'C' : 'D';
  const verdict: InstrumentSafetyAssessment['verdict'] =
    maxSafety ? 'KAUFEN' : passedHard >= totalHard - 2 ? 'BEOBACHTEN' : 'NICHT KAUFEN';

  return { score, grade, maxSafety, passedHard, totalHard, criteria, verdict, residualRiskNote: RESIDUAL_RISK_NOTE };
}

'use client';

// Track-Record-Kontext fuer die TradingTodayCard ganz oben auf der Home.
// Liest firma-accuracy aus dem lokalen Tagebuch und zeigt — passend zum
// heutigen Verdict — die historische Trefferquote der gerade relevanten
// Firmen. So sieht der User die wichtigste „Beweis"-Information direkt
// am wichtigsten Recommendation-Punkt: ist diese Empfehlung historisch
// vertrauenswuerdig?

import { useEffect, useState } from 'react';
import { FIRMA_DECISIONS_CHANGED_EVENT, loadFirmaLog } from '@/lib/firma-memory';
import { INTEL_LOG_CHANGED_EVENT, loadIntelLog } from '@/lib/intel/memory';
import { computeFirmaAccuracy, MIN_EVAL_FOR_SKILL, type FirmaAccuracy } from '@/lib/firma-accuracy';
import type { PersonaId } from '@/lib/agents/personas';

export type TradingTodayKind = 'tier-90' | 'konservativ' | 'mit-vorsicht' | 'uneinig' | 'cash';

interface Props {
  kind: TradingTodayKind;
  // Wer kauft heute mit? Auf Basis der heutigen Verdicts. So koennen wir
  // exakt die richtigen Firmen-Hit-Raten anzeigen.
  buyingFirmas: PersonaId[];
}

const FIRMA_LABEL: Record<PersonaId, string> = {
  conservative: 'Konservativ',
  balanced: 'Balanciert',
  aggressive: 'Aggressiv'
};

export function TradingTodayLearningNote({ kind, buyingFirmas }: Props) {
  const [accuracy, setAccuracy] = useState<FirmaAccuracy[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => {
      const firmaLog = loadFirmaLog();
      const intelLog = loadIntelLog();
      const priceMap = new Map<string, number>();
      for (const s of intelLog) if (s.btcPriceAtRecord !== null) priceMap.set(s.date, s.btcPriceAtRecord);
      setAccuracy(computeFirmaAccuracy(firmaLog, (d) => priceMap.get(d) ?? null));
    };
    sync();
    setMounted(true);
    window.addEventListener(FIRMA_DECISIONS_CHANGED_EVENT, sync);
    window.addEventListener(INTEL_LOG_CHANGED_EVENT, sync);
    return () => {
      window.removeEventListener(FIRMA_DECISIONS_CHANGED_EVENT, sync);
      window.removeEventListener(INTEL_LOG_CHANGED_EVENT, sync);
    };
  }, []);

  if (!mounted) return null;

  // Filter: nur Firmen mit genug Daten, damit wir keine vorgetaeuschten
  // Lern-Aussagen rausgeben.
  const trained = accuracy.filter((a) => a.evaluated >= MIN_EVAL_FOR_SKILL && a.hitRatePct !== null);
  if (trained.length === 0) return null;

  // Welche Firmen sind heute aktiv beim Verdict? Bei BUY-Verdicts die
  // Kaufenden; bei warten/cash der staerkste Track-Record als Kontext.
  let relevantFirmas: FirmaAccuracy[];
  let prefix: string;
  if (kind === 'tier-90' || kind === 'konservativ' || kind === 'mit-vorsicht') {
    relevantFirmas = trained.filter((a) => buyingFirmas.includes(a.firma));
    prefix = relevantFirmas.length === 1
      ? `Track-Record ${FIRMA_LABEL[relevantFirmas[0].firma]}`
      : 'Track-Record der kaufenden Firmen';
  } else {
    // Bei warten / cash: ein einzelner Kontext-Satz aus der besten Firma.
    const best = [...trained].sort((a, b) => (b.hitRatePct ?? 0) - (a.hitRatePct ?? 0))[0];
    relevantFirmas = best ? [best] : [];
    prefix = 'Track-Record-Kontext';
  }

  if (relevantFirmas.length === 0) return null;

  const avg = Math.round(
    relevantFirmas.reduce((s, a) => s + (a.hitRatePct ?? 0), 0) / relevantFirmas.length
  );
  const tone =
    avg >= 60 ? 'border-emerald-400/40 bg-emerald-950/15 text-emerald-100'
    : avg >= 45 ? 'border-slate-700 bg-slate-900/40 text-slate-300'
    : 'border-rose-400/40 bg-rose-950/15 text-rose-100';

  return (
    <div className={`rounded-md border px-3 py-2 text-[11px] leading-snug ${tone}`}>
      <span className="font-semibold">{prefix}:</span>{' '}
      {relevantFirmas.length === 1
        ? <>liegt aktuell bei <span className="font-mono font-bold">{relevantFirmas[0].hitRatePct} %</span> ({relevantFirmas[0].rightCalls}/{relevantFirmas[0].evaluated} richtig).</>
        : <>im Schnitt <span className="font-mono font-bold">{avg} %</span> ({relevantFirmas.map((a) => `${FIRMA_LABEL[a.firma]} ${a.hitRatePct} %`).join(' · ')}).</>
      }
      {kind === 'tier-90' && avg < 55 && (
        <span className="ml-1 text-amber-300">— Achtung: Tier-90-Konsens, aber Track-Record durchwachsen, Position vorsichtiger sizen.</span>
      )}
      {(kind === 'konservativ' || kind === 'mit-vorsicht') && avg >= 60 && (
        <span className="ml-1 text-emerald-300">— Empfehlung historisch belastbar.</span>
      )}
    </div>
  );
}

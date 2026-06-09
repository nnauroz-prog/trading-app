'use client';

import { useEffect, useState } from 'react';
import { FIRMA_DECISIONS_CHANGED_EVENT, loadFirmaLog } from '@/lib/firma-memory';
import { INTEL_LOG_CHANGED_EVENT, computeIntelAccuracy, loadIntelLog } from '@/lib/intel/memory';
import { VORSTAND_LOG_CHANGED_EVENT, computeVorstandAccuracy, loadVorstandLog } from '@/lib/agents/vorstand-memory';
import { computeFirmaAccuracy, MIN_EVAL_FOR_SKILL, type FirmaAccuracy } from '@/lib/firma-accuracy';
import { COIN_OVERRIDES_CHANGED_EVENT, loadAllCoinOverrides } from '@/lib/agents/coin-override-store';
import { applyCoinAdjustment, type CoinOverride } from '@/lib/agents/coin-override';

interface Props {
  date: string;
  firmasBuyingCount: number;
  firmaBuyTargets: Array<{ name: string; coin: string }>;
  ceoLagebericht: string;
  ceoSignal: string;
  topNews: Array<{ title: string; impact: string; source: string }>;
  macroNext: { title: string; hoursUntil: number } | null;
}

interface TrackRecord {
  firmas: FirmaAccuracy[];
  intelHitRatePct: number | null;
  intelEvaluated: number;
  vorstandHitRatePct: number | null;
  vorstandEvaluated: number;
  coinOverrides: Array<{ coinId: string; factorCount: number; scoreDelta: number; hardVeto: boolean }>;
}

// Generates a copy-able plain-text morning briefing for sharing or journaling.
// Holt zusätzlich client-seitig den Track-Record (Firma/Vorstand/Intel) und
// haengt ihn an den exportierten Text an — so reist die Lern-Statistik mit.
export function MorningBriefingExport(props: Props) {
  const [copied, setCopied] = useState(false);
  const [trackRecord, setTrackRecord] = useState<TrackRecord | null>(null);

  useEffect(() => {
    const sync = () => {
      const firmaLog = loadFirmaLog();
      const intelLog = loadIntelLog();
      const vorstandLog = loadVorstandLog();
      const priceMap = new Map<string, number>();
      for (const s of intelLog) if (s.btcPriceAtRecord !== null) priceMap.set(s.date, s.btcPriceAtRecord);
      const firmas = computeFirmaAccuracy(firmaLog, (d) => priceMap.get(d) ?? null);
      const overrides = loadAllCoinOverrides();
      const coinOverrides: TrackRecord['coinOverrides'] = [];
      for (const [coinId, ov] of Object.entries(overrides)) {
        const o = ov as CoinOverride;
        if (o.factors.length === 0) continue;
        const adj = applyCoinAdjustment(o);
        coinOverrides.push({ coinId, factorCount: o.factors.length, scoreDelta: adj.scoreDelta, hardVeto: adj.hardVeto });
      }
      coinOverrides.sort((a, b) => (b.hardVeto ? 1 : 0) - (a.hardVeto ? 1 : 0) || Math.abs(b.scoreDelta) - Math.abs(a.scoreDelta));
      const intelAcc = computeIntelAccuracy(intelLog);
      const vorstandAcc = computeVorstandAccuracy(vorstandLog, (d) => priceMap.get(d) ?? null);
      setTrackRecord({
        firmas,
        intelHitRatePct: intelAcc.hitRatePct,
        intelEvaluated: intelAcc.evaluated,
        vorstandHitRatePct: vorstandAcc.hitRatePct,
        vorstandEvaluated: vorstandAcc.evaluated,
        coinOverrides
      });
    };
    sync();
    window.addEventListener(FIRMA_DECISIONS_CHANGED_EVENT, sync);
    window.addEventListener(INTEL_LOG_CHANGED_EVENT, sync);
    window.addEventListener(VORSTAND_LOG_CHANGED_EVENT, sync);
    window.addEventListener(COIN_OVERRIDES_CHANGED_EVENT, sync);
    return () => {
      window.removeEventListener(FIRMA_DECISIONS_CHANGED_EVENT, sync);
      window.removeEventListener(INTEL_LOG_CHANGED_EVENT, sync);
      window.removeEventListener(VORSTAND_LOG_CHANGED_EVENT, sync);
      window.removeEventListener(COIN_OVERRIDES_CHANGED_EVENT, sync);
    };
  }, []);

  const text = buildText(props, trackRecord);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <details className="rounded-2xl border border-slate-800 bg-slate-900/40 p-3">
      <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200">
        Morgen-Briefing als Text kopieren
      </summary>
      <div className="mt-3 space-y-2">
        <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-950/60 p-3 font-mono text-[11px] leading-relaxed text-slate-200">{text}</pre>
        <button
          onClick={handleCopy}
          className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-slate-300 hover:border-emerald-400/40 hover:text-emerald-300"
        >
          {copied ? '✓ Kopiert' : 'In Zwischenablage kopieren'}
        </button>
      </div>
    </details>
  );
}

function buildText(p: Props, tr: TrackRecord | null): string {
  const lines: string[] = [];
  lines.push(`MORGEN-BRIEFING · ${p.date}`);
  lines.push('===============================');
  lines.push('');
  if (p.firmasBuyingCount === 0) {
    lines.push('FIRMEN: Heute will keine kaufen.');
  } else if (p.firmasBuyingCount === 3) {
    lines.push(`FIRMEN: Alle drei wollen kaufen — ${p.firmaBuyTargets.map((t) => `${t.name}:${t.coin}`).join(', ')}.`);
  } else {
    lines.push(`FIRMEN: ${p.firmasBuyingCount}/3 wollen kaufen — ${p.firmaBuyTargets.map((t) => `${t.name}:${t.coin}`).join(', ')}.`);
  }
  lines.push('');
  if (p.macroNext) {
    lines.push(`MAKRO-VORSCHAU: ${p.macroNext.title} in ca. ${p.macroNext.hoursUntil}h.`);
    lines.push('');
  }
  lines.push(`RECHERCHE-CHEFREDAKTEUR (Tendenz: ${p.ceoSignal})`);
  lines.push(p.ceoLagebericht);
  lines.push('');
  if (p.topNews.length > 0) {
    lines.push('TOP-SCHLAGZEILEN:');
    for (const n of p.topNews.slice(0, 5)) {
      lines.push(`· [${n.impact}] ${n.title} (${n.source})`);
    }
    lines.push('');
  }
  // Track-Record-Block: zeigt im Export-Text die historische Treffer-Quote
  // pro Agent. Nur, wenn genug Daten vorliegen — sonst ehrlich weggelassen.
  if (tr) {
    const trainedFirmas = tr.firmas.filter((f) => f.evaluated >= MIN_EVAL_FOR_SKILL && f.hitRatePct !== null);
    const intelTrained = tr.intelHitRatePct !== null && tr.intelEvaluated >= MIN_EVAL_FOR_SKILL;
    const vorstandTrained = tr.vorstandHitRatePct !== null && tr.vorstandEvaluated >= MIN_EVAL_FOR_SKILL;
    if (trainedFirmas.length > 0 || intelTrained || vorstandTrained) {
      lines.push('TRACK-RECORD (aus deinem lokalen Tagebuch):');
      for (const f of trainedFirmas) {
        lines.push(`· ${f.firmaName}: ${f.hitRatePct} % (${f.rightCalls}/${f.evaluated})`);
      }
      if (vorstandTrained) {
        lines.push(`· Vorstand insgesamt: ${tr.vorstandHitRatePct} % (über ${tr.vorstandEvaluated} bewertete Tage)`);
      }
      if (intelTrained) {
        lines.push(`· Chefredakteur: ${tr.intelHitRatePct} % (über ${tr.intelEvaluated} bewertete Tage)`);
      }
      lines.push('');
    }
    // Coin-User-Overrides: was hat der User selbst markiert?
    if (tr.coinOverrides.length > 0) {
      lines.push('AKTIVE USER-FAKTOREN (Coin-Overrides):');
      for (const o of tr.coinOverrides) {
        const sign = o.scoreDelta >= 0 ? '+' : '';
        const veto = o.hardVeto ? ' [VETO]' : '';
        lines.push(`· ${o.coinId.toUpperCase()}: ${o.factorCount} Faktor${o.factorCount === 1 ? '' : 'en'}, Safety ${sign}${o.scoreDelta} Punkte${veto}`);
      }
      lines.push('');
    }
  }
  lines.push('---');
  lines.push('Keine Finanzberatung. Vergangenheit ≠ Zukunft.');
  return lines.join('\n');
}

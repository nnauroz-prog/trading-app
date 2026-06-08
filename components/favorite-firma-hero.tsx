'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AgentVerdict, PersonaId } from '@/lib/agents/personas';
import { FIRMA_PREFERENCE_CHANGED_EVENT, loadFirmaPreference, saveFirmaPreference } from '@/lib/firma-preference';
import { CEO_BIOS } from '@/lib/agents/personalities';
import { generateTradeMemo } from '@/lib/agents/trade-memo';
import { FIRMA_DECISIONS_CHANGED_EVENT, loadFirmaLog } from '@/lib/firma-memory';
import { INTEL_LOG_CHANGED_EVENT, loadIntelLog } from '@/lib/intel/memory';
import { computeFirmaAccuracy, MIN_EVAL_FOR_SKILL, type FirmaAccuracy } from '@/lib/firma-accuracy';

function fmt(v: number): string {
  if (v >= 1000) return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (v >= 1) return v.toFixed(2);
  if (v >= 0.01) return v.toFixed(4);
  return v.toFixed(7);
}

// Renders the user's preferred firma's full verdict as a hero block on the
// home page. Wenn keine Wahl getroffen wurde, aber der Track-Record einen
// klaren Sieger zeigt, schlägt die Karte diese Firma vor — so wächst die
// App mit dem User zusammen statt eine manuelle Konfig zu erzwingen.
export function FavoriteFirmaHero({ personas }: { personas: AgentVerdict[] }) {
  const [preferred, setPreferred] = useState<PersonaId | null>(null);
  const [accuracy, setAccuracy] = useState<FirmaAccuracy[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const syncPref = () => setPreferred(loadFirmaPreference());
    const syncAcc = () => {
      const log = loadFirmaLog();
      const intelLog = loadIntelLog();
      const priceMap = new Map<string, number>();
      for (const s of intelLog) if (s.btcPriceAtRecord !== null) priceMap.set(s.date, s.btcPriceAtRecord);
      setAccuracy(computeFirmaAccuracy(log, (d) => priceMap.get(d) ?? null));
    };
    syncPref();
    syncAcc();
    setMounted(true);
    window.addEventListener(FIRMA_PREFERENCE_CHANGED_EVENT, syncPref);
    window.addEventListener(FIRMA_DECISIONS_CHANGED_EVENT, syncAcc);
    window.addEventListener(INTEL_LOG_CHANGED_EVENT, syncAcc);
    return () => {
      window.removeEventListener(FIRMA_PREFERENCE_CHANGED_EVENT, syncPref);
      window.removeEventListener(FIRMA_DECISIONS_CHANGED_EVENT, syncAcc);
      window.removeEventListener(INTEL_LOG_CHANGED_EVENT, syncAcc);
    };
  }, []);

  if (!mounted) return null;

  const bestFirma = [...accuracy]
    .filter((a) => a.evaluated >= MIN_EVAL_FOR_SKILL && a.hitRatePct !== null)
    .sort((a, b) => (b.hitRatePct ?? 0) - (a.hitRatePct ?? 0))[0];

  // Keine manuelle Wahl + bereits genug Track-Record → Vorschlag anzeigen.
  if (!preferred) {
    if (!bestFirma) return null;
    const winnerVerdict = personas.find((p) => p.persona === bestFirma.firma);
    if (!winnerVerdict) return null;
    return (
      <section className="space-y-2 rounded-2xl border-2 border-amber-400/40 bg-amber-950/15 p-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300">Track-Record-Vorschlag</div>
        <p className="text-[12px] leading-relaxed text-slate-200">
          Du hast noch keine Lieblings-Firma gesetzt. Aus den letzten {bestFirma.evaluated} bewerteten Entscheidungen ist <span className="font-bold text-white">{bestFirma.firmaName}</span> mit <span className="font-mono text-amber-200">{bestFirma.hitRatePct} %</span> Trefferquote die treffsicherste — heute sagt sie: <span className="font-semibold">{winnerVerdict.verdict === 'BUY' ? `KAUFEN${winnerVerdict.target ? ` ${winnerVerdict.target.symbol}` : ''}` : 'WARTEN'}</span>.
        </p>
        <button
          type="button"
          onClick={() => saveFirmaPreference(bestFirma.firma)}
          className="rounded-md border border-amber-400/60 bg-amber-500/15 px-3 py-1.5 text-[11px] font-semibold text-amber-100 transition hover:bg-amber-500/25"
        >
          ★ {bestFirma.firmaName} als Lieblings-Firma setzen
        </button>
      </section>
    );
  }

  const p = personas.find((x) => x.persona === preferred);
  if (!p) return null;

  const isBuy = p.verdict === 'BUY';
  const tone = isBuy ? 'border-amber-400/60 bg-emerald-950/30' : 'border-amber-400/60 bg-slate-900/60';
  const ceo = CEO_BIOS[p.persona];
  const memo = generateTradeMemo(p);
  const myAccuracy = accuracy.find((a) => a.firma === preferred);
  const preferDiffsFromBest = bestFirma && bestFirma.firma !== preferred
    && (bestFirma.hitRatePct ?? 0) - (myAccuracy?.hitRatePct ?? 0) >= 15;

  return (
    <section className={`space-y-2 rounded-2xl border-2 p-5 ${tone}`}>
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="text-amber-300">★</span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Deine Lieblings-Firma sagt</span>
        </div>
        <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${isBuy ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-100' : 'border-slate-700 bg-slate-900 text-slate-300'}`}>
          {isBuy ? 'KAUFEN' : 'WARTEN'}
        </span>
      </div>
      <h2 className="text-lg font-bold text-white">{p.name}: {isBuy && p.target ? `kaufe ${p.target.symbol}` : 'heute lieber warten'}</h2>
      <p className="text-[12px] leading-relaxed text-slate-200">{p.rationale}</p>
      {ceo && (
        <p className="text-[10px] italic text-slate-500">— {ceo.name}, {ceo.role}</p>
      )}
      {myAccuracy && myAccuracy.hitRatePct !== null && myAccuracy.evaluated >= MIN_EVAL_FOR_SKILL && (
        <p className="rounded-md border border-slate-800 bg-slate-950/40 p-2 text-[11px] leading-relaxed text-slate-300">
          <span className="font-semibold text-slate-200">Track-Record:</span> {myAccuracy.firmaName} liegt aktuell bei <span className="font-mono">{myAccuracy.hitRatePct} %</span> ({myAccuracy.rightCalls}/{myAccuracy.evaluated} richtig).
        </p>
      )}
      {preferDiffsFromBest && bestFirma && (
        <div className="rounded-md border border-sky-400/40 bg-sky-950/20 p-2 text-[11px] leading-relaxed text-sky-100">
          <span className="font-semibold">Aktuell besser im Track-Record:</span> {bestFirma.firmaName} ({bestFirma.hitRatePct} %).
          <button
            type="button"
            onClick={() => saveFirmaPreference(bestFirma.firma)}
            className="ml-2 rounded border border-sky-400/50 bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-sky-100 hover:bg-sky-500/25"
          >
            wechseln
          </button>
        </div>
      )}
      {memo && (
        <div className="grid grid-cols-3 gap-2 rounded-md border border-slate-800 bg-slate-950/40 p-2 text-center text-[11px]">
          <div><div className="text-[9px] uppercase tracking-wider text-slate-500">Einstieg</div><div className="font-mono text-slate-100">${fmt(memo.entry)}</div></div>
          <div><div className="text-[9px] uppercase tracking-wider text-rose-400">Stop</div><div className="font-mono text-rose-200">${fmt(memo.stop)}</div></div>
          <div><div className="text-[9px] uppercase tracking-wider text-emerald-400">Ziel 1</div><div className="font-mono text-emerald-200">${fmt(memo.target1)}</div></div>
        </div>
      )}
      <div className="flex flex-wrap items-baseline gap-3 text-[10px]">
        <Link href="/agent" className="text-sky-300 hover:text-sky-200">→ Volle Begründung auf /agent</Link>
      </div>
    </section>
  );
}

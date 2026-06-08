'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AgentVerdict, PersonaId } from '@/lib/agents/personas';
import { FIRMA_PREFERENCE_CHANGED_EVENT, loadFirmaPreference } from '@/lib/firma-preference';
import { FIRMA_DECISIONS_CHANGED_EVENT, loadFirmaLog } from '@/lib/firma-memory';
import { INTEL_LOG_CHANGED_EVENT, loadIntelLog } from '@/lib/intel/memory';
import { computeFirmaAccuracy, MIN_EVAL_FOR_SKILL, type FirmaAccuracy } from '@/lib/firma-accuracy';
import { applyLearnedOverride, type LearnedOverride } from '@/lib/agents/learned-override';

function fmtPrice(v: number): string {
  if (v >= 1000) return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (v >= 1) return v.toFixed(2);
  if (v >= 0.01) return v.toFixed(4);
  return v.toFixed(7);
}

function gradeClasses(g: 'A' | 'B' | 'C' | 'D' | null | undefined): string {
  if (g === 'A') return 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200';
  if (g === 'B') return 'border-amber-400/50 bg-amber-500/15 text-amber-200';
  if (g === 'C' || g === 'D') return 'border-rose-400/50 bg-rose-500/15 text-rose-200';
  return 'border-slate-700 bg-slate-900 text-slate-400';
}

// Compact strip showing today's three CEO verdicts at a glance on the home page.
// Each tile links to /agent for the full team view. Eingebauter Lern-Indikator:
// pro Firma wird die aktuelle Trefferquote als Badge eingeblendet, sobald
// genug Daten gesammelt sind.
export function FirmaStrip({ personas }: { personas: AgentVerdict[] }) {
  const [preferred, setPreferred] = useState<PersonaId | null>(null);
  const [hitRates, setHitRates] = useState<Map<PersonaId, { pct: number; evaluated: number; streak: { kind: 'hot' | 'cold' | 'mixed'; length: number } | null }>>(new Map());
  const [accuracyMap, setAccuracyMap] = useState<Map<PersonaId, FirmaAccuracy>>(new Map());
  useEffect(() => {
    const syncPref = () => setPreferred(loadFirmaPreference());
    const syncRates = () => {
      const log = loadFirmaLog();
      const intelLog = loadIntelLog();
      const priceMap = new Map<string, number>();
      for (const s of intelLog) if (s.btcPriceAtRecord !== null) priceMap.set(s.date, s.btcPriceAtRecord);
      const acc = computeFirmaAccuracy(log, (d) => priceMap.get(d) ?? null);
      const accMap = new Map<PersonaId, FirmaAccuracy>();
      for (const a of acc) accMap.set(a.firma, a);
      setAccuracyMap(accMap);
      const m = new Map<PersonaId, { pct: number; evaluated: number; streak: { kind: 'hot' | 'cold' | 'mixed'; length: number } | null }>();
      for (const a of acc) {
        if (a.hitRatePct !== null && a.evaluated >= MIN_EVAL_FOR_SKILL) {
          // Aktuelle Streak: laufe rückwärts durch a.recent (neueste zuerst),
          // zähle wie viele die gleiche „right"-Richtung haben. Nur wirklich
          // bewertete Tage zählen (right !== null).
          const evaluated = a.recent.filter((r) => r.right !== null);
          let kind: 'hot' | 'cold' | 'mixed' = 'mixed';
          let length = 0;
          if (evaluated.length > 0) {
            const last = evaluated[0].right;
            length = 1;
            for (let i = 1; i < evaluated.length; i++) {
              if (evaluated[i].right === last) length++;
              else break;
            }
            kind = last ? 'hot' : 'cold';
          }
          m.set(a.firma, {
            pct: a.hitRatePct,
            evaluated: a.evaluated,
            streak: length >= 2 ? { kind, length } : null
          });
        }
      }
      setHitRates(m);
    };
    syncPref();
    syncRates();
    window.addEventListener(FIRMA_PREFERENCE_CHANGED_EVENT, syncPref);
    window.addEventListener(FIRMA_DECISIONS_CHANGED_EVENT, syncRates);
    window.addEventListener(INTEL_LOG_CHANGED_EVENT, syncRates);
    return () => {
      window.removeEventListener(FIRMA_PREFERENCE_CHANGED_EVENT, syncPref);
      window.removeEventListener(FIRMA_DECISIONS_CHANGED_EVENT, syncRates);
      window.removeEventListener(INTEL_LOG_CHANGED_EVENT, syncRates);
    };
  }, []);
  const buyCount = personas.filter((p) => p.verdict === 'BUY').length;
  return (
    <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Drei Firmen — heute
        </h2>
        <Link href="/agent" className="text-[10px] text-sky-300 hover:text-sky-200">
          Details →
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {personas.map((p) => {
          const rawIsBuy = p.verdict === 'BUY';
          const override: LearnedOverride = applyLearnedOverride(p.verdict, accuracyMap.get(p.persona) ?? null);
          const isBuy = override.effectiveVerdict === 'BUY';
          const wasDowngraded = override.kind === 'downgrade-buy';
          const isFav = preferred === p.persona;
          // Visual: bei downgrade die Karte als WARTEN behandeln, plus rote
          // Outline, damit der User den Override sieht.
          const tone = wasDowngraded
            ? 'border-rose-400/60 bg-rose-950/15 ring-1 ring-rose-400/40'
            : isFav
            ? (isBuy ? 'border-amber-400/70 bg-emerald-950/30 ring-2 ring-amber-400/50' : 'border-amber-400/70 bg-slate-900/60 ring-2 ring-amber-400/50')
            : (isBuy ? 'border-emerald-400/60 bg-emerald-950/30' : 'border-slate-700 bg-slate-900/60');
          return (
            <Link key={p.persona} href="/agent" className={`block space-y-1 rounded-lg border-2 p-2 transition hover:border-sky-400/60 ${tone}`}>
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white">
                  {isFav && <span className="mr-0.5 text-amber-300" title="Deine Lieblings-Firma">★</span>}
                  {p.name}
                </span>
                {wasDowngraded ? (
                  <span className="rounded border border-rose-400/60 bg-rose-500/20 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-100" title={override.reason}>
                    {rawIsBuy ? 'KAUFEN' : 'WARTEN'} → WARTEN
                  </span>
                ) : (
                  <span className={`rounded border px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider ${isBuy ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-100' : 'border-slate-700 bg-slate-900 text-slate-400'}`}>
                    {isBuy ? 'KAUFEN' : 'WARTEN'}
                    {override.kind === 'reinforce-buy' && <span className="ml-0.5 text-emerald-300" title={override.reason}>+</span>}
                    {override.kind === 'flag-weak-wait' && <span className="ml-0.5 text-amber-300" title={override.reason}>!</span>}
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1.5">
                {p.target ? (
                  <>
                    <span className="font-mono text-sm font-bold text-white">{p.target.symbol}</span>
                    <span className="font-mono text-[10px] text-slate-500" title="Anzahl erfüllter Kriterien von insgesamt 12.">{p.target.passedCount} Häkchen</span>
                    {p.safety && (
                      <span className={`rounded border px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider ${gradeClasses(p.safety.grade)}`}>
                        {p.safety.grade}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-[10px] text-slate-500">kein Setup</span>
                )}
              </div>
              {isBuy && p.target && (
                <div className="font-mono text-[9px] text-slate-500">
                  ${fmtPrice(p.target.entry)} → ${fmtPrice(p.target.takeProfit1)}
                </div>
              )}
              {hitRates.has(p.persona) && (() => {
                const r = hitRates.get(p.persona)!;
                return (
                  <div className="space-y-0.5 border-t border-slate-800 pt-1">
                    <div className="flex items-baseline justify-between gap-1">
                      <span className="text-[8.5px] uppercase tracking-wider text-slate-500">Track-Record</span>
                      <span className={`font-mono text-[10px] font-bold ${
                        r.pct >= 60 ? 'text-emerald-300'
                        : r.pct >= 45 ? 'text-slate-200'
                        : 'text-rose-300'
                      }`} title={`${r.evaluated} bewertbare Entscheidungen`}>
                        {r.pct} %
                      </span>
                    </div>
                    {r.streak && (
                      <div className={`text-[9px] leading-snug ${
                        r.streak.kind === 'hot' ? 'text-emerald-300'
                        : r.streak.kind === 'cold' ? 'text-rose-300'
                        : 'text-slate-500'
                      }`}>
                        {r.streak.kind === 'hot' ? `🔥 letzte ${r.streak.length} richtig`
                          : r.streak.kind === 'cold' ? `❄ letzte ${r.streak.length} daneben`
                          : ''}
                      </div>
                    )}
                  </div>
                );
              })()}
              {override.severity >= 2 && (
                <div className={`rounded border px-1 py-0.5 text-[9px] leading-snug ${
                  override.kind === 'downgrade-buy' ? 'border-rose-400/40 bg-rose-500/10 text-rose-200'
                  : override.kind === 'reinforce-buy' ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
                  : 'border-amber-400/40 bg-amber-500/10 text-amber-200'
                }`}>
                  {override.reason}
                </div>
              )}
            </Link>
          );
        })}
      </div>
      <p className="text-[10px] text-slate-500">
        {buyCount === 0 ? 'Keine Firma will heute kaufen — Konsens auf „warten".' :
         buyCount === 3 ? 'Alle drei Firmen wollen kaufen — starker Konsens.' :
         buyCount === 1 ? 'Nur eine Firma will kaufen — gemischtes Bild.' :
         'Zwei von drei Firmen wollen kaufen — solider Konsens.'}
      </p>
    </section>
  );
}

'use client';

// Quoten-Vergleich pro WM-Pick.
// User traegt pro Pick die Quoten mehrerer Anbieter ein; die Karte
// zeigt den Leader, den Edge zur fairen Quote und den Spread.
// Anbieter-Namen und Quoten werden lokal persistiert.
// Versteckt sich, wenn keine Picks vorhanden sind.

import { useEffect, useState } from 'react';
import { compareWmOdds, type WmOddsEntryInput } from '@/lib/sport/wm-odds-compare';
import {
  loadSlotNames,
  saveSlotNames,
  loadAllQuotes,
  saveQuotesForPick,
  WM_ODDS_COMPARE_CHANGED_EVENT
} from '@/lib/sport/wm-odds-compare-store';
import type { WmWinnerPick } from '@/lib/sport/wm-winner-picks';

interface Props {
  picks: WmWinnerPick[];
}

type Triple = [string, string, string];

function parseOdds(raw: string): number {
  const n = parseFloat(raw.replace(',', '.'));
  return Number.isFinite(n) && n > 1 ? n : NaN;
}

const EMPTY_TRIPLE: Triple = ['', '', ''];

export function WmOddsCompareCard({ picks }: Props) {
  const [slotNames, setSlotNames] = useState<Triple>(['Anbieter A', 'Anbieter B', 'Anbieter C']);
  const [draftsByPick, setDraftsByPick] = useState<Record<string, Triple>>({});
  const [editingNames, setEditingNames] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => {
      const names = loadSlotNames();
      setSlotNames([names[0], names[1], names[2]] as Triple);
      const all = loadAllQuotes();
      const next: Record<string, Triple> = {};
      for (const [pickId, q] of Object.entries(all)) {
        next[pickId] = [q.drafts[0] ?? '', q.drafts[1] ?? '', q.drafts[2] ?? ''];
      }
      setDraftsByPick(next);
    };
    sync();
    setMounted(true);
    window.addEventListener(WM_ODDS_COMPARE_CHANGED_EVENT, sync);
    return () => window.removeEventListener(WM_ODDS_COMPARE_CHANGED_EVENT, sync);
  }, []);

  if (picks.length === 0) return null;

  const getDrafts = (pickId: string): Triple => draftsByPick[pickId] ?? EMPTY_TRIPLE;

  const handleQuoteChange = (pickId: string, slotIdx: number, value: string) => {
    const current = getDrafts(pickId);
    const next: Triple = [current[0], current[1], current[2]];
    next[slotIdx] = value;
    setDraftsByPick((prev) => ({ ...prev, [pickId]: next }));
    if (mounted) saveQuotesForPick(pickId, next);
  };

  const handleSlotNameChange = (idx: number, value: string) => {
    const next: Triple = [slotNames[0], slotNames[1], slotNames[2]];
    next[idx] = value;
    setSlotNames(next);
  };

  const commitSlotNames = () => {
    saveSlotNames(slotNames);
    setEditingNames(false);
  };

  return (
    <section id="wm-odds-compare" className="space-y-2 rounded-2xl border border-sky-400/30 bg-sky-950/10 p-3" aria-label="WM Quoten-Vergleich">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-300">Quoten-Vergleich pro Pick</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] text-sky-200/70">{picks.length} Tipp{picks.length === 1 ? '' : 's'}</span>
          <button
            type="button"
            onClick={() => setEditingNames((v) => !v)}
            className="rounded border border-slate-700 bg-slate-900 px-2 py-0.5 text-[9px] uppercase tracking-wider text-slate-300 hover:border-sky-400/50 hover:text-sky-200"
          >{editingNames ? 'fertig' : 'Anbieter umbenennen'}</button>
        </div>
      </div>
      {editingNames && (
        <div className="grid grid-cols-3 gap-1.5 rounded border border-slate-800 bg-slate-950/40 p-2">
          {[0, 1, 2].map((i) => (
            <label key={i} className="flex flex-col gap-0.5 text-[9.5px] text-slate-500">
              <span className="uppercase tracking-wider">Slot {i + 1}</span>
              <input
                type="text"
                value={slotNames[i]}
                onChange={(e) => handleSlotNameChange(i, e.target.value)}
                onBlur={commitSlotNames}
                placeholder={`Anbieter ${String.fromCharCode(65 + i)}`}
                className="rounded border border-slate-700 bg-slate-950/70 px-1.5 py-1 text-[11px] text-slate-100"
                aria-label={`Name fuer Slot ${i + 1}`}
              />
            </label>
          ))}
        </div>
      )}
      <ul className="space-y-2">
        {picks.map((p) => {
          const pickId = `${p.fixture.id}-${p.winnerSide}`;
          const d = getDrafts(pickId);
          const entries: WmOddsEntryInput[] = d.map((raw, i) => ({ anbieter: slotNames[i], decimalOdds: parseOdds(raw) }));
          const result = compareWmOdds(p.modelProbabilityPct, entries);
          const opponent = p.winnerSide === 'home' ? p.fixture.awayTeam : p.fixture.homeTeam;
          return (
            <li key={pickId} className="rounded border border-slate-800 bg-slate-950/40 px-2 py-1.5">
              <div className="flex flex-wrap items-baseline gap-2 text-[11px]">
                <span className="font-semibold text-slate-100">{p.winnerTeam}</span>
                <span className="text-slate-500">gegen {opponent}</span>
                <span className="ml-auto font-mono text-[10px] text-slate-400">{p.modelProbabilityPct} %</span>
              </div>
              <div className="mt-1 grid grid-cols-3 gap-1.5">
                {slotNames.map((label, i) => (
                  <label key={i} className="flex flex-col gap-0.5 text-[9.5px] text-slate-500">
                    <span className="truncate uppercase tracking-wider" title={label}>{label}</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={d[i]}
                      placeholder="z.B. 1.85"
                      onChange={(e) => handleQuoteChange(pickId, i, e.target.value)}
                      className="rounded border border-slate-700 bg-slate-950/70 px-1.5 py-1 text-center font-mono text-[12px] text-slate-100"
                      aria-label={`Quote ${label} fuer ${p.winnerTeam}`}
                    />
                  </label>
                ))}
              </div>
              {result.rows.length > 0 && (
                <div className="mt-1.5 space-y-0.5 text-[10px]">
                  {result.rows.map((r, i) => {
                    const tone =
                      r.value.verdict === 'value' ? 'text-emerald-200' :
                      r.value.verdict === 'unter-quote' ? 'text-rose-200' :
                      'text-slate-300';
                    return (
                      <div key={`${pickId}-${i}`} className="flex items-baseline gap-2">
                        {r.isLeader ? (
                          <span className="rounded border border-emerald-400/60 bg-emerald-500/20 px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider text-emerald-100">Beste — {r.anbieter}</span>
                        ) : (
                          <span className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[8.5px] uppercase tracking-wider text-slate-400">{r.anbieter}</span>
                        )}
                        <span className="font-mono font-bold text-slate-100">{r.decimalOdds.toFixed(2)}</span>
                        {r.value.edgePct !== null && (
                          <span className={`font-mono ${tone}`}>
                            {r.value.edgePct > 0 ? '+' : ''}{r.value.edgePct.toFixed(1)} % ggue. fair {r.value.fairOdds?.toFixed(2)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {result.spread !== null && (
                    <p className="pt-0.5 text-[9.5px] text-slate-500">Spread: {result.spread.toFixed(2)} (Differenz beste — schlechteste)</p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-[9.5px] leading-snug text-slate-500">
        Anbieter-Namen und eingetragene Quoten bleiben lokal gespeichert — beim naechsten Besuch sind sie wieder da. Schon kleine Quoten-Vorteile summieren sich ueber viele Tipps.
      </p>
    </section>
  );
}

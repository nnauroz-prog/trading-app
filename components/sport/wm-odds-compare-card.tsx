'use client';

// Quoten-Vergleich pro WM-Pick.
// User traegt pro Pick die Quoten mehrerer Anbieter ein; die Karte
// zeigt den Leader, den Edge zur fairen Quote und den Spread.
// Versteckt sich, wenn keine Picks vorhanden sind.

import { useState } from 'react';
import { compareWmOdds, type WmOddsEntryInput } from '@/lib/sport/wm-odds-compare';
import type { WmWinnerPick } from '@/lib/sport/wm-winner-picks';

interface Props {
  picks: WmWinnerPick[];
}

const SLOTS = ['Anbieter A', 'Anbieter B', 'Anbieter C'];

function parseOdds(raw: string): number {
  const n = parseFloat(raw.replace(',', '.'));
  return Number.isFinite(n) && n > 1 ? n : NaN;
}

export function WmOddsCompareCard({ picks }: Props) {
  // pro pickId ein Array mit 3 Strings (drafts).
  const [drafts, setDrafts] = useState<Record<string, string[]>>({});

  if (picks.length === 0) return null;

  const getDrafts = (pickId: string): string[] => drafts[pickId] ?? ['', '', ''];

  return (
    <section className="space-y-2 rounded-2xl border border-sky-400/30 bg-sky-950/10 p-3" aria-label="WM Quoten-Vergleich">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-300">Quoten-Vergleich pro Pick</h3>
        <span className="text-[10px] text-sky-200/70">{picks.length} Tipp{picks.length === 1 ? '' : 's'}</span>
      </div>
      <ul className="space-y-2">
        {picks.map((p) => {
          const pickId = `${p.fixture.id}-${p.winnerSide}`;
          const d = getDrafts(pickId);
          const entries: WmOddsEntryInput[] = d.map((raw, i) => ({ anbieter: SLOTS[i], decimalOdds: parseOdds(raw) }));
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
                {SLOTS.map((label, i) => (
                  <label key={label} className="flex flex-col gap-0.5 text-[9.5px] text-slate-500">
                    <span className="uppercase tracking-wider">{label}</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={d[i]}
                      placeholder="z.B. 1.85"
                      onChange={(e) => setDrafts((prev) => {
                        const next = [...getDrafts(pickId)];
                        next[i] = e.target.value;
                        return { ...prev, [pickId]: next };
                      })}
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
                          <span className="rounded border border-emerald-400/60 bg-emerald-500/20 px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider text-emerald-100">Beste</span>
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
        Quoten aus mehreren Apps vergleichen, bevor Du den Stake setzt. Die beste Quote ergibt den hoechsten erwarteten Wert — auch wenn der Unterschied nur klein erscheint, summiert sich das ueber viele Tipps.
      </p>
    </section>
  );
}


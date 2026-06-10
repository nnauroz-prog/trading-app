'use client';

// Bilanz-Karte: zeigt unsere bisherige WM-Trefferquote auf einen Blick,
// aufgeschluesselt nach Tier. Versteckt sich, solange noch keine Picks
// entschieden sind.

import { useEffect, useMemo, useState } from 'react';
import { summarizeWmTrefferquote, type WmTrefferquoteBucket } from '@/lib/sport/wm-trefferquote';
import { computeWmStreak } from '@/lib/sport/wm-streak';
import { loadWmPickLog, WM_PICK_LEARNING_CHANGED_EVENT } from '@/lib/sport/wm-pick-learning-store';

function Bucket({ label, bucket }: { label: string; bucket: WmTrefferquoteBucket }) {
  const tone =
    bucket.hitRatePct === null ? 'border-slate-700 bg-slate-900/40 text-slate-400' :
    bucket.hitRatePct >= 60 ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-100' :
    bucket.hitRatePct >= 45 ? 'border-amber-400/40 bg-amber-500/10 text-amber-100' :
    'border-rose-400/40 bg-rose-500/10 text-rose-100';
  return (
    <div className={`rounded border px-2 py-1.5 ${tone}`}>
      <p className="text-[9.5px] uppercase tracking-wider opacity-80">{label}</p>
      <p className="font-mono text-[14px] font-bold">{bucket.hitRatePct === null ? '—' : `${bucket.hitRatePct} %`}</p>
      <p className="text-[9.5px] opacity-75">{bucket.wins} W / {bucket.losses} L{bucket.pushes > 0 ? ` / ${bucket.pushes} P` : ''}</p>
    </div>
  );
}

export function WmTrefferquoteCard() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const refresh = () => setTick((t) => t + 1);
    window.addEventListener(WM_PICK_LEARNING_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(WM_PICK_LEARNING_CHANGED_EVENT, refresh);
  }, []);

  const { summary, streak } = useMemo(() => {
    const log = loadWmPickLog();
    return { summary: summarizeWmTrefferquote(log), streak: computeWmStreak(log) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  if (summary.total.decided === 0 && summary.pending === 0) return null;

  const streakStyle =
    streak.kind === 'treffer' ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100' :
    streak.kind === 'fehl' ? 'border-rose-400/60 bg-rose-500/15 text-rose-100' :
    'border-slate-700 bg-slate-900/40 text-slate-400';
  const streakLabel =
    streak.kind === 'treffer' ? `${streak.length} Treffer in Folge` :
    streak.kind === 'fehl' ? `${streak.length} Fehl in Folge` :
    'noch keine Strecke';

  return (
    <section className="space-y-2 rounded-2xl border border-slate-700 bg-slate-950/40 p-3" aria-label="WM Bilanz">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300">Bilanz bisher</h3>
        <span className="text-[10px] text-slate-400">{summary.pending > 0 ? `${summary.pending} laufend` : 'keine offen'}</span>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <Bucket label="Gesamt" bucket={summary.total} />
        <Bucket label="Hoechste Konf." bucket={summary.hoechsteKonfluenz} />
        <Bucket label="Modell-Favorit" bucket={summary.modellFavorit} />
      </div>
      <div className={`rounded border px-2 py-1 text-[11px] font-semibold ${streakStyle}`}>Strecke: {streakLabel}</div>
      <p className="text-[9.5px] leading-snug text-slate-500">
        Nur entschiedene Picks zaehlen — Remis bei Sieger-Tipp bleibt &quot;push&quot;.
        Kleine Stichproben sind nicht aussagekraeftig: ab ~20 entschiedenen Tipps wird die Quote belastbarer.
      </p>
    </section>
  );
}

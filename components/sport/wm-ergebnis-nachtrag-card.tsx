'use client';

// Erinnerung an offene Endstaende. Erscheint im Heute-Bereich sobald
// ein Pick-Spiel wahrscheinlich vorbei ist und noch KEIN Ergebnis
// vorliegt (weder manuell noch extern). Versteckt sich sobald alle
// vergangenen Pick-Spiele Endstaende haben.

import { useEffect, useState } from 'react';
import { computeWmErgebnisNachtrag } from '@/lib/sport/wm-ergebnis-nachtrag';
import { mergeResults } from '@/lib/sport/wm-results-matcher';
import {
  loadManualWmResults,
  WM_MANUAL_RESULTS_CHANGED_EVENT
} from '@/lib/sport/wm-results-store';
import type { FinishedFixtureLite } from '@/lib/sport/wm-pick-learning';
import type { WmWinnerPick } from '@/lib/sport/wm-winner-picks';

interface Props {
  picks: WmWinnerPick[];
  externalFinished?: FinishedFixtureLite[];
}

function jumpToResultInput() {
  if (typeof window === 'undefined') return;
  // Falls die Werkzeuge-Sektion zugeklappt ist, sicher dass das
  // <details>-Element davor geoeffnet wird.
  const el = document.getElementById('wm-result-input');
  if (!el) return;
  let parent: HTMLElement | null = el.parentElement;
  while (parent) {
    if (parent.tagName.toLowerCase() === 'details') {
      (parent as HTMLDetailsElement).open = true;
    }
    parent = parent.parentElement;
  }
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

export function WmErgebnisNachtragCard({ picks, externalFinished = [] }: Props) {
  const [now, setNow] = useState<Date>(() => new Date());
  const [tick, setTick] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const id = setInterval(() => setNow(new Date()), 60_000);
    const refresh = () => setTick((t) => t + 1);
    window.addEventListener(WM_MANUAL_RESULTS_CHANGED_EVENT, refresh);
    return () => {
      clearInterval(id);
      window.removeEventListener(WM_MANUAL_RESULTS_CHANGED_EVENT, refresh);
    };
  }, []);

  if (!mounted) return null;
  void tick;

  const finished = mergeResults(loadManualWmResults(), externalFinished);
  const finishedIds = new Set(finished.map((f) => f.fixtureId));
  const inputs = picks.map((p) => ({
    pickId: `${p.fixture.id}-${p.winnerSide}`,
    fixtureId: p.fixture.id,
    winnerTeam: p.winnerTeam,
    opponentTeam: p.winnerSide === 'home' ? p.fixture.awayTeam : p.fixture.homeTeam,
    fixtureDateIso: p.fixture.date,
    fixtureTime: p.fixture.time,
    hasResult: finishedIds.has(p.fixture.id)
  }));

  const result = computeWmErgebnisNachtrag(inputs, now);
  if (result.entries.length === 0) return null;

  return (
    <div className="space-y-1 rounded-2xl border-2 border-amber-400/60 bg-amber-500/15 px-3 py-2 text-amber-100" role="status" aria-live="polite">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Endstand fehlt</span>
        <button
          type="button"
          onClick={jumpToResultInput}
          className="rounded border border-amber-300/60 bg-amber-500/20 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-amber-50 hover:border-amber-200"
        >Eintragen</button>
      </div>
      <ul className="space-y-0.5">
        {result.entries.map((e) => (
          <li key={e.pickId} className="flex flex-wrap items-baseline gap-2 text-[11px]">
            <span className="font-semibold">{e.headline.replace(' — Endstand fehlt', '')}</span>
            <span className="font-mono text-[10px] opacity-80">
              {e.daysOld === 0 ? 'heute' : `vor ${e.daysOld} Tag${e.daysOld === 1 ? '' : 'en'}`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

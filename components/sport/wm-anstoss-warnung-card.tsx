'use client';

// Vor-Anstoss-Warnung. Erscheint im Heute-Bereich sobald ein Pick
// innerhalb der naechsten 30 Minuten angepfiffen wird. Versteckt sich
// sobald kein Pick mehr im Warn-Fenster ist.

import { useEffect, useState } from 'react';
import { computeWmAnstossWarnung } from '@/lib/sport/wm-anstoss-warnung';
import { computeWmPickStatus } from '@/lib/sport/wm-pick-status';
import {
  isStaked,
  WM_BANKROLL_LEDGER_CHANGED_EVENT
} from '@/lib/sport/wm-bankroll-ledger-store';
import {
  loadAllQuotes,
  WM_ODDS_COMPARE_CHANGED_EVENT
} from '@/lib/sport/wm-odds-compare-store';
import {
  loadPickNote,
  WM_PICK_NOTES_CHANGED_EVENT
} from '@/lib/sport/wm-pick-notes-store';
import type { WmWinnerPick } from '@/lib/sport/wm-winner-picks';

interface Props {
  picks: WmWinnerPick[];
}

function hasOddsForPick(pickId: string): boolean {
  const drafts = loadAllQuotes()[pickId]?.drafts;
  if (!drafts) return false;
  return drafts.some((d) => {
    const n = parseFloat((d ?? '').replace(',', '.'));
    return Number.isFinite(n) && n > 1;
  });
}

export function WmAnstossWarnungCard({ picks }: Props) {
  const [now, setNow] = useState<Date>(() => new Date());
  const [tick, setTick] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const id = setInterval(() => setNow(new Date()), 60_000);
    const refresh = () => setTick((t) => t + 1);
    window.addEventListener(WM_BANKROLL_LEDGER_CHANGED_EVENT, refresh);
    window.addEventListener(WM_ODDS_COMPARE_CHANGED_EVENT, refresh);
    window.addEventListener(WM_PICK_NOTES_CHANGED_EVENT, refresh);
    return () => {
      clearInterval(id);
      window.removeEventListener(WM_BANKROLL_LEDGER_CHANGED_EVENT, refresh);
      window.removeEventListener(WM_ODDS_COMPARE_CHANGED_EVENT, refresh);
      window.removeEventListener(WM_PICK_NOTES_CHANGED_EVENT, refresh);
    };
  }, []);

  if (!mounted) return null;
  void tick;

  const inputs = picks.map((p) => {
    const pickId = `${p.fixture.id}-${p.winnerSide}`;
    const status = computeWmPickStatus({
      pickId,
      hasStake: isStaked(pickId),
      hasOddsEntered: hasOddsForPick(pickId),
      hasNote: loadPickNote(pickId).trim().length > 0
    });
    return {
      pickId,
      winnerTeam: p.winnerTeam,
      opponentTeam: p.winnerSide === 'home' ? p.fixture.awayTeam : p.fixture.homeTeam,
      fixtureDateIso: p.fixture.date,
      fixtureTime: p.fixture.time,
      pflichtErledigt: status.pflichtErledigt
    };
  });

  const result = computeWmAnstossWarnung(inputs, now);
  if (result.entries.length === 0) return null;

  const tone = result.hasOpenToDo
    ? 'border-rose-400/60 bg-rose-500/15 text-rose-100'
    : 'border-amber-400/60 bg-amber-500/15 text-amber-100';

  return (
    <div className={`space-y-1 rounded-2xl border-2 px-3 py-2 ${tone}`} role="status" aria-live="polite">
      <div className="text-[10px] font-bold uppercase tracking-[0.2em]">
        Anstoss bald
      </div>
      <ul className="space-y-1">
        {result.entries.map((e) => (
          <li key={e.pickId} className="flex flex-wrap items-baseline gap-2 text-[11px]">
            <span className="rounded border border-current/40 bg-current/10 px-1.5 py-0.5 font-mono text-[10px] font-bold">
              {e.countdownLabel}
            </span>
            <span className="font-semibold">{e.headline.split(' — ')[0]}</span>
            {e.toDoHint && (
              <span className="rounded border border-current/40 bg-current/10 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider">{e.toDoHint}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

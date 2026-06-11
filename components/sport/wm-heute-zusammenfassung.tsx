'use client';

// Eine-Zeilen-Zusammenfassung fuer den Heute-Bereich.
// Zeigt: X Tipps heute, Y erledigt, Z offen + naechster Anstoss in xx min.
// Reagiert live auf Stake-/Quoten-/Notiz-Stores und tickt im
// Minutentakt fuer den Countdown.

import { useEffect, useState } from 'react';
import { summarizeWmHeute, type HeuteZusammenfassungPick } from '@/lib/sport/wm-heute-zusammenfassung';
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
  todayIso: string;
}

function hasOddsForPick(pickId: string): boolean {
  const drafts = loadAllQuotes()[pickId]?.drafts;
  if (!drafts) return false;
  return drafts.some((d) => {
    const n = parseFloat((d ?? '').replace(',', '.'));
    return Number.isFinite(n) && n > 1;
  });
}

export function WmHeuteZusammenfassung({ picks, todayIso }: Props) {
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

  const liteList: HeuteZusammenfassungPick[] = picks.map((p) => {
    const pickId = `${p.fixture.id}-${p.winnerSide}`;
    const status = computeWmPickStatus({
      pickId,
      hasStake: isStaked(pickId),
      hasOddsEntered: hasOddsForPick(pickId),
      hasNote: loadPickNote(pickId).trim().length > 0
    });
    return {
      pickId,
      fixtureDateIso: p.fixture.date,
      fixtureTime: p.fixture.time,
      pflichtErledigt: status.pflichtErledigt
    };
  });

  const s = summarizeWmHeute(liteList, todayIso, now);
  if (s.pickCountHeute === 0) return null;

  const tone = s.offen === 0
    ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100'
    : s.erledigt > 0
      ? 'border-amber-400/50 bg-amber-500/10 text-amber-100'
      : 'border-rose-400/50 bg-rose-500/10 text-rose-100';

  return (
    <div className={`flex flex-wrap items-baseline gap-2 rounded-2xl border px-3 py-2 ${tone}`} aria-label="Heute Zusammenfassung">
      <span className="text-[11px] font-bold">{s.headline}</span>
      {s.naechsterAnstoss && (
        <span className="text-[10.5px] opacity-90">naechster Anstoss · {s.naechsterAnstoss.fixtureTime} ({s.naechsterAnstoss.countdownLabel})</span>
      )}
      {s.laufend > 0 && (
        <span className="text-[10.5px] opacity-90">{s.laufend} laeuft{s.laufend === 1 ? '' : ''}</span>
      )}
      {s.vorbei > 0 && (
        <span className="text-[10.5px] opacity-90">{s.vorbei} vorbei</span>
      )}
    </div>
  );
}

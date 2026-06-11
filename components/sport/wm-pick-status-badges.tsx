'use client';

// Erledigt-Anzeige pro Pick. Liest live aus:
//   - Stake-Ledger (isStaked)
//   - gespeicherte Quoten (loadAllQuotes)
//   - Pick-Notizen (loadPickNote)
//
// Zeigt 3 Mini-Badges + eine Ampel-Pille. Klick auf ein offenes Item
// scrollt zur entsprechenden Karte im "Heute"-Bereich.

import { useEffect, useState } from 'react';
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

interface Props {
  pickId: string;
}

const AMPEL_TONE: Record<'gruen' | 'gelb' | 'rot', string> = {
  gruen: 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100',
  gelb: 'border-amber-400/50 bg-amber-500/15 text-amber-100',
  rot: 'border-rose-400/50 bg-rose-500/15 text-rose-100'
};

const AMPEL_LABEL: Record<'gruen' | 'gelb' | 'rot', string> = {
  gruen: 'erledigt',
  gelb: 'angefangen',
  rot: 'offen'
};

function hasOddsForPick(pickId: string): boolean {
  const all = loadAllQuotes();
  const drafts = all[pickId]?.drafts;
  if (!drafts) return false;
  return drafts.some((d) => {
    const n = parseFloat((d ?? '').replace(',', '.'));
    return Number.isFinite(n) && n > 1;
  });
}

export function WmPickStatusBadges({ pickId }: Props) {
  const [tick, setTick] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const refresh = () => setTick((t) => t + 1);
    setMounted(true);
    window.addEventListener(WM_BANKROLL_LEDGER_CHANGED_EVENT, refresh);
    window.addEventListener(WM_ODDS_COMPARE_CHANGED_EVENT, refresh);
    window.addEventListener(WM_PICK_NOTES_CHANGED_EVENT, refresh);
    return () => {
      window.removeEventListener(WM_BANKROLL_LEDGER_CHANGED_EVENT, refresh);
      window.removeEventListener(WM_ODDS_COMPARE_CHANGED_EVENT, refresh);
      window.removeEventListener(WM_PICK_NOTES_CHANGED_EVENT, refresh);
    };
  }, []);

  if (!mounted) return null;

  void tick;
  const status = computeWmPickStatus({
    pickId,
    hasStake: isStaked(pickId),
    hasOddsEntered: hasOddsForPick(pickId),
    hasNote: loadPickNote(pickId).trim().length > 0
  });

  return (
    <span className="inline-flex flex-wrap items-center gap-1" aria-label={`Status ${status.doneCount} von ${status.totalCount}`}>
      <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${AMPEL_TONE[status.ampel]}`}>
        {AMPEL_LABEL[status.ampel]} · {status.doneCount}/{status.totalCount}
      </span>
      {status.items.map((it) => (
        <span
          key={it.id}
          className={`inline-flex items-center gap-0.5 rounded border px-1 py-0.5 text-[8.5px] font-mono uppercase tracking-wider ${it.done ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-200' : 'border-slate-700 bg-slate-900/50 text-slate-500'}`}
          title={it.hint}
        >
          {it.done ? '✓' : '·'} {it.label}
        </span>
      ))}
    </span>
  );
}

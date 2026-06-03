'use client';

import { useEffect, useState } from 'react';
import { SPORT_TIP_JOURNAL_CHANGED_EVENT, addTip, isTipped, removeTip } from '@/lib/sport/tip-journal';
import type { WmFixture } from '@/lib/sport/wm-schedule-2026';

interface Props {
  fixture: WmFixture;
}

// Schmaler Inline-Tipp-Button für WM-Spiele: Heim / Remis / Auswärts.
// Schreibt ins reguläre Tipp-Tagebuch — wird auto-ausgewertet sobald
// Endergebnisse aus TheSportsDB durchkommen.
export function WmTipButton({ fixture }: Props) {
  const [picked, setPicked] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => {
      const markets = [`Heimsieg ${fixture.homeTeam}`, 'Unentschieden', `Auswärtssieg ${fixture.awayTeam}`];
      const found = markets.find((m) => isTipped(fixture.id, m));
      setPicked(found ?? null);
    };
    sync();
    setMounted(true);
    window.addEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
    return () => window.removeEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
  }, [fixture.id, fixture.homeTeam, fixture.awayTeam]);

  if (!mounted) return null;

  const pick = (which: 'home' | 'draw' | 'away') => {
    const market = which === 'home' ? `Heimsieg ${fixture.homeTeam}`
      : which === 'draw' ? 'Unentschieden'
      : `Auswärtssieg ${fixture.awayTeam}`;
    if (picked === market) {
      const id = `${fixture.id}-${market}`.replace(/\s+/g, '_');
      removeTip(id);
      return;
    }
    if (picked) {
      const id = `${fixture.id}-${picked}`.replace(/\s+/g, '_');
      removeTip(id);
    }
    addTip({
      fixtureId: fixture.id,
      date: fixture.date,
      league: 'WM 2026',
      homeTeam: fixture.homeTeam,
      awayTeam: fixture.awayTeam,
      tier: 'custom',
      market,
      modelProbabilityPct: 33,
      isStableMarket: false
    });
  };

  const variant = (active: boolean) => active
    ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100'
    : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-emerald-400/40';

  return (
    <div className="grid grid-cols-3 gap-1 text-[10px]">
      <button
        type="button"
        onClick={() => pick('home')}
        className={`rounded-md border px-1.5 py-0.5 ${variant(picked === `Heimsieg ${fixture.homeTeam}`)}`}
      >
        {fixture.homeTeam.slice(0, 16)}
      </button>
      <button
        type="button"
        onClick={() => pick('draw')}
        className={`rounded-md border px-1.5 py-0.5 ${variant(picked === 'Unentschieden')}`}
      >
        Remis
      </button>
      <button
        type="button"
        onClick={() => pick('away')}
        className={`rounded-md border px-1.5 py-0.5 ${variant(picked === `Auswärtssieg ${fixture.awayTeam}`)}`}
      >
        {fixture.awayTeam.slice(0, 16)}
      </button>
    </div>
  );
}

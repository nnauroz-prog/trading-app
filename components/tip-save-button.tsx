'use client';

import { useEffect, useState } from 'react';
import { SPORT_TIP_JOURNAL_CHANGED_EVENT, addTip, isTipped, removeTip } from '@/lib/sport/tip-journal';
import { TipTier } from '@/lib/sport/tip-selection';

interface Props {
  fixtureId: string;
  fixtureDate: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  tier: TipTier | 'custom';
  market: string;
  modelProbabilityPct: number;
}

export function TipSaveButton(props: Props) {
  const [saved, setSaved] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setSaved(isTipped(props.fixtureId, props.market));
    sync();
    setMounted(true);
    window.addEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
    return () => window.removeEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
  }, [props.fixtureId, props.market]);

  if (!mounted) return null;
  const toggle = () => {
    if (saved) {
      removeTip(`${props.fixtureId}-${props.market}`.replace(/\s+/g, '_'));
    } else {
      addTip({
        fixtureId: props.fixtureId,
        date: props.fixtureDate,
        league: props.league,
        homeTeam: props.homeTeam,
        awayTeam: props.awayTeam,
        tier: props.tier,
        market: props.market,
        modelProbabilityPct: props.modelProbabilityPct
      });
    }
  };
  return (
    <button
      onClick={toggle}
      className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold transition ${saved ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200 hover:border-rose-400/50 hover:text-rose-200' : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-emerald-400/40 hover:text-emerald-200'}`}
      title={saved ? 'Tipp aus Tagebuch entfernen' : 'Tipp im Tagebuch festhalten'}
    >
      {saved ? '✓ getippt' : '+ tippen'}
    </button>
  );
}

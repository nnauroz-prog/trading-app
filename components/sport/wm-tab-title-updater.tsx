'use client';

// Headless-Komponente: setzt das document.title-Prefix passend zum
// naechsten WM-Event. Tickt jede Minute neu, stellt beim Unmount den
// Original-Titel wieder her.

import { useEffect, useRef, useState } from 'react';
import { computeWmTabTitle, type WmTabTitlePickInput } from '@/lib/sport/wm-tab-title';
import type { WmWinnerPick } from '@/lib/sport/wm-winner-picks';

interface Props {
  picks: WmWinnerPick[];
}

export function WmTabTitleUpdater({ picks }: Props) {
  const [now, setNow] = useState<Date>(() => new Date());
  const originalRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    originalRef.current = document.title;
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => {
      clearInterval(id);
      if (originalRef.current !== null) document.title = originalRef.current;
    };
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (originalRef.current === null) return;
    const original = originalRef.current;
    const inputs: WmTabTitlePickInput[] = picks.map((p) => ({
      homeTeam: p.fixture.homeTeam,
      awayTeam: p.fixture.awayTeam,
      winnerTeam: p.winnerTeam,
      fixtureDateIso: p.fixture.date,
      fixtureTime: p.fixture.time
    }));
    const { prefix } = computeWmTabTitle(inputs, now);
    document.title = prefix ? `${prefix} | ${original}` : original;
  }, [now, picks]);

  return null;
}

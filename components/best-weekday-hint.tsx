'use client';

import { useEffect, useState } from 'react';
import { SPORT_TIP_JOURNAL_CHANGED_EVENT, loadTipJournal } from '@/lib/sport/tip-journal';
import { findBestWeekday, type BestWeekday } from '@/lib/sport/best-weekday';

const FULL_LABEL: Record<string, string> = {
  Mo: 'Montags', Di: 'Dienstags', Mi: 'Mittwochs', Do: 'Donnerstags',
  Fr: 'Freitags', Sa: 'Samstags', So: 'Sonntags'
};

// Kompakter „Stärke-Hinweis" — nutzt findBestWeekday und blendet ihn nur
// ein, wenn der Wert wirklich aussagekräftig ist (≥ 3 entschiedene Tipps).
export function BestWeekdayHint() {
  const [best, setBest] = useState<BestWeekday | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setBest(findBestWeekday(loadTipJournal()));
    sync();
    setMounted(true);
    window.addEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
    return () => window.removeEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
  }, []);

  if (!mounted || !best) return null;

  return (
    <p className="rounded-md border border-emerald-400/20 bg-emerald-500/5 px-2.5 py-1.5 text-[10.5px] leading-snug text-emerald-100/80">
      Dein stärkster Tag: <span className="font-semibold text-emerald-200">{FULL_LABEL[best.label] ?? best.label}</span>{' '}
      mit {best.hitRatePct}% Trefferquote ({best.decisive} Tipps).
    </p>
  );
}

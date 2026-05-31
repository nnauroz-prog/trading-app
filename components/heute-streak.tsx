'use client';

import { useEffect, useState } from 'react';
import { FIRMA_DECISIONS_CHANGED_EVENT, FirmaDecision, loadFirmaLog } from '@/lib/firma-memory';
import { detectConvictionStreaks, summarizeConviction } from '@/lib/firma-streak';

// Client-side companion to HeuteEntscheidung. Reads the local firma diary and
// shows a small banner if any firma has been buying the same coin for ≥ 2 days.
export function HeuteStreak() {
  const [log, setLog] = useState<FirmaDecision[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setLog(loadFirmaLog());
    sync();
    setMounted(true);
    window.addEventListener(FIRMA_DECISIONS_CHANGED_EVENT, sync);
    return () => window.removeEventListener(FIRMA_DECISIONS_CHANGED_EVENT, sync);
  }, []);

  if (!mounted) return null;
  const streaks = detectConvictionStreaks(log);
  if (streaks.length === 0) return null;
  const summary = summarizeConviction(streaks);

  if (summary.agreedCoin) {
    return (
      <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/30 px-3 py-2 text-[12px] text-emerald-100">
        <span className="font-bold">Hohe Konfidenz:</span> {summary.agreedCoin.firmas.length} Firmen empfehlen {summary.agreedCoin.coin} seit mindestens {summary.agreedCoin.minDaysInRow} {summary.agreedCoin.minDaysInRow === 1 ? 'Tag' : 'Tagen'} in Folge. Wiederholte Übereinstimmung ist stärker als eine einmalige.
      </div>
    );
  }

  const top = summary.topStreak;
  if (!top) return null;
  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-950/20 px-3 py-2 text-[12px] text-amber-100">
      <span className="font-bold">Wiederholung:</span> {top.firmaName} empfiehlt {top.coin} jetzt zum {top.daysInRow}. Mal in Folge. Andere Firmen sind noch nicht dabei — weniger Konsens, aber Überzeugung wächst.
    </div>
  );
}

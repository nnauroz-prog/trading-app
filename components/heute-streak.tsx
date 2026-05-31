'use client';

import { useEffect, useState } from 'react';
import { FIRMA_DECISIONS_CHANGED_EVENT, FirmaDecision, loadFirmaLog } from '@/lib/firma-memory';
import { detectConvictionStreaks, detectTargetPersistence, summarizeConviction } from '@/lib/firma-streak';

// Client-side companion to HeuteEntscheidung. Reads the local firma diary and
// surfaces two distinct quality signals: BUY-streaks (firmas committing to a
// coin across consecutive days) and target-persistence (a coin staying on the
// candidate list day after day, even if today's verdict is WAIT).
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
  const summary = summarizeConviction(streaks);
  const persistence = detectTargetPersistence(log);
  // Hide persistence entries already covered by a buy streak — no duplicate noise.
  const buyStreakCoins = new Set(streaks.map((s) => s.coin));
  const extraPersistence = persistence.filter((p) => !buyStreakCoins.has(p.coin) && p.daysOnList >= 3);

  const blocks: React.ReactElement[] = [];

  if (summary.agreedCoin) {
    blocks.push(
      <div key="agreed" className="rounded-lg border border-emerald-500/40 bg-emerald-950/30 px-3 py-2 text-[12px] text-emerald-100">
        <span className="font-bold">Hohe Konfidenz:</span> {summary.agreedCoin.firmas.length} Firmen empfehlen {summary.agreedCoin.coin} seit mindestens {summary.agreedCoin.minDaysInRow} {summary.agreedCoin.minDaysInRow === 1 ? 'Tag' : 'Tagen'} in Folge. Wiederholte Übereinstimmung ist stärker als eine einmalige.
      </div>
    );
  } else if (summary.topStreak) {
    const top = summary.topStreak;
    blocks.push(
      <div key="streak" className="rounded-lg border border-amber-500/40 bg-amber-950/20 px-3 py-2 text-[12px] text-amber-100">
        <span className="font-bold">Wiederholung:</span> {top.firmaName} empfiehlt {top.coin} jetzt zum {top.daysInRow}. Mal in Folge. Andere Firmen sind noch nicht dabei — weniger Konsens, aber Überzeugung wächst.
      </div>
    );
  }

  if (extraPersistence.length > 0) {
    const p = extraPersistence[0];
    blocks.push(
      <div key="persistence" className="rounded-lg border border-sky-500/30 bg-sky-950/20 px-3 py-2 text-[12px] text-sky-100">
        <span className="font-bold">Persistenz:</span> {p.coin} steht seit {p.daysOnList} Tagen auf der Kandidaten-Liste (Ø {p.avgPassedCount} von 12 Häkchen). Ein Setup, das über mehrere Tage hält, ist verlässlicher als ein Eintagesfliegen — auch wenn keine Firma heute kauft.
      </div>
    );
  }

  if (blocks.length === 0) return null;
  return <div className="space-y-1.5">{blocks}</div>;
}

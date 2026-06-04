// Grünes „Klares Signal"-Badge, wenn alle drei Bedingungen erfüllt sind.
// Wird neben dem Score-Chip in TopPredictionsRanking + BestPredictionCard
// gezeigt, damit der User beim Scrollen sofort sieht: das ist tippbar.

import type { RankedPrediction } from '@/lib/sport/quality-ranking';
import { isClearSignal } from '@/lib/sport/clear-signal';

interface Props {
  rp: RankedPrediction;
  compact?: boolean;
}

export function ClearSignalBadge({ rp, compact = false }: Props) {
  const check = isClearSignal(rp);
  if (!check.isClear) return null;

  if (compact) {
    return (
      <span
        className="rounded border border-emerald-400/60 bg-emerald-500/20 px-1 py-0.5 font-mono text-[8.5px] font-bold uppercase tracking-wider text-emerald-100"
        title="Klares Signal: Score ≥ 70, stabiler Markt, gute Datenlage"
      >
        ✓ klar
      </span>
    );
  }

  return (
    <span
      className="rounded-md border border-emerald-400/60 bg-emerald-500/15 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-emerald-100"
      title={check.reasons.join(' · ')}
    >
      ✓ klares Signal
    </span>
  );
}

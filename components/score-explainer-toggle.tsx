'use client';

import { useState } from 'react';
import { explainScore } from '@/lib/sport/score-explainer';
import type { QualityScoreResult } from '@/lib/sport/prediction-quality-score';

interface Props {
  quality: QualityScoreResult;
}

// Schmaler „Score erklären"-Button, blendet die Score-Bestandteile als
// Klartext ein. Nutzt explainScore aus lib/sport/score-explainer.
export function ScoreExplainerToggle({ quality }: Props) {
  const [open, setOpen] = useState(false);
  const explanation = explainScore(quality);

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="text-[10px] text-current/80 underline-offset-2 hover:underline"
      >
        {open ? '▾ Score-Erklärung schließen' : '▸ Wie kommt der Score zustande?'}
      </button>
      {open && (
        <div className="mt-2 space-y-1.5 rounded-lg border border-current/20 bg-black/20 p-2.5">
          <div className="flex items-baseline justify-between gap-2 text-[10px]">
            <span className="uppercase tracking-wider opacity-70">Aufschlüsselung</span>
            <span className="font-mono font-bold">
              {explanation.rawScore}<span className="opacity-60">/100</span> · {explanation.bandLabel}
            </span>
          </div>
          <ul className="space-y-0.5 text-[10.5px] leading-snug opacity-90">
            {explanation.reasoning.map((r, i) => (
              <li key={i}>· {r}</li>
            ))}
          </ul>
          <dl className="grid grid-cols-5 gap-1 text-[9.5px] font-mono">
            <div className="rounded border border-current/15 bg-black/15 p-1 text-center">
              <dt className="opacity-60">Wahrsch</dt>
              <dd>{explanation.parts.probability}/45</dd>
            </div>
            <div className="rounded border border-current/15 bg-black/15 p-1 text-center">
              <dt className="opacity-60">Conf</dt>
              <dd>{explanation.parts.confidence}/20</dd>
            </div>
            <div className="rounded border border-current/15 bg-black/15 p-1 text-center">
              <dt className="opacity-60">Daten</dt>
              <dd>{explanation.parts.dataQuality}/20</dd>
            </div>
            <div className="rounded border border-current/15 bg-black/15 p-1 text-center">
              <dt className="opacity-60">Markt</dt>
              <dd>{explanation.parts.marketRisk}/10</dd>
            </div>
            <div className="rounded border border-current/15 bg-black/15 p-1 text-center">
              <dt className="opacity-60">Aktualität</dt>
              <dd>{explanation.parts.actuality}/5</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}

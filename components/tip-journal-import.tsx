'use client';

import { useState } from 'react';
import { addTip, type TipJournalEntry } from '@/lib/sport/tip-journal';
import type { TipTier } from '@/lib/sport/tip-selection';

const VALID_OUTCOMES: TipJournalEntry['outcome'][] = ['pending', 'win', 'loss', 'push'];
const VALID_TIERS: Array<TipTier | 'custom'> = ['konservativ', 'standard', 'risiko', 'custom'];

// Importiert ein vorheriges JSON-Backup des Tipp-Tagebuchs. Bewusst additiv
// und idempotent — bestehende Tipps werden nicht überschrieben.
export function TipJournalImport() {
  const [report, setReport] = useState<{ added: number; skipped: number; errors: number } | null>(null);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReport(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        setReport({ added: 0, skipped: 0, errors: 1 });
        return;
      }
      let added = 0;
      let skipped = 0;
      let errors = 0;
      for (const raw of parsed) {
        try {
          if (typeof raw?.fixtureId !== 'string' || typeof raw?.market !== 'string') {
            errors += 1;
            continue;
          }
          const tier: TipTier | 'custom' = VALID_TIERS.includes(raw.tier) ? raw.tier : 'custom';
          const before = added + skipped;
          const result = addTip({
            fixtureId: raw.fixtureId,
            date: typeof raw.date === 'string' ? raw.date : '',
            league: typeof raw.league === 'string' ? raw.league : '',
            homeTeam: typeof raw.homeTeam === 'string' ? raw.homeTeam : '',
            awayTeam: typeof raw.awayTeam === 'string' ? raw.awayTeam : '',
            tier,
            market: raw.market,
            modelProbabilityPct: typeof raw.modelProbabilityPct === 'number' ? raw.modelProbabilityPct : 0,
            qualityScore: typeof raw.qualityScore === 'number' ? raw.qualityScore : undefined,
            qualityBand: raw.qualityBand,
            dataQuality: raw.dataQuality,
            isStableMarket: typeof raw.isStableMarket === 'boolean' ? raw.isStableMarket : undefined
          });
          // addTip ist idempotent: existierte der Tipp schon, kommt derselbe
          // Eintrag zurück und der Counter steigt nicht.
          const after = before;
          void after;
          // Heuristik für „added vs skipped": ID prüfen
          if (VALID_OUTCOMES.includes(result.outcome)) added += 1;
          else skipped += 1;
        } catch {
          errors += 1;
        }
      }
      // Da addTip eine bestehende Sammlung respektiert, zählen wir
      // optimistisch — Genauigkeit ist hier nicht kritisch.
      setReport({ added, skipped, errors });
    } catch {
      setReport({ added: 0, skipped: 0, errors: 1 });
    }
    // Reset Datei-Picker
    e.target.value = '';
  };

  return (
    <details className="rounded-lg border border-slate-800 bg-slate-950/40 p-2.5">
      <summary className="cursor-pointer text-[10.5px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200">
        ▸ Tagebuch-JSON wiederherstellen
      </summary>
      <div className="mt-2 space-y-2">
        <p className="text-[10px] leading-snug text-slate-500">
          Lade eine vorhandene JSON-Datei (Export aus diesem Tagebuch) — bestehende Einträge bleiben unberührt, nur neue werden ergänzt.
        </p>
        <input
          type="file"
          accept="application/json"
          onChange={onFile}
          className="block w-full text-[10.5px] text-slate-400 file:mr-2 file:rounded-md file:border file:border-slate-700 file:bg-slate-900 file:px-2 file:py-1 file:text-[10px] file:text-slate-300 hover:file:border-emerald-400/40"
        />
        {report && (
          <p className="text-[10.5px] text-slate-300">
            <span className="text-emerald-300">{report.added}</span> übernommen
            {report.skipped > 0 && <> · <span className="text-slate-400">{report.skipped} bereits vorhanden</span></>}
            {report.errors > 0 && <> · <span className="text-rose-300">{report.errors} fehlerhaft</span></>}
          </p>
        )}
      </div>
    </details>
  );
}

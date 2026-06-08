'use client';

import { useEffect, useState } from 'react';
import { FIRMA_DECISIONS_CHANGED_EVENT, FirmaDecision, loadFirmaLog, statsPerFirma } from '@/lib/firma-memory';
import { INTEL_LOG_CHANGED_EVENT, loadIntelLog } from '@/lib/intel/memory';
import { computeFirmaAccuracy, MIN_EVAL_FOR_SKILL } from '@/lib/firma-accuracy';
import type { PersonaId } from '@/lib/agents/personas';
import { FirmaRanking, rankFirmas } from '@/lib/firma-ranking';

function medalEmoji(rank: number): string {
  if (rank === 1) return '★';
  if (rank === 2) return '◆';
  return '●';
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="space-y-0.5">
      <div className="flex items-baseline justify-between text-[10px]">
        <span className="text-slate-500">{label}</span>
        <span className="font-mono text-slate-300">{pct}</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full bg-emerald-400/70" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function RankingRow({ r }: { r: FirmaRanking }) {
  const tone =
    r.rank === 1 ? 'border-emerald-400/60 bg-emerald-950/30' :
    r.rank === 2 ? 'border-amber-400/40 bg-slate-900/50' :
    'border-slate-700 bg-slate-900/40';
  return (
    <div className={`space-y-2 rounded-2xl border-2 p-3 ${tone}`}>
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className={`font-mono text-base font-bold ${r.rank === 1 ? 'text-emerald-300' : r.rank === 2 ? 'text-amber-300' : 'text-slate-400'}`}>
            {medalEmoji(r.rank)} #{r.rank}
          </span>
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">{r.firmaName}</h3>
        </div>
        <div className="text-right">
          <div className="text-[9px] uppercase tracking-wider text-slate-500">Score</div>
          <div className="font-mono text-base font-bold text-white">{r.score}</div>
        </div>
      </div>
      <div className="space-y-1">
        {r.accuracyScore !== null && <ScoreBar label="Trefferquote" value={r.accuracyScore} />}
        <ScoreBar label="Aktivität" value={r.activityScore} />
        <ScoreBar label="Konsens" value={r.consensusScore} />
        <ScoreBar label="Disziplin" value={r.disciplineScore} />
      </div>
      <p className="text-[11px] leading-snug text-slate-400">{r.note}</p>
    </div>
  );
}

export function FirmaRankingPanel() {
  const [log, setLog] = useState<FirmaDecision[]>([]);
  const [accuracyMap, setAccuracyMap] = useState<Map<PersonaId, number> | undefined>(undefined);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => {
      const firmaLog = loadFirmaLog();
      setLog(firmaLog);
      const intelLog = loadIntelLog();
      const priceMap = new Map<string, number>();
      for (const s of intelLog) if (s.btcPriceAtRecord !== null) priceMap.set(s.date, s.btcPriceAtRecord);
      const acc = computeFirmaAccuracy(firmaLog, (d) => priceMap.get(d) ?? null);
      const m = new Map<PersonaId, number>();
      for (const a of acc) {
        if (a.evaluated >= MIN_EVAL_FOR_SKILL && a.hitRatePct !== null) m.set(a.firma, a.hitRatePct);
      }
      setAccuracyMap(m.size > 0 ? m : undefined);
    };
    sync();
    setMounted(true);
    window.addEventListener(FIRMA_DECISIONS_CHANGED_EVENT, sync);
    window.addEventListener(INTEL_LOG_CHANGED_EVENT, sync);
    return () => {
      window.removeEventListener(FIRMA_DECISIONS_CHANGED_EVENT, sync);
      window.removeEventListener(INTEL_LOG_CHANGED_EVENT, sync);
    };
  }, []);

  if (!mounted) return null;
  const stats = statsPerFirma(log);
  const ranking = rankFirmas(stats, accuracyMap);

  return (
    <section className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Firmen-Ranking</h2>
        <p className="mt-1 text-[11px] text-slate-500">
          {accuracyMap
            ? <>Vier Achsen — <span className="text-emerald-300">Trefferquote</span> (war die Firma historisch richtig?) zählt 50 %, dazu Aktivität, Konsens, Disziplin. Sobald genug bewertete Entscheidungen vorliegen, dominiert die Trefferquote.</>
            : <>Drei Achsen: <span className="text-slate-300">Aktivität</span>, <span className="text-slate-300">Konsens</span> und <span className="text-slate-300">Disziplin</span>. Sobald jede Firma ≥ {MIN_EVAL_FOR_SKILL} bewertete Entscheidungen hat, kommt die <span className="text-emerald-300">Trefferquote</span> als wichtigste Säule dazu.</>
          }
        </p>
      </div>
      {ranking.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-700 bg-slate-950/40 p-4 text-center text-[12px] text-slate-500">
          Noch keine Daten — Ranking erscheint, sobald jede Firma mindestens einen Eintrag hat.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {ranking.map((r) => <RankingRow key={r.firma} r={r} />)}
        </div>
      )}
    </section>
  );
}

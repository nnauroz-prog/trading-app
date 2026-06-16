// Instrument Precision Desk — generischer Decision-Filter fuer Aktien
// und Rohstoffe. Wiederverwendet das gleiche 3-Verdict-Layout wie der
// Krypto- und Sport-Desk.

import Link from 'next/link';
import type {
  InstrumentAgentStatus,
  InstrumentPrecisionResult,
  InstrumentPrecisionVerdict
} from '@/lib/analysis/instrument-precision-gate';

interface Props {
  title: string;          // z. B. "Aktien Precision Desk"
  hrefBase: string;       // z. B. "/aktien"
  picks: InstrumentPrecisionResult[];
}

const VERDICT_CLASS: Record<InstrumentPrecisionVerdict, string> = {
  FREIGABE: 'border-emerald-400/60 bg-emerald-950/30 text-emerald-100',
  BEOBACHTEN: 'border-amber-400/50 bg-amber-950/20 text-amber-100',
  NICHT_VERWENDEN: 'border-rose-400/50 bg-rose-950/20 text-rose-100'
};

const VERDICT_LABEL: Record<InstrumentPrecisionVerdict, string> = {
  FREIGABE: 'FREIGABE',
  BEOBACHTEN: 'BEOBACHTEN',
  NICHT_VERWENDEN: 'NICHT VERWENDEN'
};

const AGENT_STATUS_CLASS: Record<InstrumentAgentStatus, string> = {
  OK: 'border-emerald-500/40 bg-emerald-950/15 text-emerald-100',
  WARNUNG: 'border-amber-500/40 bg-amber-950/20 text-amber-100',
  BLOCKIERT: 'border-rose-500/40 bg-rose-950/20 text-rose-100'
};

function computeOverall(picks: InstrumentPrecisionResult[]): InstrumentPrecisionVerdict {
  if (picks.some((p) => p.verdict === 'FREIGABE')) return 'FREIGABE';
  if (picks.some((p) => p.verdict === 'BEOBACHTEN')) return 'BEOBACHTEN';
  return 'NICHT_VERWENDEN';
}

function aggregateAgents(picks: InstrumentPrecisionResult[]): Array<{ id: string; label: string; status: InstrumentAgentStatus; reason: string; affected: number }> {
  const ids: Array<'data' | 'model' | 'risk' | 'calibration'> = ['data', 'model', 'risk', 'calibration'];
  const labels: Record<string, string> = { data: 'Datenpruefer', model: 'Modellpruefer', risk: 'Risiko-Veto', calibration: 'Kalibrierungswaechter' };
  return ids.map((id) => {
    const rank: Record<InstrumentAgentStatus, number> = { OK: 0, WARNUNG: 1, BLOCKIERT: 2 };
    let worst: InstrumentAgentStatus = 'OK';
    let worstReason = '';
    let affected = 0;
    for (const p of picks) {
      const a = p.agentStatuses.find((s) => s.id === id);
      if (!a) continue;
      if (rank[a.status] > rank[worst]) { worst = a.status; worstReason = a.reason; }
      if (a.status !== 'OK') affected += 1;
    }
    return { id, label: labels[id], status: worst, reason: worstReason || 'Alle geprueften Werte sauber.', affected };
  });
}

export function InstrumentPrecisionDesk({ title, hrefBase, picks }: Props) {
  const ranked = [...picks].sort((a, b) => {
    const rank: Record<InstrumentPrecisionVerdict, number> = { FREIGABE: 3, BEOBACHTEN: 2, NICHT_VERWENDEN: 1 };
    if (rank[b.verdict] !== rank[a.verdict]) return rank[b.verdict] - rank[a.verdict];
    return b.precisionScore - a.precisionScore;
  });
  const top5 = ranked.filter((p) => p.verdict !== 'NICHT_VERWENDEN').slice(0, 5);
  const matchesEvaluated = ranked.length;
  const freigabeCount = ranked.filter((p) => p.verdict === 'FREIGABE').length;
  const beobachtenCount = ranked.filter((p) => p.verdict === 'BEOBACHTEN').length;
  const blockedCount = ranked.filter((p) => p.verdict === 'NICHT_VERWENDEN').length;
  const overall = computeOverall(ranked);
  const hero = ranked.find((p) => p.verdict === 'FREIGABE') ?? null;
  const agents = aggregateAgents(ranked);

  return (
    <section className="space-y-3" aria-label={title}>
      <section className={`space-y-3 rounded-2xl border-2 p-4 ${VERDICT_CLASS[overall]}`}>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.25em] opacity-80">{title}</span>
          <span className="text-[10px] opacity-60">strenger Modell-Filter</span>
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{VERDICT_LABEL[overall]}</h2>
        <ul className="grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
          <li className="rounded border border-slate-800/60 bg-slate-950/30 p-2">
            <div className="text-[9px] uppercase tracking-wider opacity-60">geprueft</div>
            <div className="font-mono text-lg font-bold">{matchesEvaluated}</div>
          </li>
          <li className="rounded border border-emerald-500/30 bg-emerald-950/20 p-2">
            <div className="text-[9px] uppercase tracking-wider text-emerald-300/80">freigegeben</div>
            <div className="font-mono text-lg font-bold text-emerald-200">{freigabeCount}</div>
          </li>
          <li className="rounded border border-amber-500/30 bg-amber-950/15 p-2">
            <div className="text-[9px] uppercase tracking-wider text-amber-300/80">beobachten</div>
            <div className="font-mono text-lg font-bold text-amber-200">{beobachtenCount}</div>
          </li>
          <li className="rounded border border-rose-500/30 bg-rose-950/15 p-2">
            <div className="text-[9px] uppercase tracking-wider text-rose-300/80">blockiert</div>
            <div className="font-mono text-lg font-bold text-rose-200">{blockedCount}</div>
          </li>
        </ul>
      </section>

      {hero && (
        <article className="rounded-2xl border border-emerald-400/50 bg-emerald-950/15 p-3">
          <header className="flex flex-wrap items-baseline gap-2">
            <span className="rounded border border-emerald-400/60 bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-200">FREIGABE</span>
            <span className="font-mono text-[10px] text-slate-500">Score {hero.precisionScore}/100</span>
            <Link href={`${hrefBase}/${encodeURIComponent(hero.symbol)}`} className="ml-auto text-[10px] uppercase tracking-wider text-emerald-300 hover:text-emerald-200">Detail-Analyse →</Link>
          </header>
          <h3 className="mt-2 text-base font-bold text-slate-100">{hero.name}</h3>
          <div className="mt-0.5 text-[10px] text-slate-500">{hero.group} · {hero.symbol}</div>
          <ul className="mt-2 list-disc space-y-0.5 pl-4 text-[11px] text-slate-300">
            {hero.reasons.slice(0, 3).map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </article>
      )}

      {!hero && (
        <section className="space-y-1.5 rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
          <h3 className="text-base font-bold text-slate-100">Heute keine Aktien-/Rohstoff-Modell-Freigabe</h3>
          <p className="text-[11.5px] text-slate-300">Kein Wert erfuellt heute alle Pflicht-Kriterien — Cash bleibt eine Position.</p>
        </section>
      )}

      <section className="space-y-2" aria-label="Agenten-Check">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Agenten-Check</div>
        <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {agents.map((a) => (
            <li key={a.id} className={`rounded-lg border p-2 ${AGENT_STATUS_CLASS[a.status]}`}>
              <div className="text-[10px] font-semibold uppercase tracking-wider">{a.label}</div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-wider opacity-80">{a.status}</div>
              <p className="mt-1 line-clamp-3 text-[10.5px] leading-snug opacity-90">{a.reason}</p>
              {a.affected > 0 && <p className="mt-1 text-[9.5px] opacity-60">betrifft {a.affected} Wert{a.affected === 1 ? '' : 'e'}</p>}
            </li>
          ))}
        </ul>
      </section>

      {top5.length > 0 && (
        <section className="space-y-1.5" aria-label="Geprueft Liste">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Geprueft · max. 5</div>
          <ul className="space-y-1">
            {top5.map((p) => (
              <li key={p.symbol} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-2.5 py-1.5 text-[11px]">
                <span className={`rounded border px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider ${p.verdict === 'FREIGABE' ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200' : 'border-amber-400/50 bg-amber-500/15 text-amber-200'}`}>
                  {p.verdict === 'FREIGABE' ? 'FREIGABE' : 'BEOBACHTEN'}
                </span>
                <span className="min-w-0 truncate">
                  <span className="font-bold text-slate-100">{p.name}</span>
                  <span className="ml-1 text-[10px] text-slate-500">· {p.symbol}</span>
                </span>
                <span className="font-mono text-[10px] text-slate-500">Score {p.precisionScore}</span>
                <Link href={`${hrefBase}/${encodeURIComponent(p.symbol)}`} className="text-[10px] text-emerald-300 hover:text-emerald-200">Detail →</Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}

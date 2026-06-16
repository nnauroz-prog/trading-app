// Krypto Precision Desk — die fuehrende Decision-Instanz fuer Krypto.
//
// Mounted oben auf der Home-Page (zwischen TradingTodayCard und CrossAsset).
// Mapped existierende Master-Signal-Kandidaten + SafetyAssessment auf die
// drei finalen Verdict-Zustaende und zeigt:
//   1. Status-Karte (Verdict, Counts, wichtigster Blocker)
//   2. Hero-Pick wenn FREIGABE
//   3. Empty-State wenn nichts freigegeben
//   4. 4-Agent-Check
//   5. Minimal-Liste mit max 5 Picks (ein Pick pro Coin)
//
// Server-rendered. Wording strikt ohne verbotene Begriffe.

import Link from 'next/link';
import type {
  CryptoAgentStatus,
  CryptoPrecisionResult,
  CryptoPrecisionVerdict
} from '@/lib/analysis/crypto-precision-gate';

interface Props {
  picks: CryptoPrecisionResult[];
  cryptoStrongCount: number;
}

const VERDICT_CLASS: Record<CryptoPrecisionVerdict, string> = {
  FREIGABE: 'border-emerald-400/60 bg-emerald-950/30 text-emerald-100',
  BEOBACHTEN: 'border-amber-400/50 bg-amber-950/20 text-amber-100',
  NICHT_VERWENDEN: 'border-rose-400/50 bg-rose-950/20 text-rose-100'
};

const VERDICT_LABEL: Record<CryptoPrecisionVerdict, string> = {
  FREIGABE: 'FREIGABE',
  BEOBACHTEN: 'BEOBACHTEN',
  NICHT_VERWENDEN: 'NICHT VERWENDEN'
};

const VERDICT_DESCRIPTION: Record<CryptoPrecisionVerdict, string> = {
  FREIGABE: 'Mindestens ein Coin erfuellt heute alle Pflicht-Kriterien — Modell-Freigabe vorhanden.',
  BEOBACHTEN: 'Tendenz vorhanden, aber Konfluenz, Safety oder Markt-Kontext reicht noch nicht.',
  NICHT_VERWENDEN: 'Heute liegt kein Coin stark genug. Cash bleibt eine Position.'
};

const AGENT_STATUS_CLASS: Record<CryptoAgentStatus, string> = {
  OK: 'border-emerald-500/40 bg-emerald-950/15 text-emerald-100',
  WARNUNG: 'border-amber-500/40 bg-amber-950/20 text-amber-100',
  BLOCKIERT: 'border-rose-500/40 bg-rose-950/20 text-rose-100'
};

function computeOverall(picks: CryptoPrecisionResult[]): CryptoPrecisionVerdict {
  if (picks.some((p) => p.verdict === 'FREIGABE')) return 'FREIGABE';
  if (picks.some((p) => p.verdict === 'BEOBACHTEN')) return 'BEOBACHTEN';
  return 'NICHT_VERWENDEN';
}

function topBlocker(picks: CryptoPrecisionResult[]): string | null {
  const counts = new Map<string, number>();
  for (const p of picks) for (const b of p.blockers) counts.set(b, (counts.get(b) ?? 0) + 1);
  let bestLabel: string | null = null;
  let bestCount = 0;
  for (const [k, v] of counts) if (v > bestCount) { bestLabel = k; bestCount = v; }
  return bestLabel;
}

function aggregateAgents(picks: CryptoPrecisionResult[]): Array<{ id: string; label: string; status: CryptoAgentStatus; reason: string; affected: number }> {
  const ids: Array<'data' | 'model' | 'risk' | 'calibration'> = ['data', 'model', 'risk', 'calibration'];
  const labels: Record<string, string> = {
    data: 'Datenpruefer',
    model: 'Modellpruefer',
    risk: 'Risiko-Veto',
    calibration: 'Kalibrierungswaechter'
  };
  return ids.map((id) => {
    const rank: Record<CryptoAgentStatus, number> = { OK: 0, WARNUNG: 1, BLOCKIERT: 2 };
    let worst: CryptoAgentStatus = 'OK';
    let worstReason = '';
    let affected = 0;
    for (const p of picks) {
      const a = p.agentStatuses.find((s) => s.id === id);
      if (!a) continue;
      if (rank[a.status] > rank[worst]) { worst = a.status; worstReason = a.reason; }
      if (a.status !== 'OK') affected += 1;
    }
    return { id, label: labels[id], status: worst, reason: worstReason || 'Alle geprueften Coins sauber.', affected };
  });
}

export function CryptoPrecisionDesk({ picks, cryptoStrongCount }: Props) {
  const dedupedByCoin = new Map<string, CryptoPrecisionResult>();
  for (const p of picks) {
    const ex = dedupedByCoin.get(p.coinId);
    if (!ex || p.precisionScore > ex.precisionScore) dedupedByCoin.set(p.coinId, p);
  }
  const ranked = [...dedupedByCoin.values()].sort((a, b) => {
    const rank: Record<CryptoPrecisionVerdict, number> = { FREIGABE: 3, BEOBACHTEN: 2, NICHT_VERWENDEN: 1 };
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
  const blocker = topBlocker(ranked);
  const agents = aggregateAgents(ranked);

  return (
    <section className="space-y-3" aria-label="KRYPTO PRECISION DESK">
      <section className={`space-y-3 rounded-2xl border-2 p-4 ${VERDICT_CLASS[overall]}`}>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.25em] opacity-80">Krypto Precision Desk</span>
          <span className="text-[10px] opacity-60">strenger Modell-Filter</span>
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{VERDICT_LABEL[overall]}</h2>
        <p className="text-[12px] leading-snug opacity-90">{VERDICT_DESCRIPTION[overall]}</p>

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

        <div className="grid grid-cols-2 gap-1.5 text-[11px]">
          <div className="rounded border border-slate-800/60 bg-slate-950/30 p-2">
            <div className="text-[9px] uppercase tracking-wider opacity-60">Wichtigster Blocker</div>
            <div className="truncate font-medium">{blocker ?? '—'}</div>
          </div>
          <div className="rounded border border-slate-800/60 bg-slate-950/30 p-2">
            <div className="text-[9px] uppercase tracking-wider opacity-60">Score ≥ 80</div>
            <div className="font-mono font-bold">{cryptoStrongCount}</div>
          </div>
        </div>
      </section>

      {hero && (
        <article className="rounded-2xl border border-emerald-400/50 bg-emerald-950/15 p-3">
          <header className="flex flex-wrap items-baseline gap-2">
            <span className="rounded border border-emerald-400/60 bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-200">FREIGABE</span>
            <span className="font-mono text-[10px] text-slate-500">Score {hero.precisionScore}/100</span>
            <Link href={`/assets/${hero.symbol.toLowerCase()}`} className="ml-auto text-[10px] uppercase tracking-wider text-emerald-300 hover:text-emerald-200">Detail-Analyse →</Link>
          </header>
          <h3 className="mt-2 text-base font-bold text-slate-100">{hero.symbol}</h3>
          <ul className="mt-2 list-disc space-y-0.5 pl-4 text-[11px] text-slate-300">
            {hero.reasons.slice(0, 3).map((r, i) => <li key={i}>{r}</li>)}
          </ul>
          {hero.warnings.length > 0 && (
            <p className="mt-2 rounded border border-amber-500/30 bg-amber-950/15 p-1.5 text-[10.5px] text-amber-100">⚠ {hero.warnings[0]}</p>
          )}
        </article>
      )}

      {!hero && (
        <section className="space-y-2 rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
          <h3 className="text-base font-bold text-slate-100">Heute keine Krypto-Modell-Freigabe</h3>
          <p className="text-[11.5px] text-slate-300">Pflicht-Kriterien wurden heute von keinem Coin erfuellt. Lieber kein Trade als ein erzwungener.</p>
          {blocker && <p className="text-[10.5px] text-slate-400">Top-Blocker: <span className="text-slate-200">{blocker}</span></p>}
          <p className="text-[10.5px] leading-snug text-slate-500">
            Damit ein Coin FREIGABE bekommt: Konfluenz ≥ 9/12, Safety grade A, Markt-Mood ≠ risk-off, Struktur uptrend oder breakout, Liquiditaet ≥ 50 M$, Stop-Band 1-6 %, 24h-Bewegung &lt; 15 %, Backtest-Hit ≥ 50 % (wenn Stichprobe ≥ 10).
          </p>
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
              {a.affected > 0 && <p className="mt-1 text-[9.5px] opacity-60">betrifft {a.affected} Coin{a.affected === 1 ? '' : 's'}</p>}
            </li>
          ))}
        </ul>
      </section>

      {top5.length > 0 && (
        <section className="space-y-1.5" aria-label="Geprueft Coins">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Geprueft · max. 5 · ein Pick pro Coin</div>
          <ul className="space-y-1">
            {top5.map((p) => (
              <li key={p.coinId} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-2.5 py-1.5 text-[11px]">
                <span className={`rounded border px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider ${p.verdict === 'FREIGABE' ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200' : 'border-amber-400/50 bg-amber-500/15 text-amber-200'}`}>
                  {p.verdict === 'FREIGABE' ? 'FREIGABE' : 'BEOBACHTEN'}
                </span>
                <span className="font-mono font-bold text-slate-100">{p.symbol}</span>
                <span className="font-mono text-[10px] text-slate-500">Score {p.precisionScore}</span>
                <Link href={`/assets/${p.symbol.toLowerCase()}`} className="text-[10px] text-emerald-300 hover:text-emerald-200">Detail →</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-[10px] leading-snug text-slate-500">
        Filter-Logik: Konfluenz, Safety-Grade, Markt-Mood, BTC-Regime, Struktur, Liquiditaet, Stop-Band, Volatilitaet, Backtest — alle Pflicht-Kriterien muessen erfuellt sein. Modell-Tendenzen, keine Ergebnis-Zusage. Lieber 0 Picks als 10 mittelmaessige.
      </p>
    </section>
  );
}

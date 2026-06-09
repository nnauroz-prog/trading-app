// Konsolidiertes Cross-Asset-Daily-Dashboard. Alle Grade-A-Setups quer
// durch Aktien, Rohstoffe und Fußball-Tipps auf einer Seite. Power-User-Hub.

import Link from 'next/link';
import { getStockSafetyScan } from '@/lib/market/stock-safety-scan';
import { getCommoditySafetyScan } from '@/lib/market/commodity-safety-scan';
import { getFootballFixtures } from '@/lib/sport/fetcher';
import { rankSafeFootballTips } from '@/lib/sport/safe-football-tips';
import { rankSafeWmTips } from '@/lib/sport/wm-safe-tips';
import { detectHotSectors } from '@/lib/market/sector-safety-summary';
import { detectHotCommodityGroups } from '@/lib/market/commodity-group-summary';
import { HotSectorBanner } from '@/components/hot-sector-banner';
import { HotCommodityGroupBanner } from '@/components/hot-commodity-group-banner';
import { getMasterSignal } from '@/lib/analysis/master-signal-engine';
import { getBacktestSummary } from '@/lib/analysis/backtest-summary';
import { scoreCandidateSafety } from '@/lib/analysis/safety-for-candidate';
import type { SafetyAssessment } from '@/lib/analysis/safety-gate';

export const dynamic = 'force-dynamic';
export const revalidate = 600;

export default async function HeuteSicherPage() {
  const todayIso = new Date().toISOString().slice(0, 10);

  const [stocks, commodities, leagues, masterSignal, backtest] = await Promise.all([
    getStockSafetyScan(),
    getCommoditySafetyScan(),
    getFootballFixtures(),
    getMasterSignal('swing'),
    getBacktestSummary()
  ]);

  const safeFootball = rankSafeFootballTips(leagues, { todayIso, horizonDays: 14, minProbability: 0.7, limit: 50 });
  const safeWm = rankSafeWmTips({ todayIso, maxDays: 14, minProbability: 0.7, limit: 30 });

  const cryptoScored = masterSignal.candidates
    .map((c) => ({ c, safety: scoreCandidateSafety(c, masterSignal, backtest) }))
    .sort((a, b) => b.safety.score - a.safety.score);
  const gradeACrypto = cryptoScored.filter((x) => x.safety.grade === 'A');
  const gradeBCrypto = cryptoScored.filter((x) => x.safety.grade === 'B').slice(0, 5);

  const gradeAStocks = stocks
    .filter((e) => e.assessment.grade === 'A')
    .sort((a, b) => b.assessment.score - a.assessment.score);
  const gradeBStocks = stocks
    .filter((e) => e.assessment.grade === 'B')
    .sort((a, b) => b.assessment.score - a.assessment.score)
    .slice(0, 5);

  const gradeACommodities = commodities
    .filter((e) => e.assessment.grade === 'A')
    .sort((a, b) => b.assessment.score - a.assessment.score);
  const gradeBCommodities = commodities
    .filter((e) => e.assessment.grade === 'B')
    .sort((a, b) => b.assessment.score - a.assessment.score)
    .slice(0, 5);

  const maxSafeFootball = safeFootball.filter((t) => t.tier === 'maximal').slice(0, 10);
  const sehrSicherFootball = safeFootball.filter((t) => t.tier === 'sehr-sicher').slice(0, 10);
  const maxSafeWm = safeWm.filter((t) => t.tier === 'maximal').slice(0, 10);
  const sehrSicherWm = safeWm.filter((t) => t.tier === 'sehr-sicher').slice(0, 10);

  const totalCount = gradeACrypto.length + gradeAStocks.length + gradeACommodities.length + maxSafeFootball.length + maxSafeWm.length;

  return (
    <main className="mx-auto max-w-4xl space-y-5 p-4 pb-20 md:p-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-emerald-300">
        ← zurück zur Übersicht
      </Link>

      <header className="space-y-1.5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-400">🛡️ Heute</div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Heute besonders sicher</h1>
        <p className="text-sm text-slate-400">
          Alles, was JETZT das Maximum-Filter passiert — quer durch Krypto, Aktien, Rohstoffe und Fußball.
          Grade A (alle Kriterien erfüllt) oben, dann die nächst-besten als Backup.
          <span className="ml-1 text-emerald-300">{totalCount} maximal-sichere Setups heute.</span>
        </p>
      </header>

      <HotSectorBanner hotSectors={detectHotSectors(stocks)} />
      <HotCommodityGroupBanner hotGroups={detectHotCommodityGroups(commodities)} />

      <section className="space-y-2 rounded-2xl border border-emerald-400/40 bg-emerald-950/15 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">₿ Krypto · Grade A</h2>
        {gradeACrypto.length === 0 ? (
          <>
            <p className="text-[11px] leading-relaxed text-slate-400">
              Heute schafft kein Coin alle Sicherheits-Kriterien. Hier die nächst-besten (Grade B):
            </p>
            <ul className="space-y-1">
              {gradeBCrypto.length > 0
                ? gradeBCrypto.map((x) => <CryptoRow key={x.c.coinId} entry={{ symbol: x.c.symbol, safety: x.safety }} />)
                : <li className="text-[10.5px] text-slate-500">Auch kein Grade-B-Coin. Cash bleibt eine valide Position.</li>
              }
            </ul>
          </>
        ) : (
          <ul className="space-y-1">
            {gradeACrypto.map((x) => <CryptoRow key={x.c.coinId} entry={{ symbol: x.c.symbol, safety: x.safety }} />)}
          </ul>
        )}
      </section>

      <section className="space-y-2 rounded-2xl border border-emerald-400/40 bg-emerald-950/15 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">📈 Aktien · Grade A</h2>
        {gradeAStocks.length === 0 ? (
          <>
            <p className="text-[11px] leading-relaxed text-slate-400">
              Heute schafft keine Aktie alle 8 Kriterien. Hier die nächst-besten (Grade B):
            </p>
            <ul className="space-y-1">
              {gradeBStocks.length > 0
                ? gradeBStocks.map((e) => <StockRow key={e.symbol} entry={e} />)
                : <li className="text-[10.5px] text-slate-500">Auch keine Grade-B-Aktie. Cash bleibt eine Position.</li>
              }
            </ul>
          </>
        ) : (
          <ul className="space-y-1">
            {gradeAStocks.map((e) => <StockRow key={e.symbol} entry={e} />)}
          </ul>
        )}
      </section>

      <section className="space-y-2 rounded-2xl border border-emerald-400/40 bg-emerald-950/15 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">🛢️ Rohstoffe · Grade A</h2>
        {gradeACommodities.length === 0 ? (
          <>
            <p className="text-[11px] leading-relaxed text-slate-400">
              Heute schafft kein Rohstoff alle 8 Kriterien. Hier die nächst-besten (Grade B):
            </p>
            <ul className="space-y-1">
              {gradeBCommodities.length > 0
                ? gradeBCommodities.map((e) => <CommodityRow key={e.symbol} entry={e} />)
                : <li className="text-[10.5px] text-slate-500">Auch keine Grade-B-Rohstoffe. Cash bleibt eine Position.</li>
              }
            </ul>
          </>
        ) : (
          <ul className="space-y-1">
            {gradeACommodities.map((e) => <CommodityRow key={e.symbol} entry={e} />)}
          </ul>
        )}
      </section>

      {(maxSafeWm.length > 0 || sehrSicherWm.length > 0) && (
        <section className="space-y-2 rounded-2xl border border-emerald-400/40 bg-emerald-950/15 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">🏆 WM 2026 · Maximal sicher</h2>
          <ul className="space-y-1">
            {[...maxSafeWm, ...sehrSicherWm].map((t) => <WmTipRow key={`${t.fixture.id}-${t.market.market}`} tip={t} />)}
          </ul>
        </section>
      )}

      {(maxSafeFootball.length > 0 || sehrSicherFootball.length > 0) && (
        <section className="space-y-2 rounded-2xl border border-emerald-400/40 bg-emerald-950/15 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">⚽ Fußball-Ligen · Maximal sicher</h2>
          <ul className="space-y-1">
            {[...maxSafeFootball, ...sehrSicherFootball].map((t) => <FootballTipRow key={`${t.fixture.id}-${t.market.market}`} tip={t} />)}
          </ul>
        </section>
      )}

      <footer className="border-t border-slate-900 pt-4 text-[10px] leading-relaxed text-slate-600">
        Grade A = alle Sicherheits-Kriterien erfüllt. &bdquo;Maximal sicher&ldquo; bei Sport = &ge;85 % Modell-Wahrscheinlichkeit, beste Datenbasis.
        Modell-Schätzungen, keine Garantien. Vergangenheit ≠ Zukunft.
      </footer>
    </main>
  );
}

function CryptoRow({ entry }: { entry: { symbol: string; safety: SafetyAssessment } }) {
  return (
    <li>
      <Link href={`/assets/${entry.symbol.toLowerCase()}`} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-md border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-[11.5px] transition hover:brightness-110">
        <span className="min-w-0">
          <span className="block truncate font-semibold text-slate-100">{entry.symbol}</span>
          <span className="block text-[9.5px] text-slate-500">Krypto · {entry.safety.maxSafety ? 'alle Kriterien erfüllt' : `${entry.safety.passedHard}/${entry.safety.totalHard} Kriterien`}</span>
        </span>
        <span className="font-mono text-[10.5px] text-slate-300">{entry.safety.passedHard}/{entry.safety.totalHard}</span>
        <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
          entry.safety.grade === 'A' ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-100'
            : 'border-sky-400/40 bg-sky-500/10 text-sky-200'
        }`}>
          {entry.safety.grade} · {entry.safety.score}
        </span>
      </Link>
    </li>
  );
}

function StockRow({ entry }: { entry: { symbol: string; name: string; group: string; assessment: { grade: string; score: number; passedHard: number; totalHard: number } } }) {
  return (
    <li>
      <Link href={`/aktien/${encodeURIComponent(entry.symbol)}`} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-md border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-[11.5px] transition hover:brightness-110">
        <span className="min-w-0">
          <span className="block truncate font-semibold text-slate-100">{entry.name}</span>
          <span className="block text-[9.5px] text-slate-500">{entry.symbol} · {entry.group}</span>
        </span>
        <span className="font-mono text-[10.5px] text-slate-300">{entry.assessment.passedHard}/{entry.assessment.totalHard}</span>
        <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
          entry.assessment.grade === 'A' ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-100'
            : 'border-sky-400/40 bg-sky-500/10 text-sky-200'
        }`}>
          {entry.assessment.grade} · {entry.assessment.score}
        </span>
      </Link>
    </li>
  );
}

function CommodityRow({ entry }: { entry: { symbol: string; name: string; group: string; emoji?: string; assessment: { grade: string; score: number; passedHard: number; totalHard: number } } }) {
  return (
    <li>
      <Link href={`/rohstoffe/${encodeURIComponent(entry.symbol)}`} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2 rounded-md border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-[11.5px] transition hover:brightness-110">
        {entry.emoji ? <span className="text-base leading-none">{entry.emoji}</span> : <span className="font-mono text-[10px] text-slate-500">{entry.symbol}</span>}
        <span className="min-w-0">
          <span className="block truncate font-semibold text-slate-100">{entry.name}</span>
          <span className="block text-[9.5px] text-slate-500">{entry.group}</span>
        </span>
        <span className="font-mono text-[10.5px] text-slate-300">{entry.assessment.passedHard}/{entry.assessment.totalHard}</span>
        <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
          entry.assessment.grade === 'A' ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-100'
            : 'border-sky-400/40 bg-sky-500/10 text-sky-200'
        }`}>
          {entry.assessment.grade} · {entry.assessment.score}
        </span>
      </Link>
    </li>
  );
}

function WmTipRow({ tip }: { tip: { fixture: { id: string; homeTeam: string; awayTeam: string; date: string; time: string | null; phase: string }; market: { market: string; probability: number }; tier: string } }) {
  const tierTone = tip.tier === 'maximal' ? 'border-emerald-300/70 bg-emerald-400/20 text-emerald-100'
    : 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200';
  return (
    <li className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-md border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-[11px]">
      <span className="min-w-0">
        <span className="block truncate text-slate-100">
          <span className="font-semibold">{tip.fixture.homeTeam}</span>
          <span className="mx-1 text-slate-500">–</span>
          <span className="font-semibold">{tip.fixture.awayTeam}</span>
        </span>
        <span className="block truncate text-[9.5px] text-slate-500">
          {tip.fixture.date}{tip.fixture.time && ` · ${tip.fixture.time}`} · {tip.fixture.phase}
        </span>
        <span className="block truncate text-[10px] text-emerald-200">→ {tip.market.market}</span>
      </span>
      <span className={`shrink-0 rounded border px-1.5 py-0.5 text-center font-mono text-[10px] font-bold ${tierTone}`}>
        {Math.round(tip.market.probability * 100)} %
      </span>
    </li>
  );
}

function FootballTipRow({ tip }: { tip: { fixture: { id: string; homeTeam: string; awayTeam: string; date: string; time: string | null }; leagueName: string; market: { market: string; probability: number }; tier: string } }) {
  const tierTone = tip.tier === 'maximal' ? 'border-emerald-300/70 bg-emerald-400/20 text-emerald-100'
    : 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200';
  return (
    <li className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-md border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-[11px]">
      <span className="min-w-0">
        <span className="block truncate text-slate-100">
          <span className="font-semibold">{tip.fixture.homeTeam}</span>
          <span className="mx-1 text-slate-500">–</span>
          <span className="font-semibold">{tip.fixture.awayTeam}</span>
        </span>
        <span className="block truncate text-[9.5px] text-slate-500">
          {tip.fixture.date}{tip.fixture.time && ` · ${tip.fixture.time}`} · {tip.leagueName}
        </span>
        <span className="block truncate text-[10px] text-emerald-200">→ {tip.market.market}</span>
      </span>
      <span className={`shrink-0 rounded border px-1.5 py-0.5 text-center font-mono text-[10px] font-bold ${tierTone}`}>
        {Math.round(tip.market.probability * 100)} %
      </span>
    </li>
  );
}

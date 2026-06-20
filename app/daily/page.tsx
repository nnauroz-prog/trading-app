// Daily Decision Center. Aggregiert alle bestehenden Systeme zu einer
// ehrlichen Tagesentscheidung. Keine Garantien, kein Marketing, keine
// Sportwetten-Sprache. Wenn Daten fehlen: ehrlicher Empty-State.

import type { Metadata } from 'next';
import { cookies } from 'next/headers';

export const metadata: Metadata = {
  title: 'Daily Decision Center',
  description: 'Ehrliche Tagesentscheidung aus allen Systemen aggregiert. Wo lohnt sich heute der Klick, was ist Cash-Tag.'
};
import Link from 'next/link';
import { getMasterSignal } from '@/lib/analysis/master-signal-engine';
import { getBacktestSummary } from '@/lib/analysis/backtest-summary';
import { scoreCandidateSafety } from '@/lib/analysis/safety-for-candidate';
import { evaluatePersonas } from '@/lib/agents/personas';
import { getStockSafetyScan } from '@/lib/market/stock-safety-scan';
import { getCommoditySafetyScan } from '@/lib/market/commodity-safety-scan';
import { getFootballFixtures } from '@/lib/sport/fetcher';
import { rankSafeWmTips } from '@/lib/sport/wm-safe-tips';
import { rankSafeFootballTips } from '@/lib/sport/safe-football-tips';
import { evaluateStockPersonas } from '@/lib/agents/stock-personas';
import { evaluateCommodityPersonas } from '@/lib/agents/commodity-personas';
import { evaluateWmPersonas } from '@/lib/agents/wm-personas';
import { evaluateFootballPersonas } from '@/lib/agents/football-personas';
import {
  evaluateMarketMode,
  topChances,
  warningZone,
  personaCompass,
  type DailyEngineInputs,
  type PersonaVerdictEntry,
  type SportTipEntry,
  type CryptoEntry
} from '@/lib/daily/daily-decision-engine';
import { buildActionPlan } from '@/lib/daily/daily-action-plan';
import { DailyMarketModeCard } from '@/components/daily-market-mode-card';
import { DailyTopChances } from '@/components/daily-top-chances';
import { DailyWarnings } from '@/components/daily-warnings';
import { DailyPersonaCompass } from '@/components/daily-persona-compass';
import { DailyWatchlistAction } from '@/components/daily-watchlist-action';
import { DailyActionPlanCard } from '@/components/daily-action-plan-card';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

export default async function DailyPage() {
  const tradeMode = (await cookies()).get('trade-mode')?.value === 'daytrade' ? 'daytrade' : 'swing';
  const todayIso = new Date().toISOString().slice(0, 10);

  const [masterSignal, backtest, stockScan, commodityScan, leagues] = await Promise.all([
    getMasterSignal(tradeMode),
    getBacktestSummary(),
    getStockSafetyScan(),
    getCommoditySafetyScan(),
    getFootballFixtures()
  ]);

  // Krypto-Top: bester Kandidat aus dem Master-Signal nach Safety-Score.
  const cryptoScored = masterSignal.candidates.map((c) => ({ c, safety: scoreCandidateSafety(c, masterSignal, backtest) }));
  cryptoScored.sort((a, b) => b.safety.score - a.safety.score || b.c.passedCount - a.c.passedCount);
  const cryptoTopRanked = cryptoScored[0] ?? null;
  const cryptoTop: CryptoEntry | null = cryptoTopRanked ? {
    symbol: cryptoTopRanked.c.symbol,
    coinId: cryptoTopRanked.c.coinId,
    passedCount: cryptoTopRanked.c.passedCount,
    totalCount: cryptoTopRanked.c.totalCount,
    grade: cryptoTopRanked.safety.grade,
    score: cryptoTopRanked.safety.score,
    oneLineReason: cryptoTopRanked.c.oneLineReason
  } : null;
  const cryptoMaxSafety = cryptoTopRanked?.safety.maxSafety ?? false;

  // Sport-Tipps quer durch WM + Liga, nach Wahrscheinlichkeit absteigend.
  const safeWmTips = rankSafeWmTips({ todayIso, maxDays: 14, minProbability: 0.7, limit: 30 });
  const safeFootballTips = rankSafeFootballTips(leagues, { todayIso, horizonDays: 14, minProbability: 0.7, limit: 30 });
  const sportTips: SportTipEntry[] = [
    ...safeWmTips.map((t) => ({
      fixtureId: t.fixture.id, homeTeam: t.fixture.homeTeam, awayTeam: t.fixture.awayTeam,
      date: t.fixture.date, market: t.market.market, probability: t.market.probability,
      tier: t.tier, source: 'WM' as const, rationale: t.market.rationale
    })),
    ...safeFootballTips.map((t) => ({
      fixtureId: t.fixture.id, homeTeam: t.fixture.homeTeam, awayTeam: t.fixture.awayTeam,
      date: t.fixture.date, market: t.market.market, probability: t.market.probability,
      tier: t.tier, source: 'Liga-Fußball' as const, rationale: t.market.rationale
    }))
  ];

  // Persona-Verdicts aller 5 Vorstände in eine einheitliche Liste.
  const cryptoVerdicts = evaluatePersonas(masterSignal, backtest);
  const stockVerdicts = evaluateStockPersonas(stockScan);
  const commodityVerdicts = evaluateCommodityPersonas(commodityScan);
  const wmVerdicts = evaluateWmPersonas(todayIso);
  const footballVerdicts = evaluateFootballPersonas(leagues, todayIso);

  const personaVerdicts: PersonaVerdictEntry[] = [
    ...cryptoVerdicts.map((v) => ({ klass: 'Krypto' as const, persona: v.persona, personaName: v.name, verdict: v.verdict, isBuy: v.verdict === 'BUY', targetLabel: v.target?.symbol ?? null })),
    ...stockVerdicts.map((v) => ({ klass: 'Aktien' as const, persona: v.persona, personaName: v.name, verdict: v.verdict, isBuy: v.verdict === 'KAUFEN', targetLabel: v.target?.name ?? null })),
    ...commodityVerdicts.map((v) => ({ klass: 'Rohstoffe' as const, persona: v.persona, personaName: v.name, verdict: v.verdict, isBuy: v.verdict === 'KAUFEN', targetLabel: v.target?.name ?? null })),
    ...wmVerdicts.map((v) => ({ klass: 'WM' as const, persona: v.persona, personaName: v.name, verdict: v.verdict, isBuy: v.verdict === 'TIPPEN', targetLabel: v.target ? `${v.target.fixture.homeTeam} – ${v.target.fixture.awayTeam}` : null })),
    ...footballVerdicts.map((v) => ({ klass: 'Liga-Fußball' as const, persona: v.persona, personaName: v.name, verdict: v.verdict, isBuy: v.verdict === 'TIPPEN', targetLabel: v.target ? `${v.target.fixture.homeTeam} – ${v.target.fixture.awayTeam}` : null }))
  ];

  const inputs: DailyEngineInputs = {
    stocks: stockScan.map((e) => ({
      symbol: e.symbol, name: e.name, group: e.group,
      grade: e.assessment.grade, score: e.assessment.score,
      passedHard: e.assessment.passedHard, totalHard: e.assessment.totalHard
    })),
    commodities: commodityScan.map((e) => ({
      symbol: e.symbol, name: e.name, group: e.group, emoji: e.emoji,
      grade: e.assessment.grade, score: e.assessment.score,
      passedHard: e.assessment.passedHard, totalHard: e.assessment.totalHard
    })),
    cryptoTop,
    cryptoMaxSafety,
    sportTips,
    personaVerdicts
  };

  const mode = evaluateMarketMode(inputs);
  const chances = topChances(inputs);
  const warnings = warningZone(inputs);
  const compass = personaCompass(personaVerdicts);
  const plan = buildActionPlan(mode);
  const generatedAtIso = new Date().toISOString();

  return (
    <main className="mx-auto max-w-4xl space-y-5 p-4 pb-20 md:p-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-emerald-300">
        ← zurück zur Übersicht
      </Link>

      <header className="space-y-1.5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-400">🌅 Daily</div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Daily Decision Center</h1>
        <p className="max-w-2xl text-sm text-slate-400">
          Eine Seite, ein Tag. Aggregiert Sicherheits-Gates, Vorstands-Stimmen, Sport-Engines und deine Watchlists —
          und sagt dir ehrlich: was ist heute handelbar, was nur beobachten, was klar meiden. Modell-Hinweise, keine Garantien.
        </p>
      </header>

      <DailyMarketModeCard assessment={mode} generatedAtIso={generatedAtIso} />

      <DailyTopChances chances={chances} />

      <DailyPersonaCompass compass={compass} />

      <DailyWatchlistAction
        todayIso={todayIso}
        stockScans={stockScan.map((e) => ({ symbol: e.symbol, name: e.name, grade: e.assessment.grade, score: e.assessment.score }))}
        commodityScans={commodityScan.map((e) => ({ symbol: e.symbol, name: e.name, grade: e.assessment.grade, score: e.assessment.score }))}
      />

      <DailyWarnings warnings={warnings} />

      <DailyActionPlanCard plan={plan} />

      <footer className="border-t border-slate-900 pt-4 text-[10px] leading-relaxed text-slate-600">
        Datenbasis: Yahoo Finance v8 (Aktien + Rohstoffe), Binance/Bybit (Krypto), TheSportsDB (Sport).
        Cache: 5–30 Min je Quelle. Bei API-Ausfall wird ehrlich gemeldet — niemals Schätzwerte. Keine Anlageempfehlung.
      </footer>
    </main>
  );
}

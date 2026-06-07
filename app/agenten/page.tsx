// Übersicht aller Vorstände auf einer Seite — 12 Persönlichkeiten quer durch
// Krypto, Aktien, Rohstoffe und WM. Schnellblick: wo ist heute Konsens, wo
// gehen die Vorstände auseinander.

import { cookies } from 'next/headers';
import Link from 'next/link';
import { buildMasterSignal } from '@/lib/analysis/master-signal-engine';
import { getBacktestSummary } from '@/lib/analysis/backtest-summary';
import { evaluatePersonas } from '@/lib/agents/personas';
import { getStockSafetyScan } from '@/lib/market/stock-safety-scan';
import { getCommoditySafetyScan } from '@/lib/market/commodity-safety-scan';
import { evaluateStockPersonas } from '@/lib/agents/stock-personas';
import { evaluateCommodityPersonas } from '@/lib/agents/commodity-personas';
import { evaluateWmPersonas } from '@/lib/agents/wm-personas';
import { evaluateFootballPersonas } from '@/lib/agents/football-personas';
import { getFootballFixtures } from '@/lib/sport/fetcher';
import { StockPersonaPanel } from '@/components/stock-persona-panel';
import { CommodityPersonaPanel } from '@/components/commodity-persona-panel';
import { WmPersonaPanel } from '@/components/wm-persona-panel';
import { FootballPersonaPanel } from '@/components/football-persona-panel';
import { VorstandHeatmap } from '@/components/vorstand-heatmap';
import { PersonaConsensusPicks, type PersonaPickEntry } from '@/components/persona-consensus-picks';
import { PersonaHistoryRecorder } from '@/components/persona-history-recorder';
import { PersonaHistoryCard } from '@/components/persona-history-card';
import type { HistoryEntry } from '@/lib/agents/persona-history';

export const dynamic = 'force-dynamic';
export const revalidate = 600;

export default async function AgentenPage() {
  const tradeMode = (await cookies()).get('trade-mode')?.value === 'daytrade' ? 'daytrade' : 'swing';
  const todayIso = new Date().toISOString().slice(0, 10);

  const [masterSignal, backtest, stockScan, commodityScan, leagues] = await Promise.all([
    buildMasterSignal(tradeMode),
    getBacktestSummary(),
    getStockSafetyScan(),
    getCommoditySafetyScan(),
    getFootballFixtures()
  ]);

  const cryptoVerdicts = evaluatePersonas(masterSignal, backtest);
  const stockVerdicts = evaluateStockPersonas(stockScan);
  const commodityVerdicts = evaluateCommodityPersonas(commodityScan);
  const wmVerdicts = evaluateWmPersonas(todayIso);
  const footballVerdicts = evaluateFootballPersonas(leagues, todayIso);

  // Cross-Asset-Statistik
  const totalBuy =
    cryptoVerdicts.filter((v) => v.verdict === 'BUY').length +
    stockVerdicts.filter((v) => v.verdict === 'KAUFEN').length +
    commodityVerdicts.filter((v) => v.verdict === 'KAUFEN').length +
    wmVerdicts.filter((v) => v.verdict === 'TIPPEN').length +
    footballVerdicts.filter((v) => v.verdict === 'TIPPEN').length;
  const totalPersonas = cryptoVerdicts.length + stockVerdicts.length + commodityVerdicts.length + wmVerdicts.length + footballVerdicts.length;

  return (
    <main className="mx-auto max-w-5xl space-y-5 p-4 pb-20 md:p-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-emerald-300">
        ← zurück zur Übersicht
      </Link>

      <header className="space-y-1.5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-400">👥 Vorstände</div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Alle Vorstände auf einen Blick</h1>
        <p className="max-w-2xl text-sm text-slate-400">
          {totalPersonas} Persönlichkeiten quer durch Krypto, Aktien, Rohstoffe und WM. Heute sagen{' '}
          <span className="font-bold text-emerald-300">{totalBuy} von {totalPersonas}</span>{' '}
          &bdquo;kaufen / tippen&ldquo;. {totalBuy === totalPersonas
            ? 'Voller Konsens — selten und stark.'
            : totalBuy === 0
              ? 'Niemand will heute. Cash bleibt eine Position.'
              : 'Gemischt — eigene Risiko-Toleranz entscheidet.'
          }
        </p>
      </header>

      {(() => {
        const allPicks: PersonaPickEntry[] = [];
        for (const v of cryptoVerdicts) {
          if (v.target) {
            allPicks.push({
              klass: 'Krypto', personaId: v.persona, personaName: v.name, verdict: v.verdict,
              assetKey: v.target.symbol, assetLabel: v.target.symbol, href: `/assets/${v.target.symbol.toLowerCase()}`
            });
          }
        }
        for (const v of stockVerdicts) {
          if (v.target) {
            allPicks.push({
              klass: 'Aktien', personaId: v.persona, personaName: v.name, verdict: v.verdict,
              assetKey: v.target.symbol, assetLabel: v.target.name, href: `/aktien/${encodeURIComponent(v.target.symbol)}`
            });
          }
        }
        for (const v of commodityVerdicts) {
          if (v.target) {
            allPicks.push({
              klass: 'Rohstoffe', personaId: v.persona, personaName: v.name, verdict: v.verdict,
              assetKey: v.target.symbol, assetLabel: v.target.name, href: `/rohstoffe/${encodeURIComponent(v.target.symbol)}`
            });
          }
        }
        for (const v of wmVerdicts) {
          if (v.target) {
            allPicks.push({
              klass: 'WM', personaId: v.persona, personaName: v.name, verdict: v.verdict,
              assetKey: v.target.fixture.id, assetLabel: `${v.target.fixture.homeTeam} – ${v.target.fixture.awayTeam}`, href: `/wm/${encodeURIComponent(v.target.fixture.id)}`
            });
          }
        }
        for (const v of footballVerdicts) {
          if (v.target) {
            allPicks.push({
              klass: 'Liga-Fußball', personaId: v.persona, personaName: v.name, verdict: v.verdict,
              assetKey: v.target.fixture.id, assetLabel: `${v.target.fixture.homeTeam} – ${v.target.fixture.awayTeam}`, href: '/sport'
            });
          }
        }
        return <PersonaConsensusPicks entries={allPicks} />;
      })()}

      {(() => {
        const historyEntries: HistoryEntry[] = [
          ...cryptoVerdicts.map((v) => ({ dateIso: todayIso, klass: 'Krypto', personaId: v.persona, verdict: v.verdict, targetLabel: v.target?.symbol ?? null })),
          ...stockVerdicts.map((v) => ({ dateIso: todayIso, klass: 'Aktien', personaId: v.persona, verdict: v.verdict, targetLabel: v.target?.name ?? null })),
          ...commodityVerdicts.map((v) => ({ dateIso: todayIso, klass: 'Rohstoffe', personaId: v.persona, verdict: v.verdict, targetLabel: v.target?.name ?? null })),
          ...wmVerdicts.map((v) => ({ dateIso: todayIso, klass: 'WM', personaId: v.persona, verdict: v.verdict, targetLabel: v.target ? `${v.target.fixture.homeTeam} – ${v.target.fixture.awayTeam}` : null })),
          ...footballVerdicts.map((v) => ({ dateIso: todayIso, klass: 'Liga-Fußball', personaId: v.persona, verdict: v.verdict, targetLabel: v.target ? `${v.target.fixture.homeTeam} – ${v.target.fixture.awayTeam}` : null }))
        ];
        return <PersonaHistoryRecorder entries={historyEntries} />;
      })()}

      <PersonaHistoryCard days={7} todayIso={todayIso} />

      <VorstandHeatmap
        cells={[
          ...cryptoVerdicts.map((v) => ({ klass: 'Krypto', persona: v.persona, verdict: v.verdict })),
          ...stockVerdicts.map((v) => ({ klass: 'Aktien', persona: v.persona, verdict: v.verdict })),
          ...commodityVerdicts.map((v) => ({ klass: 'Rohstoffe', persona: v.persona, verdict: v.verdict })),
          ...wmVerdicts.map((v) => ({ klass: 'WM', persona: v.persona, verdict: v.verdict })),
          ...footballVerdicts.map((v) => ({ klass: 'Liga-Fußball', persona: v.persona, verdict: v.verdict }))
        ]}
        klassOrder={['Krypto', 'Aktien', 'Rohstoffe', 'WM', 'Liga-Fußball']}
        personaOrder={['conservative', 'balanced', 'aggressive']}
      />

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-300">₿ Krypto-Vorstand ({cryptoVerdicts.length})</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {cryptoVerdicts.map((v) => {
            const verdictTone = v.verdict === 'BUY'
              ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100'
              : 'border-slate-700 bg-slate-900/40 text-slate-300';
            return (
              <article key={v.persona} className={`flex flex-col gap-1 rounded-xl border-2 p-3 ${verdictTone}`}>
                <header className="flex items-baseline justify-between gap-2">
                  <h3 className="text-[13px] font-bold">{v.name}</h3>
                  <span className="rounded border border-current/40 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider">
                    {v.verdict}
                  </span>
                </header>
                <p className="text-[10px] italic opacity-80">&bdquo;{v.motto}&ldquo;</p>
                {v.target ? (
                  <Link href={`/assets/${v.target.symbol.toLowerCase()}`} className="rounded-lg border border-current/30 bg-slate-950/40 p-2 text-[11.5px] font-bold transition hover:brightness-110">
                    {v.target.symbol} <span className="font-mono text-[10px] opacity-80">({v.target.passedCount}/{v.target.totalCount})</span>
                  </Link>
                ) : (
                  <div className="rounded-lg border border-current/30 bg-slate-950/40 p-2 text-[11px] italic">Kein Target heute.</div>
                )}
                <p className="text-[10.5px] leading-snug opacity-90">{v.rationale}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-300">📈 Aktien-Vorstand ({stockVerdicts.length})</h2>
        <StockPersonaPanel verdicts={stockVerdicts} />
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-300">🛢️ Rohstoff-Vorstand ({commodityVerdicts.length})</h2>
        <CommodityPersonaPanel verdicts={commodityVerdicts} />
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-300">🏆 WM-Vorstand ({wmVerdicts.length})</h2>
        <WmPersonaPanel verdicts={wmVerdicts} />
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-300">⚽ Liga-Fußball-Vorstand ({footballVerdicts.length})</h2>
        <FootballPersonaPanel verdicts={footballVerdicts} />
      </section>

      <footer className="border-t border-slate-900 pt-4 text-[10px] leading-relaxed text-slate-600">
        Jede Persönlichkeit verfolgt eine eigene Strategie. Niemand ist immer &bdquo;richtig&ldquo;. Das ehrlichste Signal ist Konsens — wenn alle drei einer Asset-Klasse zustimmen.
      </footer>
    </main>
  );
}

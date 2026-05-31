import Link from 'next/link';
import { cookies } from 'next/headers';
import { buildMasterSignal, TradeMode } from '@/lib/analysis/master-signal-engine';
import { getBacktestSummary } from '@/lib/analysis/backtest-summary';
import { fetchFearGreed, fetchBtcDominance } from '@/lib/providers/sentiment-indicators';
import { fetchFundingRate } from '@/lib/providers/funding-rates';
import { computeHalvingCyclePosition } from '@/lib/cycles/halving-cycle';
import { getCryptoNews } from '@/lib/news/news-agent';
import { runSpaeher } from '@/lib/akademie/spaeher';
import { listMacroEventsThisWeek } from '@/lib/calendar/macro-events';
import { computeEventWindow } from '@/lib/calendar/event-window';
import { buildIntelContext } from '@/lib/intel/context';
import { runAllEmployees } from '@/lib/intel/employees';
import { chefredakteurSynthesis } from '@/lib/intel/chefredakteur';
import { EmployeeReport, IntelSignal } from '@/lib/intel/types';
import { IntelHistoriker } from '@/components/intel-historiker';
import { IntelRecorder } from '@/components/intel-recorder';
import { IntelLog } from '@/components/intel-log';
import { fetchAllTickers } from '@/lib/providers/binance-tickers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function signalClasses(s: IntelSignal): string {
  if (s === 'risk-on') return 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200';
  if (s === 'risk-off') return 'border-rose-400/50 bg-rose-500/15 text-rose-200';
  if (s === 'neutral') return 'border-slate-700 bg-slate-900 text-slate-300';
  return 'border-slate-800 bg-slate-950 text-slate-500';
}

function signalLabel(s: IntelSignal): string {
  if (s === 'risk-on') return 'risk-on';
  if (s === 'risk-off') return 'risk-off';
  if (s === 'neutral') return 'neutral';
  return 'keine Daten';
}

function confidenceLabel(c: 'sicher' | 'wahrscheinlich' | 'vermutung' | 'keine_daten'): string {
  if (c === 'sicher') return '· sicher';
  if (c === 'wahrscheinlich') return '· wahrscheinlich';
  if (c === 'vermutung') return '· Vermutung';
  return '';
}

function EmployeeCard({ r }: { r: EmployeeReport }) {
  return (
    <div className="space-y-1.5 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <span className="text-[11px] font-bold text-slate-100">{r.title}</span>
          <span className="ml-1 text-[9px] text-slate-500">{confidenceLabel(r.confidence)}</span>
        </div>
        <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${signalClasses(r.signal)}`}>
          {signalLabel(r.signal)}
        </span>
      </div>
      <p className="text-[10px] italic text-slate-500">{r.expertise}</p>
      <p className="text-[12px] leading-relaxed text-slate-200">{r.finding}</p>
      {r.detail && <p className="text-[10px] font-mono text-slate-500">{r.detail}</p>}
    </div>
  );
}

export default async function IntelPage() {
  const tradeMode: TradeMode = (await cookies()).get('trade-mode')?.value === 'daytrade' ? 'daytrade' : 'swing';
  const [masterSignal, backtest, newsItems, fearGreed, btcDominance, fundingBtc, fundingEth, tickers] = await Promise.all([
    buildMasterSignal(tradeMode),
    getBacktestSummary(),
    getCryptoNews(),
    fetchFearGreed(),
    fetchBtcDominance(),
    fetchFundingRate('BTCUSDT'),
    fetchFundingRate('ETHUSDT'),
    fetchAllTickers()
  ]);
  const btcPrice = tickers?.get('BTCUSDT')?.price ?? null;
  const spaeher = runSpaeher(newsItems);
  const eventWindow = computeEventWindow(listMacroEventsThisWeek());
  const cycle = computeHalvingCyclePosition();

  const ctx = buildIntelContext({
    masterSignal, backtest, spaeher,
    fearGreed: fearGreed?.value ?? null,
    fundingBtcAnnualizedPct: fundingBtc?.fundingRateAnnualizedPct ?? null,
    fundingEthAnnualizedPct: fundingEth?.fundingRateAnnualizedPct ?? null,
    btcDominancePct: btcDominance?.btcDominancePct ?? null,
    eventWindow,
    cycleLabel: cycle?.phaseLabel ?? null,
    cycleProgressPct: cycle?.cyclePct ?? null,
    firmaLog: [] // client-side, handled separately by IntelHistoriker
  });
  const reports = runAllEmployees(ctx);
  const ceo = chefredakteurSynthesis(reports);

  // Group by department
  const byDept = new Map<string, EmployeeReport[]>();
  for (const r of reports) {
    if (r.id === 'historiker') continue; // client-side widget
    if (!byDept.has(r.department)) byDept.set(r.department, []);
    byDept.get(r.department)!.push(r);
  }
  const DEPT_ORDER = ['Marktstimmung', 'Markt-Struktur', 'Nachrichten & Makro', 'Eigene Performance', 'Risiko'];
  const sortedDepts = Array.from(byDept.keys()).sort((a, b) => DEPT_ORDER.indexOf(a) - DEPT_ORDER.indexOf(b));

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-emerald-300">
        ← zurück zum Signal Desk
      </Link>

      <header className="space-y-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-400">Recherche-Firma</div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Zwölf Spezialisten, ein Chefredakteur</h1>
        <p className="text-sm text-slate-400">
          Die Recherche-Firma ist deine interne Nachrichtenagentur. Jeder Angestellte beobachtet exakt eine Datenquelle und meldet, was er heute sieht. Der Chefredakteur am Anfang fasst alles in einen Lagebericht zusammen. <span className="text-amber-400/80">Ehrlich:</span> wenn ein Mitarbeiter „keine Daten“ meldet, dann ist die Quelle gerade nicht erreichbar — wir tun nicht so, als hätten wir die Info.
        </p>
      </header>

      {/* Chefredakteur-Lagebericht */}
      <section className={`space-y-2 rounded-2xl border-2 p-5 ${ceo.netSignal === 'risk-on' ? 'border-emerald-400/50 bg-emerald-950/30' : ceo.netSignal === 'risk-off' ? 'border-rose-400/50 bg-rose-950/30' : 'border-slate-700 bg-slate-900/40'}`}>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Lagebericht der Chefredaktion</span>
          <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${signalClasses(ceo.netSignal)}`}>
            Tendenz: {signalLabel(ceo.netSignal)}
          </span>
        </div>
        <p className="text-[13px] leading-relaxed text-slate-100">{ceo.lagebericht}</p>
        <div className="flex flex-wrap items-baseline gap-3 text-[10px] uppercase tracking-wider text-slate-500">
          <span>{ceo.riskOnCount} risk-on</span>
          <span>{ceo.riskOffCount} risk-off</span>
          {ceo.conflicts.length > 0 && <span>{ceo.conflicts.length} Widerspruch{ceo.conflicts.length === 1 ? '' : 'sfälle'}</span>}
        </div>

        {ceo.highlights.length > 0 && (
          <div className="mt-2 space-y-1 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
            <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">Wichtigste Meldungen</div>
            <ul className="space-y-1 text-[11px] text-slate-300">
              {ceo.highlights.map((h, i) => <li key={i}>· {h}</li>)}
            </ul>
          </div>
        )}

        {ceo.conflicts.length > 0 && (
          <details className="rounded-md border border-slate-800 bg-slate-950/40 p-2 text-[11px]">
            <summary className="cursor-pointer text-slate-300">Wo das Team uneins ist</summary>
            <ul className="mt-2 space-y-1 text-slate-400">
              {ceo.conflicts.slice(0, 3).map((c, i) => <li key={i}>· {c}</li>)}
            </ul>
          </details>
        )}
      </section>

      {/* Departments */}
      {sortedDepts.map((dept) => (
        <section key={dept} className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{dept}</h2>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {byDept.get(dept)!.map((r) => <EmployeeCard key={r.id} r={r} />)}
            {dept === 'Eigene Performance' && <IntelHistoriker />}
          </div>
        </section>
      ))}

      <IntelRecorder reports={reports} ceo={ceo} btcPrice={btcPrice} generatedAt={masterSignal.generatedAt} />
      <IntelLog />

      <p className="rounded-xl border border-slate-700/60 bg-slate-950/40 p-3 text-[10px] leading-relaxed text-slate-500">
        Alle zwölf Mitarbeiter rechnen mit echten Datenquellen — Binance/Bybit-Preise, Bybit-Funding, Alternative.me-Fear&Greed, CoinGecko-Dominanz, deutsche Krypto-RSS, eigene Backtest-Ergebnisse, FOMC/CPI-Termin-Plan, Bitcoin-Halving-Position. Wer keine Daten kriegt, schreibt das ehrlich.
      </p>
    </main>
  );
}

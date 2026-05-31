import Link from 'next/link';
import { cookies } from 'next/headers';
import { buildMasterSignal, TradeMode } from '@/lib/analysis/master-signal-engine';
import { scoreCryptoCandidate } from '@/lib/opportunity-score';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function fmtPrice(v: number): string {
  if (v >= 1000) return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (v >= 1) return v.toFixed(2);
  if (v >= 0.01) return v.toFixed(4);
  return v.toFixed(7);
}

interface PageProps {
  searchParams: Promise<{ coins?: string }>;
}

export default async function ComparePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const tradeMode: TradeMode = (await cookies()).get('trade-mode')?.value === 'daytrade' ? 'daytrade' : 'swing';
  const masterSignal = await buildMasterSignal(tradeMode);

  const requestedSymbols = (params.coins ?? '')
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter((s) => s.length > 0);

  // Default: take the three strongest candidates if nothing requested.
  const candidates = requestedSymbols.length > 0
    ? masterSignal.candidates.filter((c) => requestedSymbols.includes(c.symbol.toUpperCase()))
    : masterSignal.candidates.slice(0, 3);

  const enriched = candidates.map((c) => {
    const userBroker = c.brokers.includes('Coinbase') || c.brokers.includes('Scalable Capital');
    const opp = scoreCryptoCandidate({
      passedCount: c.passedCount,
      totalCount: c.totalCount,
      structure: c.structure,
      nearSupport: c.nearSupport,
      rrTp1: c.rrTp1,
      quoteVolume: c.quoteVolume,
      priceChangePct24h: c.priceChangePct24h,
      marketMood: masterSignal.marketMood,
      userBrokerAvailable: userBroker,
      isOnWatchlist: false
    });
    return { c, opp };
  });

  const universe = masterSignal.candidates.slice(0, 20).map((c) => c.symbol);

  return (
    <main className="mx-auto max-w-5xl space-y-5 p-4 md:p-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-emerald-300">
        ← zurück zum Signal Desk
      </Link>

      <header className="space-y-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-400">Coin-Vergleich</div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Setups Seite an Seite</h1>
        <p className="text-sm text-slate-400">
          Vergleicht bis zu drei Coins anhand der harten Metriken: Häkchen-Anzahl, Stop-Distanz, R/R, 24h-Bewegung, Liquidität, Struktur. So siehst du auf einen Blick, welches Setup wirklich überlegen ist — statt zwischen zwei Pages hin und her zu klicken.
        </p>
      </header>

      <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Coins wählen</div>
        <div className="flex flex-wrap gap-1.5">
          {universe.map((sym) => {
            const isSelected = candidates.some((c) => c.symbol === sym);
            const others = candidates.map((c) => c.symbol);
            const newSet = isSelected
              ? others.filter((s) => s !== sym)
              : others.length < 3 ? [...others, sym] : [others[0], others[1], sym];
            const href = newSet.length > 0 ? `/compare?coins=${newSet.join(',')}` : '/compare';
            return (
              <Link
                key={sym}
                href={href}
                className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] transition ${isSelected ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200' : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-600'}`}
              >
                {sym}
              </Link>
            );
          })}
        </div>
        <p className="text-[10px] text-slate-500">Bis zu 3 Coins gleichzeitig. Standardmäßig die drei stärksten.</p>
      </section>

      {enriched.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-6 text-center text-[12px] text-slate-500">
          Keine Coins ausgewählt — oben anklicken.
        </p>
      ) : (
        <section className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-900/40 p-3">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-500">
                <th className="px-2 py-2 text-left">Metrik</th>
                {enriched.map((e) => (
                  <th key={e.c.symbol} className="px-2 py-2 text-right">
                    <Link href={`/assets/${e.c.symbol.toLowerCase()}`} className="font-mono text-base font-bold text-white hover:text-emerald-300">
                      {e.c.symbol}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <Row label="Opportunity-Score" cells={enriched.map((e) => <span key={e.c.symbol} className={e.opp.score >= 70 ? 'text-emerald-300' : e.opp.score >= 55 ? 'text-amber-300' : 'text-rose-300'}>{e.opp.score}/100 · {e.opp.label}</span>)} />
              <Row label="Häkchen" cells={enriched.map((e) => `${e.c.passedCount} von ${e.c.totalCount}`)} />
              <Row label="Struktur" cells={enriched.map((e) => e.c.structure === 'uptrend' ? 'aufwärts' : e.c.structure === 'downtrend' ? 'abwärts' : 'seitwärts')} />
              <Row label="Nahe Unterstützung" cells={enriched.map((e) => e.c.nearSupport ? 'ja' : 'nein')} />
              <Row label="Einstieg" cells={enriched.map((e) => `$${fmtPrice(e.c.entry)}`)} />
              <Row label="Stop" cells={enriched.map((e) => `$${fmtPrice(e.c.stopLoss)}`)} />
              <Row label="Ziel 1" cells={enriched.map((e) => `$${fmtPrice(e.c.takeProfit1)}`)} />
              <Row label="Stop-Distanz" cells={enriched.map((e) => `${e.c.stopDistancePct.toFixed(1)}%`)} />
              <Row label="R/R (TP1)" cells={enriched.map((e) => e.c.rrTp1.toFixed(2))} />
              <Row label="24h-Bewegung" cells={enriched.map((e) => <span key={e.c.symbol} className={e.c.priceChangePct24h >= 0 ? 'text-emerald-300' : 'text-rose-300'}>{e.c.priceChangePct24h >= 0 ? '+' : ''}{e.c.priceChangePct24h.toFixed(2)}%</span>)} />
              <Row label="Liquidität (24h Vol)" cells={enriched.map((e) => `$${Math.round(e.c.quoteVolume / 1_000_000)}M`)} />
              <Row label="Broker" cells={enriched.map((e) => e.c.brokers.join(', ') || '—')} />
              <Row label="Bestätigt" cells={enriched.map((e) => e.c.confirmed ? 'ja' : 'nein')} />
              <Row label="Rel. Stärke vs BTC" cells={enriched.map((e) => `${e.c.relStrengthVsBtc >= 0 ? '+' : ''}${e.c.relStrengthVsBtc.toFixed(1)}`)} />
            </tbody>
          </table>
        </section>
      )}

      <p className="rounded-xl border border-slate-700/60 bg-slate-950/40 p-3 text-[10px] leading-relaxed text-slate-500">
        Vergleich rein nach Live-Setup-Werten — was historisch besser lief, siehst du auf der jeweiligen Coin-Detail-Seite unter „Vergleichbare Setups historisch“.
      </p>
    </main>
  );
}

function Row({ label, cells }: { label: string; cells: React.ReactNode[] }) {
  return (
    <tr className="border-b border-slate-900 last:border-b-0">
      <td className="px-2 py-1.5 text-slate-400">{label}</td>
      {cells.map((c, i) => (
        <td key={i} className="px-2 py-1.5 text-right font-mono text-slate-100">{c}</td>
      ))}
    </tr>
  );
}

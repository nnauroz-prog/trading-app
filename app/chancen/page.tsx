import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { getMasterSignal, TradeMode } from '@/lib/analysis/master-signal-engine';
import { scoreCryptoCandidate } from '@/lib/opportunity-score';

export const metadata: Metadata = {
  title: 'Chancen heute',
  description: 'Top-Chancen mit kontrolliertem Risiko — alle Setups quer durch Krypto sortiert nach Opportunity-Score.'
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function fmtPrice(v: number): string {
  if (v >= 1000) return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (v >= 1) return v.toFixed(2);
  if (v >= 0.01) return v.toFixed(4);
  return v.toFixed(7);
}

interface Slot {
  label: string;
  title: string;
  body: string;
  href?: string;
  tone: 'good' | 'neutral' | 'bad';
}

function toneClasses(t: Slot['tone']): string {
  if (t === 'good') return 'border-emerald-400/50 bg-emerald-950/30';
  if (t === 'bad') return 'border-rose-400/50 bg-rose-950/20';
  return 'border-slate-700 bg-slate-900/40';
}

export default async function ChancenPage() {
  const tradeMode: TradeMode = (await cookies()).get('trade-mode')?.value === 'daytrade' ? 'daytrade' : 'swing';
  const masterSignal = await getMasterSignal(tradeMode);

  const scored = masterSignal.candidates.slice(0, 15).map((c) => {
    const userBroker = c.brokers.includes('Coinbase') || c.brokers.includes('Scalable Capital');
    return {
      c,
      score: scoreCryptoCandidate({
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
      })
    };
  });
  scored.sort((a, b) => b.score.score - a.score.score);

  const kurzfristig = scored.find((s) => s.score.score >= 70 && s.c.structure === 'uptrend' && s.c.priceChangePct24h <= 10);
  const mittelfristig = scored.find((s) => s.score.score >= 60 && s.score.score < 80 && s.c.structure !== 'downtrend');
  const defensiv = scored.find((s) => s.c.coinId === 'btc' || s.c.coinId === 'eth' || s.c.symbol === 'PAXG');
  const watchlistChance = scored.find((s) => s.score.score >= 55 && s.score.score < 70);

  const slots: Slot[] = [
    kurzfristig
      ? {
          label: 'Kurzfristig (Tage)',
          title: `${kurzfristig.c.symbol} — Score ${kurzfristig.score.score}`,
          body: `${kurzfristig.score.label}. Einstieg um $${fmtPrice(kurzfristig.c.entry)}, Stop $${fmtPrice(kurzfristig.c.stopLoss)}, Ziel $${fmtPrice(kurzfristig.c.takeProfit1)}. ${kurzfristig.score.shortReason}`,
          href: `/assets/${kurzfristig.c.symbol.toLowerCase()}`,
          tone: 'good'
        }
      : {
          label: 'Kurzfristig (Tage)',
          title: 'Kein sauberes kurzfristiges Setup',
          body: 'Heute findet die App keine Konfluenz, die einen Tages-Trade rechtfertigen würde. Cash halten ist die ehrliche Antwort.',
          tone: 'neutral'
        },
    mittelfristig
      ? {
          label: 'Mittelfristig (Wochen)',
          title: `${mittelfristig.c.symbol} — Watchlist auf Breakout`,
          body: `Score ${mittelfristig.score.score}. ${mittelfristig.score.shortReason} Warten, bis das Setup bestätigt ist, dann erst Position.`,
          href: `/assets/${mittelfristig.c.symbol.toLowerCase()}`,
          tone: 'neutral'
        }
      : {
          label: 'Mittelfristig (Wochen)',
          title: 'Watchlist leer',
          body: 'Im mittleren Score-Bereich gerade kein Kandidat — beim nächsten Marktcheck nochmal schauen.',
          tone: 'neutral'
        },
    defensiv
      ? {
          label: 'Defensiv',
          title: `${defensiv.c.symbol} als ruhiges Investment`,
          body: 'Die Large-Caps bewegen sich weniger als Altcoins. Geringeres Risiko bei niedrigerer Volatilität — eher Kapital-Erhalt als schnelle Gewinne.',
          href: `/assets/${defensiv.c.symbol.toLowerCase()}`,
          tone: 'neutral'
        }
      : {
          label: 'Defensiv',
          title: 'BTC und ETH gerade nicht im Universum',
          body: 'Defensive Auswahl überspringen.',
          tone: 'neutral'
        },
    watchlistChance
      ? {
          label: 'Watchlist',
          title: `${watchlistChance.c.symbol} näher beobachten`,
          body: `Score ${watchlistChance.score.score} — noch nicht stark genug für eine Position, aber dabei bleiben. Auf weiterer Häkchen-Gewinn warten.`,
          href: `/assets/${watchlistChance.c.symbol.toLowerCase()}`,
          tone: 'neutral'
        }
      : {
          label: 'Watchlist',
          title: 'Keine Watchlist-Kandidaten',
          body: 'Sogar im Watchlist-Bereich findet die App heute nichts.',
          tone: 'neutral'
        },
    {
      label: 'Nicht handeln',
      title: scored.length === 0 || (scored[0]?.score.score ?? 0) < 70 ? 'Heute ist Cash-Halten die beste Entscheidung' : 'Pumps und Falling Knives meiden',
      body: scored.length === 0 || (scored[0]?.score.score ?? 0) < 70
        ? 'Kein Setup über Score 70. Disziplin ist hier wertvoller als jeder erzwungene Trade. Geld nicht verlieren ist auch Geld verdienen.'
        : 'Jedes Asset, das gestern bereits über 10% gestiegen oder gefallen ist, ist kein Anfänger-Setup — die App zeigt das im Schon-gelaufen / Angst-übertrieben-Block auf der Startseite.',
      tone: 'bad'
    }
  ];

  return (
    <main className="mx-auto max-w-5xl space-y-5 p-4 md:p-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-emerald-300">
        ← zurück zum Signal Desk
      </Link>

      <header className="space-y-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400">Chancen-Modus</div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Wo ist heute Chance — mit kontrolliertem Risiko</h1>
        <p className="text-sm text-slate-400">
          Fünf Zeit-Horizonte, fünf Antworten. Keine Garantie, keine FOMO-Sprache — nur das beste verfügbare Setup pro Kategorie aus der Krypto-Engine. Auch „nicht handeln“ ist eine valide Antwort und steht hier explizit drin.
        </p>
      </header>

      <ul className="space-y-3">
        {slots.map((s, i) => (
          <li key={i}>
            {s.href ? (
              <Link href={s.href} className={`block space-y-1.5 rounded-2xl border-2 p-4 transition hover:border-emerald-400/60 ${toneClasses(s.tone)}`}>
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">{s.label}</div>
                <h2 className="text-base font-bold text-white">{s.title}</h2>
                <p className="text-[12px] leading-relaxed text-slate-300">{s.body}</p>
                <div className="text-[10px] text-sky-300">Details ansehen →</div>
              </Link>
            ) : (
              <div className={`space-y-1.5 rounded-2xl border-2 p-4 ${toneClasses(s.tone)}`}>
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">{s.label}</div>
                <h2 className="text-base font-bold text-white">{s.title}</h2>
                <p className="text-[12px] leading-relaxed text-slate-300">{s.body}</p>
              </div>
            )}
          </li>
        ))}
      </ul>

      <p className="rounded-xl border border-slate-700/60 bg-slate-950/40 p-3 text-[10px] leading-relaxed text-slate-500">
        Aktien sind aktuell nicht angebunden (kein Daten-Provider verknüpft). Sobald sie es sind, kommt eine eigene Sektion dazu.
      </p>
    </main>
  );
}

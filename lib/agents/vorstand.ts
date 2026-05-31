import { AgentVerdict } from '@/lib/agents/personas';

export type VorstandVerdict = 'KLARER_KAUF' | 'KAUFEN_VORSICHTIG' | 'WATCHLIST' | 'CASH_HALTEN';

export interface VorstandReport {
  verdict: VorstandVerdict;
  headline: string;
  body: string;
  consensusCoin: string | null;
  conflictNotes: string[];
}

// Der Vorstand sitzt über den drei CEOs und entscheidet bei Uneinigkeit.
// Regeln:
// - Alle drei BUY auf demselben Coin → KLARER_KAUF
// - 2+ BUY auf demselben Coin → KAUFEN_VORSICHTIG (Mehrheit)
// - 1-2 BUY auf unterschiedlichen Coins → WATCHLIST (Streuung statt Konzentration)
// - 0 BUY → CASH_HALTEN
export function vorstandMediation(verdicts: AgentVerdict[]): VorstandReport {
  const buys = verdicts.filter((v) => v.verdict === 'BUY' && v.target);
  const buyCount = buys.length;
  const conflictNotes: string[] = [];

  if (buyCount === 0) {
    return {
      verdict: 'CASH_HALTEN',
      headline: 'Vorstand: Heute Cash halten',
      body: 'Alle drei Firmen warten — keine Firma sieht heute ein Setup, das ihrer Strategie entspricht. Vorstand bestätigt: Cash ist die richtige Position. Wer in solchen Phasen einsteigt, handelt aus Langeweile, nicht aus Überzeugung.',
      consensusCoin: null,
      conflictNotes
    };
  }

  // Group buys by coin
  const byCoin = new Map<string, AgentVerdict[]>();
  for (const b of buys) {
    const coin = b.target!.symbol;
    if (!byCoin.has(coin)) byCoin.set(coin, []);
    byCoin.get(coin)!.push(b);
  }
  const sortedCoins = Array.from(byCoin.entries()).sort((a, b) => b[1].length - a[1].length);
  const topCoin = sortedCoins[0][0];
  const topCoinSupporters = sortedCoins[0][1];

  // Identify conflicts
  if (sortedCoins.length > 1) {
    const others = sortedCoins.slice(1);
    for (const [coin, vs] of others) {
      conflictNotes.push(`${vs.map((v) => v.name).join(' und ')} stimm${vs.length === 1 ? 't' : 'en'} für ${coin} statt ${topCoin}.`);
    }
  }
  for (const v of verdicts.filter((v) => v.verdict === 'WAIT')) {
    if (v.target && v.target.symbol === topCoin) {
      conflictNotes.push(`${v.name} hat ${topCoin} im Visier, will aber warten: „${v.rationale.replace(/^Ich warte:\s*/, '')}"`);
    }
  }

  if (buyCount === 3 && topCoinSupporters.length === 3) {
    return {
      verdict: 'KLARER_KAUF',
      headline: `Vorstand: Alle drei Firmen für ${topCoin}`,
      body: `Konservativ, Balanciert und Aggressiv stimmen einstimmig für ${topCoin}. Solche Einstimmigkeit ist selten — der Vorstand bestätigt: das Setup ist konsensfähig, Position mit normaler Größe und striktem Stop möglich.`,
      consensusCoin: topCoin,
      conflictNotes
    };
  }

  if (topCoinSupporters.length >= 2) {
    const conservativeIn = topCoinSupporters.some((v) => v.persona === 'conservative');
    const balancedIn = topCoinSupporters.some((v) => v.persona === 'balanced');
    return {
      verdict: 'KAUFEN_VORSICHTIG',
      headline: `Vorstand: Mehrheit für ${topCoin}`,
      body: `${topCoinSupporters.length} von 3 Firmen wollen ${topCoin} kaufen (${topCoinSupporters.map((v) => v.name).join(', ')}). ${conservativeIn ? 'Konservativ ist dabei — solide Basis.' : balancedIn ? 'Balanciert ist dabei, Konservativ wartet — moderates Setup.' : 'Nur die mutigeren Firmen — Position klein halten, Stop respektieren.'}`,
      consensusCoin: topCoin,
      conflictNotes
    };
  }

  // buyCount = 1-2 but spread across different coins
  const buyersList = buys.map((v) => `${v.name} (${v.target!.symbol})`).join(', ');
  return {
    verdict: 'WATCHLIST',
    headline: 'Vorstand: Kein Konsens — Watchlist statt Kauf',
    body: `Die Firmen sind sich uneinig: ${buyersList}. Wenn die drei Firmen heute nicht denselben Coin meinen, sieht der Vorstand keine handlungsfähige Mehrheit. Watchlist führen, bis sich das Bild verdichtet.`,
    consensusCoin: null,
    conflictNotes
  };
}

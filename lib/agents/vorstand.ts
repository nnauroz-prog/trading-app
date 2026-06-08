import { AgentVerdict, PersonaId } from '@/lib/agents/personas';

export type VorstandVerdict = 'KLARER_KAUF' | 'KAUFEN_VORSICHTIG' | 'WATCHLIST' | 'CASH_HALTEN';

export interface VorstandReport {
  verdict: VorstandVerdict;
  headline: string;
  body: string;
  consensusCoin: string | null;
  conflictNotes: string[];
  // Track-Record-Kontext: wenn skill-Daten übergeben wurden, zeigt das Feld
  // die Skill-gewichtete Konfidenz, sonst null. Reines Display-Feld — der
  // verdict selbst wird durch Skill nur dann verschoben, wenn er bei einer
  // klaren Mehrheit MIT bzw. OHNE die hochbewerteten Firmen ausgeht.
  skillWeightedConfidence: number | null;
  skillNote: string | null;
}

// Wenn skill-Map übergeben wird: hochgewichtete Firmen zählen 1.0+, niedrig
// gewichtete < 1.0. Damit gewinnt eine 70 %-Trefferquoten-Firma de facto
// stärker als eine 30 %-Firma.
function weightedBuyCount(buys: AgentVerdict[], skill: Map<PersonaId, number> | null): number {
  if (!skill) return buys.length;
  return buys.reduce((s, v) => s + (skill.get(v.persona) ?? 1), 0);
}

// Der Vorstand sitzt über den drei CEOs und entscheidet bei Uneinigkeit.
// Regeln (unverändert):
// - Alle drei BUY auf demselben Coin → KLARER_KAUF
// - 2+ BUY auf demselben Coin → KAUFEN_VORSICHTIG (Mehrheit)
// - 1-2 BUY auf unterschiedlichen Coins → WATCHLIST (Streuung statt Konzentration)
// - 0 BUY → CASH_HALTEN
//
// Optionale skill-Map gewichtet die Stimmen — eine Firma mit historisch hoher
// Trefferquote zählt mehr als eine mit niedriger. Verändert NIE die Schwellen,
// nur die Konfidenz und die Begleit-Begründung.
export function vorstandMediation(verdicts: AgentVerdict[], firmaSkill: Map<PersonaId, number> | null = null): VorstandReport {
  const buys = verdicts.filter((v) => v.verdict === 'BUY' && v.target);
  const buyCount = buys.length;
  const conflictNotes: string[] = [];

  if (buyCount === 0) {
    return {
      verdict: 'CASH_HALTEN',
      headline: 'Vorstand: Heute Cash halten',
      body: 'Alle drei Firmen warten — keine Firma sieht heute ein Setup, das ihrer Strategie entspricht. Vorstand bestätigt: Cash ist die richtige Position. Wer in solchen Phasen einsteigt, handelt aus Langeweile, nicht aus Überzeugung.',
      consensusCoin: null,
      conflictNotes,
      skillWeightedConfidence: null,
      skillNote: skillNoteFor(verdicts, firmaSkill, 'cash')
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
      conflictNotes,
      skillWeightedConfidence: confidenceFor(topCoinSupporters, verdicts, firmaSkill),
      skillNote: skillNoteFor(verdicts, firmaSkill, 'unanimous', topCoin)
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
      conflictNotes,
      skillWeightedConfidence: confidenceFor(topCoinSupporters, verdicts, firmaSkill),
      skillNote: skillNoteFor(verdicts, firmaSkill, 'majority', topCoin)
    };
  }

  // buyCount = 1-2 but spread across different coins
  const buyersList = buys.map((v) => `${v.name} (${v.target!.symbol})`).join(', ');
  return {
    verdict: 'WATCHLIST',
    headline: 'Vorstand: Kein Konsens — Watchlist statt Kauf',
    body: `Die Firmen sind sich uneinig: ${buyersList}. Wenn die drei Firmen heute nicht denselben Coin meinen, sieht der Vorstand keine handlungsfähige Mehrheit. Watchlist führen, bis sich das Bild verdichtet.`,
    consensusCoin: null,
    conflictNotes,
    skillWeightedConfidence: confidenceFor(buys, verdicts, firmaSkill),
    skillNote: skillNoteFor(verdicts, firmaSkill, 'split')
  };
}

// 0..1: Anteil des skill-gewichteten BUY-Stimmen-Gewichts an der Summe ALLER
// Stimmen. Wenn keine Skill-Daten da sind: null.
function confidenceFor(buyers: AgentVerdict[], all: AgentVerdict[], skill: Map<PersonaId, number> | null): number | null {
  if (!skill || skill.size === 0) return null;
  const buyW = weightedBuyCount(buyers, skill);
  const totalW = all.reduce((s, v) => s + (skill.get(v.persona) ?? 1), 0);
  return totalW > 0 ? buyW / totalW : null;
}

// Beschreibt den Track-Record-Effekt in einem Satz für die UI.
function skillNoteFor(
  verdicts: AgentVerdict[],
  skill: Map<PersonaId, number> | null,
  kind: 'cash' | 'unanimous' | 'majority' | 'split',
  coin?: string
): string | null {
  if (!skill || skill.size === 0) return null;
  const buys = verdicts.filter((v) => v.verdict === 'BUY');
  const waits = verdicts.filter((v) => v.verdict === 'WAIT');
  const trustedBuys = buys.filter((v) => (skill.get(v.persona) ?? 1) >= 1.2);
  const trustedWaits = waits.filter((v) => (skill.get(v.persona) ?? 1) >= 1.2);
  const weakBuys = buys.filter((v) => (skill.get(v.persona) ?? 1) < 0.8);

  if (kind === 'unanimous') {
    return `Track-Record stützt die Einstimmigkeit${coin ? ` auf ${coin}` : ''}: alle drei Firmen mit eingebauter Historie.`;
  }
  if (kind === 'majority') {
    if (trustedBuys.length > 0) {
      return `Track-Record stützt das KAUFEN: ${trustedBuys.map((v) => v.name).join(' + ')} haben historisch überdurchschnittlich getroffen.`;
    }
    if (trustedWaits.length > 0) {
      return `Track-Record widerspricht der Mehrheit: ${trustedWaits.map((v) => v.name).join(' + ')} (höhere Hit-Rate) wartet — Position vorsichtiger sizen.`;
    }
    if (weakBuys.length === buys.length) {
      return `Mehrheit kommt von Firmen mit historisch unterdurchschnittlicher Trefferquote — Position klein halten.`;
    }
    return null;
  }
  if (kind === 'split') {
    if (trustedBuys.length > 0) {
      return `Track-Record stützt: ${trustedBuys.map((v) => v.name).join(', ')} (historisch stark) hat heute gekauft.`;
    }
    return null;
  }
  // cash
  if (trustedWaits.length === 3) {
    return 'Track-Record bestätigt: alle Firmen wachsen historisch ins Cash-Halten an Tagen wie heute.';
  }
  return null;
}

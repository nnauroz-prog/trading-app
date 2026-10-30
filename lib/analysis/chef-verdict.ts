// Chef-Verdict: die eine klare Tagesempfehlung. Fasst Krypto-, Aktien-
// und Rohstoff-Signale zu EINER ehrlichen Aussage zusammen — statt den
// Nutzer mit 20 Einzelkarten allein zu lassen.
//
// Leitlinien (das, was einen guten Berater ausmacht):
//   1. Klarheit: eine Hauptaussage, nicht zehn.
//   2. Ehrlichkeit: bei schwacher Datenlage/keinem Setup wird das
//      gesagt — nicht geraten. "Cash ist auch eine Position."
//   3. Begruendung + Risiko: warum, und was dagegen spricht.
//
// Reine Funktion, keine Netzwerk-/Live-Zugriffe — voll testbar.

export type ChefStance = 'opportunity' | 'selective' | 'patience' | 'no_data';
export type ChefConfidence = 'niedrig' | 'mittel' | 'hoch';

export interface ChefAssetSignal {
  // Hat der Provider überhaupt Daten geliefert?
  dataAvailable: boolean;
}

export interface ChefCryptoSignal extends ChefAssetSignal {
  kind: 'trade' | 'no_trade';
  symbol: string | null;
  confidencePct: number | null; // 0-100, nur bei kind==='trade' sinnvoll
  reason: string | null;
  marketMood: 'risk-on' | 'risk-off' | 'neutral';
  crowdCautious: boolean;
}

export interface ChefInstrumentSignal extends ChefAssetSignal {
  topSymbol: string | null;
  topName: string | null;
  gradeACount: number; // Anzahl Werte mit Verdict KAUFEN (Grade A)
}

export interface ChefVerdictInput {
  crypto: ChefCryptoSignal;
  stocks: ChefInstrumentSignal;
  commodities: ChefInstrumentSignal;
}

export interface ChefPrimary {
  assetClass: 'Krypto' | 'Aktien' | 'Rohstoffe';
  label: string;
  detail: string;
  href: string;
}

export interface ChefVerdict {
  stance: ChefStance;
  headline: string;
  primary: ChefPrimary | null;
  reasoning: string[];
  risks: string[];
  dataQualityNote: string | null;
  confidence: ChefConfidence;
}

function confidenceWord(pct: number | null): ChefConfidence {
  if (pct === null) return 'niedrig';
  if (pct >= 75) return 'hoch';
  if (pct >= 55) return 'mittel';
  return 'niedrig';
}

export function buildChefVerdict(input: ChefVerdictInput): ChefVerdict {
  const { crypto, stocks, commodities } = input;

  const anyData = crypto.dataAvailable || stocks.dataAvailable || commodities.dataAvailable;

  // Datenquellen, die gerade nicht erreichbar sind — ehrlich benennen.
  const missing: string[] = [];
  if (!crypto.dataAvailable) missing.push('Krypto');
  if (!stocks.dataAvailable) missing.push('Aktien');
  if (!commodities.dataAvailable) missing.push('Rohstoffe');
  const dataQualityNote =
    missing.length === 0
      ? null
      : missing.length === 3
        ? 'Aktuell liefert kein Daten-Provider verwertbare Kurse — die Empfehlung ist ausgesetzt, bis die Datenlage wieder steht.'
        : `Eingeschraenkte Datenlage: ${missing.join(' & ')} gerade nicht erreichbar. Nur die verfügbaren Quellen flossen ein.`;

  // Gar keine Daten → ehrlich aussetzen.
  if (!anyData) {
    return {
      stance: 'no_data',
      headline: 'Heute keine belastbare Empfehlung — Datenlage zu dünn.',
      primary: null,
      reasoning: ['Kein Daten-Provider lieferte verwertbare Kurse.'],
      risks: ['Ohne verlaessliche Daten keine Entscheidung — das ist die ehrliche Antwort, kein Rat ins Blaue.'],
      dataQualityNote,
      confidence: 'niedrig'
    };
  }

  const reasoning: string[] = [];
  const risks: string[] = ['Kein Signal ist eine Garantie — Positionsgröße begrenzen, Stop respektieren.'];

  // Marktumfeld als erster Kontext.
  if (crypto.dataAvailable) {
    if (crypto.marketMood === 'risk-off') {
      reasoning.push('Gesamtmarkt ist Risk-off (>60 % der Coins im Minus) — selbst gute Setups laufen dann öfter schief.');
      risks.push('Risk-off-Umfeld: defensiv bleiben, lieber kleiner oder gar nicht.');
    } else if (crypto.marketMood === 'risk-on') {
      reasoning.push('Gesamtmarkt ist Risk-on — Rueckenwind für Long-Setups.');
    } else {
      reasoning.push('Gesamtmarkt neutral — keine klare Richtung vom Umfeld.');
    }
    if (crypto.crowdCautious) {
      risks.push('Sentiment im Extrembereich — die Masse ist oft auf der falschen Seite, Vorsicht.');
    }
  }

  // Primaere Gelegenheit bestimmen. Prioritaet:
  // 1. Krypto mit echtem Trade-Signal (die Engine hat sich festgelegt).
  // 2. Grade-A-Aktie (KAUFEN).
  // 3. Grade-A-Rohstoff.
  let primary: ChefPrimary | null = null;
  let stance: ChefStance;
  let confidence: ChefConfidence = 'niedrig';

  if (crypto.kind === 'trade' && crypto.symbol) {
    primary = {
      assetClass: 'Krypto',
      label: `${crypto.symbol} — Long-Setup`,
      detail: crypto.reason ?? 'Konfluenz der Kriterien erfüllt.',
      href: `/assets/${crypto.symbol.toLowerCase()}`
    };
    confidence = confidenceWord(crypto.confidencePct);
    stance = crypto.marketMood === 'risk-off' ? 'selective' : 'opportunity';
    reasoning.push(`Krypto: klares Setup bei ${crypto.symbol}${crypto.confidencePct !== null ? ` (Konfidenz ${crypto.confidencePct} %)` : ''}.`);
  } else if (stocks.dataAvailable && stocks.gradeACount > 0 && stocks.topSymbol) {
    primary = {
      assetClass: 'Aktien',
      label: `${stocks.topName ?? stocks.topSymbol} — Grade A`,
      detail: `Erfüllt alle 8 Sicherheits-Kriterien. ${stocks.gradeACount} Grade-A-Wert${stocks.gradeACount === 1 ? '' : 'e'} heute.`,
      href: `/aktien/${stocks.topSymbol}`
    };
    confidence = stocks.gradeACount >= 3 ? 'mittel' : 'niedrig';
    stance = crypto.dataAvailable && crypto.marketMood === 'risk-off' ? 'selective' : 'opportunity';
    reasoning.push(`Krypto heute ohne klares Setup — der stabilere Fokus liegt auf Aktien (${stocks.gradeACount} Grade-A).`);
  } else if (commodities.dataAvailable && commodities.gradeACount > 0 && commodities.topSymbol) {
    primary = {
      assetClass: 'Rohstoffe',
      label: `${commodities.topName ?? commodities.topSymbol} — Grade A`,
      detail: `Erfüllt alle Sicherheits-Kriterien. ${commodities.gradeACount} Grade-A-Wert${commodities.gradeACount === 1 ? '' : 'e'} heute.`,
      href: `/rohstoffe/${commodities.topSymbol}`
    };
    confidence = 'niedrig';
    stance = 'selective';
    reasoning.push('Weder Krypto noch Aktien liefern heute ein starkes Signal — einzig bei Rohstoffen ein Grade-A-Wert.');
  } else {
    // Nichts qualifiziert sich.
    stance = 'patience';
    confidence = 'niedrig';
    if (crypto.dataAvailable && crypto.kind === 'no_trade') {
      reasoning.push(`Krypto: kein Setup über der Schwelle${crypto.reason ? ` — ${crypto.reason}` : ''}.`);
    }
    if (stocks.dataAvailable && stocks.gradeACount === 0) {
      reasoning.push('Aktien: heute kein Wert, der alle Sicherheits-Kriterien erfüllt.');
    }
  }

  let headline: string;
  if (stance === 'opportunity' && primary) {
    headline = `Heute ein klares Setup: ${primary.label} (${primary.assetClass}).`;
  } else if (stance === 'selective' && primary) {
    headline = `Zurückhaltung — ein einzelnes Setup wert anzusehen: ${primary.label}.`;
  } else {
    headline = 'Heute kein belastbares Setup — Cash ist auch eine Position.';
  }

  return { stance, headline, primary, reasoning, risks, dataQualityNote, confidence };
}

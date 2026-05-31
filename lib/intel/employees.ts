import { EmployeeReport, IntelContext } from '@/lib/intel/types';

// Each pure function takes the same context and returns a single employee's
// report. Everything is grounded in real data points — no employee fabricates.
// If the data needed is missing, the employee says so (keine_daten).

export function stimmungsForscher(ctx: IntelContext): EmployeeReport {
  if (ctx.fearGreed === null) {
    return {
      id: 'stimmung', title: 'Stimmungs-Forscherin', department: 'Marktstimmung',
      expertise: 'Liest den Fear-&-Greed-Index und überträgt ihn in Klartext.',
      finding: 'Fear-&-Greed-Index gerade nicht abrufbar.',
      signal: 'kein_signal', confidence: 'keine_daten'
    };
  }
  const fg = ctx.fearGreed;
  let signal: EmployeeReport['signal'] = 'neutral';
  let finding: string;
  if (fg >= 80) {
    signal = 'risk-off';
    finding = `Index bei ${fg} — extreme Gier. Antizyklisch lese ich das als rotes Tuch: meistens ist der Markt euphorisch genau dann, wenn die Profis schon verkauft haben.`;
  } else if (fg >= 65) {
    signal = 'neutral';
    finding = `Index bei ${fg} — gierig, aber noch nicht extrem. Trades brauchen jetzt mehr Konfluenz als sonst.`;
  } else if (fg <= 25) {
    signal = 'risk-on';
    finding = `Index bei ${fg} — Angst im Markt. Aus Erfahrung sind das oft die besseren Einstiege, weil die Schwachen schon verkauft haben.`;
  } else if (fg <= 35) {
    signal = 'risk-on';
    finding = `Index bei ${fg} — leichte Vorsicht im Markt, vorsichtige Aufmerksamkeit.`;
  } else {
    finding = `Index bei ${fg} — neutrale Stimmung, kein Extrem.`;
  }
  return {
    id: 'stimmung', title: 'Stimmungs-Forscherin', department: 'Marktstimmung',
    expertise: 'Liest den Fear-&-Greed-Index und überträgt ihn in Klartext.',
    finding, signal,
    confidence: 'sicher',
    detail: `F&G: ${fg}/100`
  };
}

export function derivateAnalyst(ctx: IntelContext): EmployeeReport {
  const btc = ctx.fundingBtcPct;
  const eth = ctx.fundingEthPct;
  if (btc === null && eth === null) {
    return {
      id: 'derivate', title: 'Derivate-Analyst', department: 'Marktstimmung',
      expertise: 'Beobachtet Perpetual-Futures-Funding-Raten.',
      finding: 'Funding-Raten gerade nicht erreichbar.',
      signal: 'kein_signal', confidence: 'keine_daten'
    };
  }
  const max = Math.max(btc ?? 0, eth ?? 0);
  let signal: EmployeeReport['signal'] = 'neutral';
  let finding: string;
  if (max > 30) {
    signal = 'risk-off';
    finding = `Funding annualisiert teuer (BTC ${btc?.toFixed(0)}%, ETH ${eth?.toFixed(0)}%). Long-Seite ist überfüllt — wenn der Wind dreht, wird es eng. Vorsicht mit neuen Longs.`;
  } else if (max > 15) {
    signal = 'neutral';
    finding = `Funding moderat (BTC ${btc?.toFixed(0)}%, ETH ${eth?.toFixed(0)}%). Longs haben den Vorteil, aber noch keine Überhitzung.`;
  } else if (max < 0) {
    signal = 'risk-on';
    finding = `Funding negativ (BTC ${btc?.toFixed(0)}%, ETH ${eth?.toFixed(0)}%). Shorts zahlen — meistens ein Contrarian-Signal für eine Erholung.`;
  } else {
    finding = `Funding ruhig (BTC ${btc?.toFixed(0)}%, ETH ${eth?.toFixed(0)}%). Keine Überhitzung auf einer Seite.`;
  }
  return {
    id: 'derivate', title: 'Derivate-Analyst', department: 'Marktstimmung',
    expertise: 'Beobachtet Perpetual-Futures-Funding-Raten als Maß für Crowd-Positionierung.',
    finding, signal,
    confidence: 'sicher',
    detail: `BTC ${btc?.toFixed(1) ?? '–'}% · ETH ${eth?.toFixed(1) ?? '–'}%`
  };
}

export function dominanzBeobachterin(ctx: IntelContext): EmployeeReport {
  if (ctx.btcDominancePct === null) {
    return {
      id: 'dominanz', title: 'Dominanz-Beobachterin', department: 'Markt-Struktur',
      expertise: 'Schaut auf den Bitcoin-Anteil am Gesamt-Krypto-Markt.',
      finding: 'BTC-Dominanz gerade nicht abrufbar.',
      signal: 'kein_signal', confidence: 'keine_daten'
    };
  }
  const d = ctx.btcDominancePct;
  let finding: string;
  let signal: EmployeeReport['signal'] = 'neutral';
  if (d >= 60) {
    finding = `BTC-Dominanz bei ${d.toFixed(1)}% — BTC saugt Liquidität auf, Altcoins haben es schwer. Wer Alts trädt, kämpft gegen den Wind.`;
    signal = 'neutral';
  } else if (d <= 45) {
    finding = `BTC-Dominanz bei ${d.toFixed(1)}% — Altcoin-Saison-typisch, Geld fließt in Alts. Risk-on, aber Pumps werden volatiler.`;
    signal = 'risk-on';
  } else {
    finding = `BTC-Dominanz bei ${d.toFixed(1)}% — ausgewogenes Verhältnis, kein klares Regime.`;
  }
  return {
    id: 'dominanz', title: 'Dominanz-Beobachterin', department: 'Markt-Struktur',
    expertise: 'Schaut auf den Bitcoin-Anteil am Gesamt-Krypto-Markt.',
    finding, signal,
    confidence: 'sicher',
    detail: `BTC.D ${d.toFixed(1)}%`
  };
}

export function volatilitaetsForscher(ctx: IntelContext): EmployeeReport {
  if (ctx.topCandidates.length === 0) {
    return {
      id: 'vola', title: 'Volatilitäts-Forscher', department: 'Markt-Struktur',
      expertise: 'Beobachtet 24h-Kursbewegungen im Top-Universum.',
      finding: 'Keine Marktdaten verfügbar.',
      signal: 'kein_signal', confidence: 'keine_daten'
    };
  }
  const changes = ctx.topCandidates.map((c) => c.priceChangePct24h);
  const big = changes.filter((c) => Math.abs(c) > 5);
  const up = changes.filter((c) => c > 5).length;
  const down = changes.filter((c) => c < -5).length;
  let signal: EmployeeReport['signal'] = 'neutral';
  let finding: string;
  if (big.length === 0) {
    finding = `Markt ruhig — kein Coin im Top-Universum mit >5% in 24h.`;
  } else if (up > down * 2) {
    signal = 'risk-on';
    finding = `${up} Coins über +5% in 24h, nur ${down} unter −5%. Breite grüne Streuung — Risikoappetit ist da.`;
  } else if (down > up * 2) {
    signal = 'risk-off';
    finding = `${down} Coins unter −5%, nur ${up} über +5%. Breite rote Streuung — Schwäche überall.`;
  } else {
    finding = `Volatil und gemischt: ${up} Coins stark grün, ${down} stark rot.`;
  }
  return {
    id: 'vola', title: 'Volatilitäts-Forscher', department: 'Markt-Struktur',
    expertise: 'Beobachtet 24h-Kursbewegungen im Top-Universum.',
    finding, signal, confidence: 'sicher',
    detail: `${up} ↑5% · ${down} ↓5%`
  };
}

export function liquiditaetsBeobachter(ctx: IntelContext): EmployeeReport {
  if (ctx.topCandidates.length === 0) {
    return {
      id: 'liquidity', title: 'Liquiditäts-Beobachter', department: 'Markt-Struktur',
      expertise: 'Prüft Handelsvolumen für Slippage-Risiko.',
      finding: 'Keine Volumendaten.',
      signal: 'kein_signal', confidence: 'keine_daten'
    };
  }
  const liquid = ctx.topCandidates.filter((c) => c.quoteVolume >= 50_000_000).length;
  const total = ctx.topCandidates.length;
  const ratio = liquid / total;
  let signal: EmployeeReport['signal'] = 'neutral';
  let finding: string;
  if (ratio >= 0.7) {
    finding = `${liquid} von ${total} Top-Coins über 50 Mio. USD 24h-Volumen — Liquidität ist breit, sauberes Ein- und Aussteigen möglich.`;
  } else if (ratio <= 0.3) {
    signal = 'risk-off';
    finding = `Nur ${liquid} von ${total} Coins ausreichend liquide. Dünner Handelstag — Slippage-Risiko ist erhöht, Position-Größen runter.`;
  } else {
    finding = `${liquid} von ${total} Coins gut liquide — gemischtes Bild, bei Alts auf Volumen achten.`;
  }
  return {
    id: 'liquidity', title: 'Liquiditäts-Beobachter', department: 'Markt-Struktur',
    expertise: 'Prüft 24h-Handelsvolumen für Slippage-Risiko.',
    finding, signal, confidence: 'sicher',
    detail: `${liquid}/${total} ≥ 50 Mio.`
  };
}

export function korrelationsAnalyst(ctx: IntelContext): EmployeeReport {
  if (ctx.topCandidates.length === 0) {
    return {
      id: 'korrelation', title: 'Korrelations-Analyst', department: 'Markt-Struktur',
      expertise: 'Identifiziert Coins, die sich von BTC abkoppeln.',
      finding: 'Keine Daten.',
      signal: 'kein_signal', confidence: 'keine_daten'
    };
  }
  const decoupled = ctx.topCandidates
    .filter((c) => c.coinId !== 'btc' && Math.abs(c.relStrengthVsBtc) > 2)
    .slice(0, 3);
  if (decoupled.length === 0) {
    return {
      id: 'korrelation', title: 'Korrelations-Analyst', department: 'Markt-Struktur',
      expertise: 'Identifiziert Coins, die sich von BTC abkoppeln.',
      finding: 'Alle Top-Coins laufen aktuell weitgehend mit BTC — keine Abkopplungen, kein Alt-spezifisches Setup.',
      signal: 'neutral', confidence: 'wahrscheinlich'
    };
  }
  const strong = decoupled.filter((c) => c.relStrengthVsBtc > 0);
  const weak = decoupled.filter((c) => c.relStrengthVsBtc < 0);
  const lines: string[] = [];
  if (strong.length > 0) lines.push(`stärker als BTC: ${strong.map((c) => c.symbol).join(', ')}`);
  if (weak.length > 0) lines.push(`schwächer als BTC: ${weak.map((c) => c.symbol).join(', ')}`);
  return {
    id: 'korrelation', title: 'Korrelations-Analyst', department: 'Markt-Struktur',
    expertise: 'Identifiziert Coins, die sich von BTC abkoppeln.',
    finding: `Bemerkenswerte Abkopplungen: ${lines.join(' · ')}.`,
    signal: 'neutral', confidence: 'wahrscheinlich',
    detail: lines.join(' / ')
  };
}

export function nachrichtenRedakteur(ctx: IntelContext): EmployeeReport {
  if (ctx.newsTotal === 0) {
    return {
      id: 'news', title: 'Nachrichten-Redakteur', department: 'Nachrichten & Makro',
      expertise: 'Fasst die wichtigsten Krypto-Nachrichten des Tages zusammen.',
      finding: 'Aktuell keine Schlagzeilen erreichbar.',
      signal: 'kein_signal', confidence: 'keine_daten'
    };
  }
  let signal: EmployeeReport['signal'] = 'neutral';
  if (ctx.newsBullish > ctx.newsBearish * 1.5) signal = 'risk-on';
  else if (ctx.newsBearish > ctx.newsBullish * 1.5) signal = 'risk-off';

  const sentimentLines = ctx.topCoinSentiment.slice(0, 2).filter((c) => c.tilt !== 'neutral').map(
    (c) => `${c.coin} eher ${c.tilt} (${c.bullishCount}↑/${c.bearishCount}↓)`
  );

  let finding = `${ctx.newsBullish} bullische vs ${ctx.newsBearish} bärische Headlines unter ${ctx.newsTotal} insgesamt.`;
  if (ctx.newsTopHeadline) finding += ` Top-Schlagzeile: „${ctx.newsTopHeadline}".`;
  if (sentimentLines.length > 0) finding += ` Coin-Lage: ${sentimentLines.join(' · ')}.`;

  return {
    id: 'news', title: 'Nachrichten-Redakteur', department: 'Nachrichten & Makro',
    expertise: 'Fasst die wichtigsten Krypto-Nachrichten des Tages zusammen.',
    finding, signal, confidence: 'sicher',
    detail: `${ctx.newsBullish}↑/${ctx.newsBearish}↓`
  };
}

export function makroBeobachter(ctx: IntelContext): EmployeeReport {
  if (!ctx.nextHighImpactEvent) {
    return {
      id: 'makro', title: 'Makro-Beobachter', department: 'Nachrichten & Makro',
      expertise: 'Verfolgt US/EU-Wirtschaftstermine (FOMC, CPI, NFP, Core PCE).',
      finding: 'In den nächsten 7 Tagen kein hoch-impact Termin im Plan — Märkte handeln rein technisch.',
      signal: 'neutral', confidence: 'sicher'
    };
  }
  const e = ctx.nextHighImpactEvent;
  let signal: EmployeeReport['signal'] = 'neutral';
  let finding: string;
  if (e.hoursUntil <= 12) {
    signal = 'risk-off';
    finding = `${e.title} in ${e.hoursUntil} Stunden. Sehr nah — selbst saubere Setups können nach dem Release wild laufen.`;
  } else if (e.hoursUntil <= 24) {
    signal = 'neutral';
    finding = `${e.title} in ${e.hoursUntil} Stunden. Konservativ wartet bis nach dem Termin, andere können noch handeln.`;
  } else {
    finding = `Nächster hoch-impact Termin: ${e.title} in ${e.hoursUntil} Stunden (~${Math.round(e.hoursUntil / 24)} Tage).`;
  }
  return {
    id: 'makro', title: 'Makro-Beobachter', department: 'Nachrichten & Makro',
    expertise: 'Verfolgt US/EU-Wirtschaftstermine (FOMC, CPI, NFP, Core PCE).',
    finding, signal, confidence: 'sicher',
    detail: `${e.title} · ${e.hoursUntil}h`
  };
}

export function zyklusForscher(ctx: IntelContext): EmployeeReport {
  if (!ctx.cycleLabel) {
    return {
      id: 'zyklus', title: 'Zyklus-Forscher', department: 'Nachrichten & Makro',
      expertise: 'Verortet uns im Bitcoin-Halving-Zyklus.',
      finding: 'Zyklus-Daten nicht verfügbar.',
      signal: 'kein_signal', confidence: 'keine_daten'
    };
  }
  return {
    id: 'zyklus', title: 'Zyklus-Forscher', department: 'Nachrichten & Makro',
    expertise: 'Verortet uns im Bitcoin-Halving-Zyklus.',
    finding: `Aktuelle Zyklus-Phase: ${ctx.cycleLabel}${ctx.cycleProgressPct !== null ? ` (${ctx.cycleProgressPct.toFixed(0)}% durch).` : '.'} Historisch bestimmt der Zyklus die Grund-Richtung mehr als jede Tages-News.`,
    signal: 'neutral', confidence: 'wahrscheinlich',
    detail: ctx.cycleLabel
  };
}

export function strategieAuswerter(ctx: IntelContext): EmployeeReport {
  if (ctx.backtestSafeTrades === 0) {
    return {
      id: 'strategie', title: 'Strategie-Auswerter', department: 'Eigene Performance',
      expertise: 'Berichtet, wie die strenge Strategie der App historisch lief.',
      finding: 'In den letzten Backtest-Tagen kam kein einziger Trade durch das Safety-Tier. Markt war für diese Strategie schlicht ungeeignet.',
      signal: 'neutral', confidence: 'sicher'
    };
  }
  const wr = ctx.backtestSafeWinRatePct ?? 0;
  const net = ctx.backtestSafeNetReturnPct;
  let signal: EmployeeReport['signal'] = 'neutral';
  if (net > 5 && wr >= 55) signal = 'risk-on';
  else if (net < -3) signal = 'risk-off';
  return {
    id: 'strategie', title: 'Strategie-Auswerter', department: 'Eigene Performance',
    expertise: 'Berichtet, wie die strenge Strategie der App historisch lief.',
    finding: `Letzte ${ctx.backtestPeriodDays} Tage: ${ctx.backtestSafeTrades} Safe-Trades, ${wr.toFixed(0)}% Trefferquote, ${net >= 0 ? '+' : ''}${net.toFixed(1)}% netto. ${net > 5 ? 'Strategie war zuletzt im Plus.' : net < -3 ? 'Strategie verliert gerade — Marktphase ungünstig.' : 'Strategie etwa neutral.'}`,
    signal, confidence: 'sicher',
    detail: `${wr.toFixed(0)}% · ${net >= 0 ? '+' : ''}${net.toFixed(1)}%`
  };
}

export function tradeHistoriker(ctx: IntelContext): EmployeeReport {
  if (ctx.recentBuyDays + ctx.recentWaitDays === 0) {
    return {
      id: 'historiker', title: 'Trade-Historiker', department: 'Eigene Performance',
      expertise: 'Liest das lokale Firmen-Tagebuch.',
      finding: 'Tagebuch noch leer — sobald die Startseite ein paar Tage offen war, baue ich Statistik auf.',
      signal: 'kein_signal', confidence: 'keine_daten'
    };
  }
  const total = ctx.recentBuyDays + ctx.recentWaitDays;
  const buyShare = (ctx.recentBuyDays / total) * 100;
  let finding: string;
  if (buyShare >= 50) finding = `Die Firmen haben in den letzten ${total} Tagen an ${ctx.recentBuyDays} Tagen kaufen wollen — aktive Marktphase.`;
  else if (buyShare >= 20) finding = `In den letzten ${total} Tagen ${ctx.recentBuyDays} Kauf-Tage / ${ctx.recentWaitDays} Warte-Tage. Selektiver Markt — passt zur strengen Strategie.`;
  else if (ctx.recentBuyDays === 0) finding = `${total} Tage in Folge nur Warten. Marktphase passt nicht zu unserer Strategie — diszipliniert bleiben.`;
  else finding = `Überwiegend Warte-Tage zuletzt (${ctx.recentBuyDays}/${total} Kaufen) — wenig Setups, das ist normal.`;
  return {
    id: 'historiker', title: 'Trade-Historiker', department: 'Eigene Performance',
    expertise: 'Liest das lokale Firmen-Tagebuch und interpretiert die Trefferfrequenz.',
    finding,
    signal: 'neutral',
    confidence: 'wahrscheinlich',
    detail: `${ctx.recentBuyDays}↑ / ${ctx.recentWaitDays}↓`
  };
}

export function pumpDetektiv(ctx: IntelContext): EmployeeReport {
  if (ctx.topCandidates.length === 0) {
    return {
      id: 'pump', title: 'Pump-Detektivin', department: 'Risiko',
      expertise: 'Identifiziert überdehnte Pumps und scharfe Drops.',
      finding: 'Keine Marktdaten.',
      signal: 'kein_signal', confidence: 'keine_daten'
    };
  }
  const pumps = ctx.topCandidates.filter((c) => c.priceChangePct24h > 15);
  const dumps = ctx.topCandidates.filter((c) => c.priceChangePct24h < -15);
  if (pumps.length === 0 && dumps.length === 0) {
    return {
      id: 'pump', title: 'Pump-Detektivin', department: 'Risiko',
      expertise: 'Identifiziert überdehnte Pumps und scharfe Drops.',
      finding: 'Keine extremen Bewegungen — kein Coin mit >15% in 24h. Ordentliche Bedingungen, keine Pump-Hektik.',
      signal: 'neutral', confidence: 'sicher'
    };
  }
  const parts: string[] = [];
  if (pumps.length > 0) parts.push(`Pumps: ${pumps.map((c) => `${c.symbol} +${c.priceChangePct24h.toFixed(1)}%`).join(', ')}`);
  if (dumps.length > 0) parts.push(`Dumps: ${dumps.map((c) => `${c.symbol} ${c.priceChangePct24h.toFixed(1)}%`).join(', ')}`);
  return {
    id: 'pump', title: 'Pump-Detektivin', department: 'Risiko',
    expertise: 'Identifiziert überdehnte Pumps und scharfe Drops.',
    finding: `${parts.join(' · ')}. Diese Coins meidet die App heute aktiv — den Tail dieser Kerze einzukaufen ist statistisch ein Verlustgeschäft.`,
    signal: 'risk-off', confidence: 'sicher',
    detail: `${pumps.length} Pumps · ${dumps.length} Dumps`
  };
}

export const ALL_EMPLOYEES = [
  stimmungsForscher,
  derivateAnalyst,
  dominanzBeobachterin,
  volatilitaetsForscher,
  liquiditaetsBeobachter,
  korrelationsAnalyst,
  nachrichtenRedakteur,
  makroBeobachter,
  zyklusForscher,
  strategieAuswerter,
  tradeHistoriker,
  pumpDetektiv
] as const;

export function runAllEmployees(ctx: IntelContext): EmployeeReport[] {
  return ALL_EMPLOYEES.map((fn) => fn(ctx));
}

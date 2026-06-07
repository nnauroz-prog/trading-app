// Daily Decision Engine: aggregiert alle Sicherheits-Gates, Vorstands-Verdicts
// und Tipp-Engines zu einer ehrlichen Tagesentscheidung. Reine Funktionen,
// kein I/O — die Page lädt die Daten und reicht sie hier rein.

export type MarketMode = 'OFFENSIV' | 'SELEKTIV' | 'DEFENSIV' | 'CASH';

export interface StockEntry {
  symbol: string;
  name: string;
  group: string;
  grade: 'A' | 'B' | 'C' | 'D';
  score: number;
  passedHard: number;
  totalHard: number;
}

export interface CommodityEntry {
  symbol: string;
  name: string;
  group: string;
  emoji?: string;
  grade: 'A' | 'B' | 'C' | 'D';
  score: number;
  passedHard: number;
  totalHard: number;
}

export interface CryptoEntry {
  symbol: string;
  coinId: string;
  passedCount: number;
  totalCount: number;
  grade: 'A' | 'B' | 'C' | 'D';
  score: number;
  oneLineReason: string;
}

export interface SportTipEntry {
  fixtureId: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  market: string;
  probability: number;
  tier: 'maximal' | 'sehr-sicher' | 'sicher';
  source: 'WM' | 'Liga-Fußball';
  rationale: string;
}

export interface PersonaVerdictEntry {
  klass: 'Krypto' | 'Aktien' | 'Rohstoffe' | 'WM' | 'Liga-Fußball';
  persona: string;
  personaName: string;
  verdict: string;
  isBuy: boolean;
  targetLabel: string | null;
}

export interface DailyEngineInputs {
  stocks: StockEntry[];
  commodities: CommodityEntry[];
  cryptoTop: CryptoEntry | null;
  cryptoMaxSafety: boolean;
  sportTips: SportTipEntry[];
  personaVerdicts: PersonaVerdictEntry[];
}

// Wie verlässlich ist der Mode-Call?
// - 'high': alle Datenquellen liefern und stimmen erkennbar überein
// - 'medium': zumindest die Hälfte der Quellen liefert
// - 'low': zu wenig Datenbasis für eine ehrliche Entscheidung
export type DataQuality = 'high' | 'medium' | 'low';

// Wie eindeutig ist die Mode-Klassifikation? 0..1.
// 1.0 = lehrbuchmäßig OFFENSIV/DEFENSIV. 0.5 = SELEKTIV.
export type ModeConfidence = number;

export interface ModeAssessment {
  mode: MarketMode;
  reason: string;
  dataQuality: DataQuality;
  modeConfidence: ModeConfidence;
  metrics: {
    stocksGradeA: number;
    stocksGradeB: number;
    commoditiesGradeA: number;
    commoditiesGradeB: number;
    cryptoMaxSafety: boolean;
    cryptoGrade: 'A' | 'B' | 'C' | 'D' | null;
    maximalSportTips: number;
    sehrSichereSportTips: number;
    personaBuyCount: number;
    personaTotal: number;
  };
}

// Wie viele Datenquellen haben heute überhaupt etwas geliefert?
// Stocks / Commodities / Crypto / Sport / Personas — jeweils 1 Punkt.
function countAvailableSources(input: DailyEngineInputs): number {
  let n = 0;
  if (input.stocks.length > 0) n++;
  if (input.commodities.length > 0) n++;
  if (input.cryptoTop !== null) n++;
  if (input.sportTips.length > 0) n++;
  if (input.personaVerdicts.length > 0) n++;
  return n;
}

function dataQualityFor(input: DailyEngineInputs): DataQuality {
  const n = countAvailableSources(input);
  if (n >= 4) return 'high';
  if (n >= 2) return 'medium';
  return 'low';
}

// Modus-Confidence: wie eindeutig fällt die Klassifikation aus?
// - CASH-out-of-no-data: 1.0 (eindeutig nichts da)
// - OFFENSIV/DEFENSIV: skaliert mit Überschreitung der Schwellen
// - SELEKTIV: 0.5 als Default
function modeConfidenceFor(
  mode: MarketMode,
  broadGradeA: number,
  personaBuyShare: number,
  personaWaitShare: number,
  maximalSportTips: number,
  hasAnyData: boolean
): ModeConfidence {
  if (mode === 'CASH') {
    return hasAnyData ? 0.5 : 1.0;
  }
  if (mode === 'OFFENSIV') {
    // Volle 1.0 bei 8+ Grade-A Assets, 80 %+ Buy-Quote, 4+ maximal-sicheren Sport-Tipps.
    const aScore = Math.min(broadGradeA / 8, 1);
    const buyScore = Math.min(personaBuyShare / 0.8, 1);
    const sportScore = Math.min(maximalSportTips / 4, 1);
    return Math.max(0.6, (aScore + buyScore + sportScore) / 3);
  }
  if (mode === 'DEFENSIV') {
    // Volle 1.0 bei 80 % WARTEN-Quote.
    return Math.max(0.6, Math.min(personaWaitShare / 0.8, 1));
  }
  // SELEKTIV: je näher am OFFENSIV-Rand, desto höhere Confidence im SELEKTIV-Modus
  // — denn klare „SELEKTIV"-Tage sind die mit gemischten Signalen.
  return 0.5;
}

// Ein einziges sauberes Modell, das aus den Eingaben den Tages-Modus ableitet.
// Kein Marketing — die Regeln sind explizit.
export function evaluateMarketMode(input: DailyEngineInputs): ModeAssessment {
  const stocksGradeA = input.stocks.filter((s) => s.grade === 'A').length;
  const stocksGradeB = input.stocks.filter((s) => s.grade === 'B').length;
  const commoditiesGradeA = input.commodities.filter((c) => c.grade === 'A').length;
  const commoditiesGradeB = input.commodities.filter((c) => c.grade === 'B').length;
  const cryptoGrade = input.cryptoTop?.grade ?? null;
  const maximalSportTips = input.sportTips.filter((t) => t.tier === 'maximal').length;
  const sehrSichereSportTips = input.sportTips.filter((t) => t.tier === 'sehr-sicher').length;
  const personaTotal = input.personaVerdicts.length;
  const personaBuyCount = input.personaVerdicts.filter((p) => p.isBuy).length;

  const metrics = {
    stocksGradeA, stocksGradeB,
    commoditiesGradeA, commoditiesGradeB,
    cryptoMaxSafety: input.cryptoMaxSafety,
    cryptoGrade,
    maximalSportTips, sehrSichereSportTips,
    personaBuyCount, personaTotal
  };

  const dataQuality = dataQualityFor(input);
  const broadGradeA = stocksGradeA + commoditiesGradeA + (input.cryptoMaxSafety ? 1 : 0);
  const personaBuyShare = personaTotal > 0 ? personaBuyCount / personaTotal : 0;
  const personaWaitCount = input.personaVerdicts.filter((p) => !p.isBuy && (p.verdict === 'WARTEN' || p.verdict === 'WAIT')).length;
  const personaWaitShare = personaTotal > 0 ? personaWaitCount / personaTotal : 0;

  // Wenn überhaupt nichts vorliegt → CASH (ehrlicher Empty-State)
  const noStockData = input.stocks.length === 0;
  const noCommodityData = input.commodities.length === 0;
  const noCryptoData = input.cryptoTop === null;
  const hasAnyData = countAvailableSources(input) > 0;
  if (noStockData && noCommodityData && noCryptoData && input.sportTips.length === 0 && personaTotal === 0) {
    return {
      mode: 'CASH',
      reason: 'Keine Daten — heute keine Entscheidung möglich. Beobachten oder Cash halten.',
      dataQuality,
      modeConfidence: modeConfidenceFor('CASH', broadGradeA, personaBuyShare, personaWaitShare, maximalSportTips, hasAnyData),
      metrics
    };
  }

  // OFFENSIV: viele Grade A quer durch + viele Persona-Buys + maximal-sichere Sport-Tipps
  if (broadGradeA >= 4 && personaBuyShare >= 0.6 && maximalSportTips >= 2) {
    return {
      mode: 'OFFENSIV',
      reason: `Breite Stärke: ${broadGradeA} Grade-A Assets, ${personaBuyCount}/${personaTotal} Personas kaufen/tippen, ${maximalSportTips} maximal-sichere Sport-Tipps. Trotzdem nie mehr als geplant riskieren.`,
      dataQuality,
      modeConfidence: modeConfidenceFor('OFFENSIV', broadGradeA, personaBuyShare, personaWaitShare, maximalSportTips, hasAnyData),
      metrics
    };
  }

  // DEFENSIV: nichts schafft Grade A, Personas mehrheitlich WARTEN
  if (broadGradeA === 0 && maximalSportTips === 0 && personaWaitShare >= 0.6) {
    return {
      mode: 'DEFENSIV',
      reason: `Kein Asset im Grade-A, keine maximal-sicheren Sport-Tipps, ${personaWaitCount}/${personaTotal} Personas warten. Heute Risiko klein halten oder Cash.`,
      dataQuality,
      modeConfidence: modeConfidenceFor('DEFENSIV', broadGradeA, personaBuyShare, personaWaitShare, maximalSportTips, hasAnyData),
      metrics
    };
  }

  // SELEKTIV: dazwischen — selektiv, nur klare Setups
  return {
    mode: 'SELEKTIV',
    reason: `Gemischtes Bild: ${broadGradeA} Grade-A Assets, ${personaBuyCount}/${personaTotal} Personas grün, ${maximalSportTips} maximal-sichere Sport-Tipps. Heute nur klare Konsens-Setups, der Rest beobachten.`,
    dataQuality,
    modeConfidence: modeConfidenceFor('SELEKTIV', broadGradeA, personaBuyShare, personaWaitShare, maximalSportTips, hasAnyData),
    metrics
  };
}

export interface TopChance {
  source: 'Krypto' | 'Aktien' | 'Rohstoffe' | 'Sport' | 'Watchlist';
  label: string;
  detail: string;
  verdict: string;
  score: number | null;
  href: string;
  rationale: string;
}

// Sortiert die N besten Tageschancen quer durch alle Asset-Klassen.
// Sport-Picks werden nach Wahrscheinlichkeit gewichtet, Asset-Klassen nach Score.
// Wenn ein Bereich nichts liefert, taucht er einfach nicht in der Liste auf.
export function topChances(input: DailyEngineInputs, watchlistAlarms: WatchlistAlarm[] = [], limit = 5): TopChance[] {
  const out: TopChance[] = [];

  if (input.cryptoTop && (input.cryptoTop.grade === 'A' || input.cryptoTop.grade === 'B')) {
    out.push({
      source: 'Krypto',
      label: input.cryptoTop.symbol,
      detail: `Grade ${input.cryptoTop.grade} · ${input.cryptoTop.passedCount}/${input.cryptoTop.totalCount} Häkchen`,
      verdict: input.cryptoMaxSafety ? 'KAUFEN' : 'BEOBACHTEN',
      score: input.cryptoTop.score,
      href: `/assets/${input.cryptoTop.symbol.toLowerCase()}`,
      rationale: input.cryptoTop.oneLineReason
    });
  }

  const topStock = [...input.stocks]
    .filter((s) => s.grade === 'A' || s.grade === 'B')
    .sort((a, b) => b.score - a.score)[0];
  if (topStock) {
    out.push({
      source: 'Aktien',
      label: topStock.name,
      detail: `${topStock.symbol} · ${topStock.group} · Grade ${topStock.grade}`,
      verdict: topStock.grade === 'A' ? 'KAUFEN' : 'BEOBACHTEN',
      score: topStock.score,
      href: `/aktien/${encodeURIComponent(topStock.symbol)}`,
      rationale: `${topStock.passedHard}/${topStock.totalHard} Sicherheits-Kriterien erfüllt.`
    });
  }

  const topCommodity = [...input.commodities]
    .filter((c) => c.grade === 'A' || c.grade === 'B')
    .sort((a, b) => b.score - a.score)[0];
  if (topCommodity) {
    out.push({
      source: 'Rohstoffe',
      label: `${topCommodity.emoji ?? ''} ${topCommodity.name}`.trim(),
      detail: `${topCommodity.symbol} · ${topCommodity.group} · Grade ${topCommodity.grade}`,
      verdict: topCommodity.grade === 'A' ? 'KAUFEN' : 'BEOBACHTEN',
      score: topCommodity.score,
      href: `/rohstoffe/${encodeURIComponent(topCommodity.symbol)}`,
      rationale: `${topCommodity.passedHard}/${topCommodity.totalHard} Sicherheits-Kriterien erfüllt.`
    });
  }

  const topSport = [...input.sportTips]
    .sort((a, b) => b.probability - a.probability)[0];
  if (topSport) {
    out.push({
      source: 'Sport',
      label: `${topSport.homeTeam} – ${topSport.awayTeam}`,
      detail: `${topSport.source} · ${topSport.market} · ${Math.round(topSport.probability * 100)} %`,
      verdict: topSport.tier === 'maximal' ? 'TIPPEN' : 'BEOBACHTEN',
      score: Math.round(topSport.probability * 100),
      href: topSport.source === 'WM' ? `/wm/${encodeURIComponent(topSport.fixtureId)}` : '/sport',
      rationale: topSport.rationale
    });
  }

  const topAlarm = [...watchlistAlarms]
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
  if (topAlarm) {
    out.push({
      source: 'Watchlist',
      label: topAlarm.label,
      detail: topAlarm.detail,
      verdict: topAlarm.verdict,
      score: topAlarm.score,
      href: topAlarm.href,
      rationale: topAlarm.rationale
    });
  }

  return out.slice(0, limit);
}

export interface WarningEntry {
  source: 'Aktien' | 'Rohstoffe' | 'Sport' | 'Krypto';
  label: string;
  symbol: string | null;
  reason: string;
  href: string | null;
}

// Listet Werte, die heute klare Negativ-Signale liefern. Konkrete Begründung pro
// Zeile — keine dramatische Sprache, keine Garantien gegen sie zu wetten.
// Sortiert: schlechtestes passedHard zuerst, dann alphabetisch nach Label.
// So sieht der User die wirklich schlimmen Fälle zuerst, nicht zufällig.
export function warningZone(input: DailyEngineInputs, limit = 8): WarningEntry[] {
  // severity: niedriger passedHard = schlimmer.
  const buckets: Array<{ entry: WarningEntry; severity: number }> = [];

  for (const s of input.stocks) {
    if (s.grade === 'D') {
      buckets.push({
        severity: s.passedHard,
        entry: {
          source: 'Aktien',
          label: s.name,
          symbol: s.symbol,
          reason: `Grade D — nur ${s.passedHard}/${s.totalHard} Kriterien.`,
          href: `/aktien/${encodeURIComponent(s.symbol)}`
        }
      });
    }
  }
  for (const c of input.commodities) {
    if (c.grade === 'D') {
      buckets.push({
        severity: c.passedHard,
        entry: {
          source: 'Rohstoffe',
          label: c.name,
          symbol: c.symbol,
          reason: `Grade D — nur ${c.passedHard}/${c.totalHard} Kriterien.`,
          href: `/rohstoffe/${encodeURIComponent(c.symbol)}`
        }
      });
    }
  }
  if (input.cryptoTop && input.cryptoTop.grade === 'D') {
    buckets.push({
      severity: input.cryptoTop.passedCount,
      entry: {
        source: 'Krypto',
        label: input.cryptoTop.symbol,
        symbol: input.cryptoTop.symbol,
        reason: `Grade D im Krypto-Gate — nur ${input.cryptoTop.passedCount}/${input.cryptoTop.totalCount} Häkchen.`,
        href: `/assets/${input.cryptoTop.symbol.toLowerCase()}`
      }
    });
  }
  // Sport-Picks die NICHT in den safe tips waren — sind hier nicht zugänglich,
  // dafür hat die /sport-Seite schon ihre eigenen "open"-Banner.

  buckets.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity - b.severity;
    return a.entry.label.localeCompare(b.entry.label);
  });
  return buckets.slice(0, limit).map((b) => b.entry);
}

export interface PersonaCompassResult {
  totalPersonas: number;
  buyCount: number;
  watchCount: number;
  waitCount: number;
  // Klasse mit der höchsten Buy-Quote. Bei Gleichstand: erste in alphabetischer Reihenfolge.
  strongestKlass: string | null;
  strongestBuyShare: number;
  // ALLE Klassen mit derselben höchsten Buy-Quote — falls die UI das Auflisten will.
  strongestKlassesAll: string[];
}

// Aggregiert über alle Vorstände: wie viele kaufen/tippen, wer hat den
// stärksten Konsens? Liefert NICHT nur die Zahl, sondern auch welche Asset-
// Klasse die höchste Buy-Quote hat. Bei Gleichstand wird die alphabetisch
// erste Klasse als strongestKlass gewählt, die komplette Liste in
// strongestKlassesAll.
export function personaCompass(verdicts: PersonaVerdictEntry[]): PersonaCompassResult {
  if (verdicts.length === 0) {
    return { totalPersonas: 0, buyCount: 0, watchCount: 0, waitCount: 0, strongestKlass: null, strongestBuyShare: 0, strongestKlassesAll: [] };
  }
  const buyCount = verdicts.filter((v) => v.isBuy).length;
  const watchCount = verdicts.filter((v) => v.verdict === 'BEOBACHTEN').length;
  const waitCount = verdicts.length - buyCount - watchCount;

  // Buy-Share pro Asset-Klasse berechnen, stärkste finden.
  const byKlass = new Map<string, { buys: number; total: number }>();
  for (const v of verdicts) {
    const entry = byKlass.get(v.klass) ?? { buys: 0, total: 0 };
    entry.total += 1;
    if (v.isBuy) entry.buys += 1;
    byKlass.set(v.klass, entry);
  }
  // Erst die Klasse(n) mit der höchsten Buy-Quote sammeln, dann alphabetisch sortieren.
  let strongestBuyShare = 0;
  const tied: string[] = [];
  for (const [klass, { buys, total }] of byKlass.entries()) {
    if (total === 0) continue;
    const share = buys / total;
    if (share > strongestBuyShare) {
      strongestBuyShare = share;
      tied.length = 0;
      tied.push(klass);
    } else if (share === strongestBuyShare && strongestBuyShare > 0) {
      tied.push(klass);
    }
  }
  const strongestKlassesAll = [...tied].sort((a, b) => a.localeCompare(b));
  const strongestKlass = strongestKlassesAll[0] ?? null;
  return {
    totalPersonas: verdicts.length,
    buyCount,
    watchCount,
    waitCount,
    strongestKlass,
    strongestBuyShare,
    strongestKlassesAll
  };
}

export interface WatchlistAlarm {
  klass: 'Aktien' | 'Rohstoffe' | 'Krypto';
  label: string;
  symbol: string;
  verdict: string;
  score: number | null;
  detail: string;
  rationale: string;
  href: string;
  signal: 'verbesserung' | 'verschlechterung' | 'grade-a';
}

export interface WatchedAsset {
  klass: 'Aktien' | 'Rohstoffe' | 'Krypto';
  symbol: string;
  label: string;
  // Vorheriges Grade aus localStorage (falls vorhanden).
  previousGrade?: 'A' | 'B' | 'C' | 'D' | null;
  // Aktuelles Grade aus dem heutigen Scan.
  currentGrade: 'A' | 'B' | 'C' | 'D';
  currentScore: number;
  href: string;
}

// Klassifiziert pro gewatchtem Asset, ob es heute besser oder schlechter als
// gestern ist. „Grade A" wird immer markiert, auch ohne Vorgeschichte.
export function watchlistAlarms(watched: WatchedAsset[]): WatchlistAlarm[] {
  const out: WatchlistAlarm[] = [];
  const gradeRank: Record<'A' | 'B' | 'C' | 'D', number> = { A: 4, B: 3, C: 2, D: 1 };

  for (const w of watched) {
    if (w.currentGrade === 'A') {
      out.push({
        klass: w.klass,
        symbol: w.symbol,
        label: w.label,
        verdict: 'KAUFEN',
        score: w.currentScore,
        detail: `Grade A heute (${w.currentScore}/100).`,
        rationale: 'Alle Sicherheits-Kriterien erfüllt — Watchlist-Eintrag erreicht heute den höchsten Status.',
        href: w.href,
        signal: 'grade-a'
      });
      continue;
    }
    if (w.previousGrade && w.currentGrade !== w.previousGrade) {
      const before = gradeRank[w.previousGrade] ?? 0;
      const now = gradeRank[w.currentGrade] ?? 0;
      if (now > before) {
        out.push({
          klass: w.klass,
          symbol: w.symbol,
          label: w.label,
          verdict: 'BEOBACHTEN',
          score: w.currentScore,
          detail: `Wechsel ${w.previousGrade} → ${w.currentGrade}.`,
          rationale: 'Verbesserung gegenüber dem zuletzt gespeicherten Stand.',
          href: w.href,
          signal: 'verbesserung'
        });
      } else {
        out.push({
          klass: w.klass,
          symbol: w.symbol,
          label: w.label,
          verdict: 'BEOBACHTEN',
          score: w.currentScore,
          detail: `Wechsel ${w.previousGrade} → ${w.currentGrade}.`,
          rationale: 'Verschlechterung gegenüber dem zuletzt gespeicherten Stand.',
          href: w.href,
          signal: 'verschlechterung'
        });
      }
    }
  }
  // Grade-A zuerst, dann Verbesserungen, dann Verschlechterungen.
  const order: Record<WatchlistAlarm['signal'], number> = { 'grade-a': 0, verbesserung: 1, verschlechterung: 2 };
  out.sort((a, b) => order[a.signal] - order[b.signal]);
  return out;
}

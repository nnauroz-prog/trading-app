// Analysten-Rat ("Der Rat") — mehrere spezialisierte Agenten, die zu
// EINER Trading-Entscheidung zusammenfinden. Das ist der JARVIS-Kern:
// nicht eine Blackbox-Zahl, sondern mehrere Stimmen mit klarer Rolle,
// die am Ende ein Chef-Agent zusammenfuehrt.
//
// Bewusst enthalten — weil der Nutzer "auch Emotionen" verlangt:
//   - Sentiment-/Emotions-Analyst: liest die MARKT-Emotion (Angst/Gier)
//     antizyklisch.
//   - Disziplin-Coach: adressiert die EIGENE Psychologie des Nutzers
//     (FOMO, Chasing, Rache-Trades, Positionsgroesse).
//
// Reine, deterministische Logik — keine Blackbox, keine erfundene KI.
// Voll testbar.

export type AgentStance = 'bullish' | 'constructive' | 'neutral' | 'caution' | 'bearish';

export interface AgentVoice {
  name: string;
  role: string;
  stance: AgentStance;
  say: string;
}

export interface CouncilInput {
  dataAvailable: boolean;
  hasOpportunity: boolean;
  primaryLabel: string | null;        // z.B. "ETH — Long-Setup"
  primaryAssetClass: 'Krypto' | 'Aktien' | 'Rohstoffe' | null;
  confidencePct: number | null;       // 0-100
  marketMood: 'risk-on' | 'risk-off' | 'neutral';
  fearGreedValue: number | null;      // 0-100
  crowdState: 'fear' | 'greed' | 'neutral';
  crowdCautious: boolean;
  recentChangePct: number | null;     // 24h-Bewegung des Primaer-Werts (Chasing-Erkennung)
}

export interface CouncilResult {
  voices: AgentVoice[];
  emotionRead: string;        // Markt-Emotion in einem Satz
  disciplineReminder: string; // Psychologie-Coaching in einem Satz
  chiefDirective: string;     // JARVIS-Einzeiler
  netStance: AgentStance;
}

function fgText(fg: number | null): string {
  return fg === null ? 'unbekannt' : String(fg);
}

function trendAnalyst(i: CouncilInput): AgentVoice {
  const base = { name: 'Trend-Analyst', role: 'Struktur & Umfeld' };
  if (!i.hasOpportunity) {
    return { ...base, stance: 'neutral', say: 'Kein belastbarer Trend mit sauberer Struktur — es gibt keinen Zwang, heute zu handeln.' };
  }
  if (i.marketMood === 'risk-on') {
    return { ...base, stance: 'bullish', say: `Trend und Gesamtmarkt ziehen gleich — Rueckenwind fuer ${i.primaryLabel}.` };
  }
  if (i.marketMood === 'risk-off') {
    return { ...base, stance: 'caution', say: `Setup bei ${i.primaryLabel} vorhanden, aber der Markt traegt nicht — gegen das Umfeld gewinnt selten jemand.` };
  }
  return { ...base, stance: 'constructive', say: `${i.primaryLabel} zeigt Struktur; das Umfeld ist neutral, also auf Bestaetigung achten.` };
}

function riskManager(i: CouncilInput): AgentVoice {
  const base = { name: 'Risk-Manager', role: 'Kapitalschutz & R/R' };
  if (i.marketMood === 'risk-off') {
    return { ...base, stance: 'caution', say: 'Kapitalschutz zuerst — im Risk-off lieber kleiner oder gar nicht. Verluste vermeiden schlaegt Gewinne jagen.' };
  }
  if (i.hasOpportunity && (i.confidencePct ?? 0) >= 70) {
    return { ...base, stance: 'constructive', say: 'Reward/Risk ist vertretbar — aber nur mit definiertem Stop, sonst gilt der Trade nicht.' };
  }
  if (i.hasOpportunity && (i.confidencePct ?? 100) < 55) {
    return { ...base, stance: 'caution', say: 'Duenne Konfidenz — wenn ueberhaupt, dann Mini-Position mit engem Stop.' };
  }
  return { ...base, stance: 'neutral', say: 'Kein Setup ueber der Schwelle — kein Risiko ist auch ein Ergebnis.' };
}

function sentimentAnalyst(i: CouncilInput): AgentVoice {
  const base = { name: 'Sentiment-Analyst', role: 'Markt-Emotion (antizyklisch)' };
  if (i.crowdCautious || (i.fearGreedValue ?? 0) >= 80) {
    return { ...base, stance: 'bearish', say: `Markt ist gierig (Angst/Gier-Index ${fgText(i.fearGreedValue)}) — wenn alle euphorisch kaufen, verkaufen Profis. Antizyklisch: Vorsicht.` };
  }
  if (i.crowdState === 'fear' || (i.fearGreedValue ?? 100) <= 25) {
    return { ...base, stance: 'bullish', say: `Angst im Markt (Index ${fgText(i.fearGreedValue)}) — historisch die besseren Einstiege, nicht die schlechteren.` };
  }
  if (i.crowdState === 'greed') {
    return { ...base, stance: 'caution', say: `Leichte Gier (Index ${fgText(i.fearGreedValue)}) — noch okay, aber nicht der Euphorie hinterherlaufen.` };
  }
  return { ...base, stance: 'neutral', say: `Stimmung neutral (Index ${fgText(i.fearGreedValue)}) — kein Emotions-Extrem, das die Richtung vorgibt.` };
}

function disciplineCoach(i: CouncilInput): AgentVoice {
  const base = { name: 'Disziplin-Coach', role: 'Deine Psychologie' };
  if (i.recentChangePct !== null && i.recentChangePct > 10) {
    return { ...base, stance: 'caution', say: `${i.primaryLabel ?? 'Der Wert'} ist heute schon ${i.recentChangePct.toFixed(0)} % gelaufen — FOMO ist der teuerste Berater. Einem Pump nicht hinterherrennen.` };
  }
  if (i.marketMood === 'risk-off' || i.crowdCautious) {
    return { ...base, stance: 'caution', say: 'Kein Rache-Trade, keine Position aus Langeweile. Wenn es unklar ist, ist Cash halten eine Entscheidung — keine Niederlage.' };
  }
  if (i.hasOpportunity) {
    return { ...base, stance: 'constructive', say: 'Plan vor dem Einstieg: Einstieg, Stop und Ziel festlegen. Positionsgroesse so klein, dass ein Fehlschlag nicht wehtut.' };
  }
  return { ...base, stance: 'neutral', say: 'Geduld schlaegt Aktionismus — ein verpasster Trade kostet nichts, ein schlechter kostet Geld.' };
}

const STANCE_WEIGHT: Record<AgentStance, number> = {
  bullish: 2, constructive: 1, neutral: 0, caution: -1, bearish: -2
};

export function conveneCouncil(i: CouncilInput): CouncilResult {
  if (!i.dataAvailable) {
    return {
      voices: [{
        name: 'Chef-Analyst', role: 'JARVIS', stance: 'neutral',
        say: 'Datenlage zu duenn — ich halte dich bewusst zurueck, bis ich belastbar bin. Kein Raten.'
      }],
      emotionRead: 'Keine Sentiment-Daten verfuegbar.',
      disciplineReminder: 'Ohne Daten keine Entscheidung — das ist Disziplin, nicht Zoegern.',
      chiefDirective: 'Heute keine Empfehlung: Datenlage unzureichend.',
      netStance: 'neutral'
    };
  }

  const voices = [trendAnalyst(i), riskManager(i), sentimentAnalyst(i), disciplineCoach(i)];
  const net = voices.reduce((s, v) => s + STANCE_WEIGHT[v.stance], 0);
  const netStance: AgentStance =
    net >= 3 ? 'bullish' : net >= 1 ? 'constructive' : net <= -3 ? 'bearish' : net <= -1 ? 'caution' : 'neutral';

  const emotionRead =
    i.crowdCautious || (i.fearGreedValue ?? 0) >= 80
      ? `Markt-Emotion: Gier (Index ${fgText(i.fearGreedValue)}) — Euphorie ist ein Warnsignal, kein Kaufsignal.`
      : (i.crowdState === 'fear' || (i.fearGreedValue ?? 100) <= 25)
        ? `Markt-Emotion: Angst (Index ${fgText(i.fearGreedValue)}) — oft die besseren Chancen, wenn das Setup stimmt.`
        : `Markt-Emotion: ausgeglichen (Index ${fgText(i.fearGreedValue)}).`;

  const disciplineReminder = disciplineCoach(i).say;

  let chiefDirective: string;
  if (netStance === 'caution' || netStance === 'bearish') {
    chiefDirective = i.hasOpportunity && i.primaryLabel
      ? `Zurueckhaltung: ${i.primaryLabel} nur klein und mit Stop — der Rat ueberwiegt vorsichtig.`
      : 'Zurueckhaltung: heute kein Einstieg, Kapital schonen.';
  } else if ((netStance === 'bullish' || netStance === 'constructive') && i.hasOpportunity && i.primaryLabel) {
    chiefDirective = `${i.primaryLabel} ist das sauberste Setup — mit Plan, Stop und kleiner Position angehen.`;
  } else {
    chiefDirective = 'Kein klares Signal — abwarten, Cash ist auch eine Position.';
  }

  return { voices, emotionRead, disciplineReminder, chiefDirective, netStance };
}

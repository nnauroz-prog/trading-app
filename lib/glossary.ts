export interface GlossaryEntry {
  label: string;
  text: string;
}

// Plain-German explanations of the jargon used across the app. Keyed by a
// stable id so an <InfoTip term="..."/> can show the explanation on tap.
export const GLOSSARY: Record<string, GlossaryEntry> = {
  stop_loss: {
    label: 'Stop-Loss',
    text: 'Ein im Voraus festgelegter Verkaufspreis. Fällt der Kurs dorthin, verkaufst du (am besten automatisch per Order beim Broker) und begrenzt deinen Verlust. Schützt dich vor großen Einbrüchen.'
  },
  take_profit: {
    label: 'Ziel',
    text: 'Der Kurs, bei dem du Gewinn mitnimmst und (einen Teil) verkaufst. Vorher festlegen, damit Gier dich nicht zu lange halten lässt.'
  },
  confluence: {
    label: 'Bestätigungen',
    text: 'Wie viele von 12 Prüfsignalen gerade für einen Kauf sprechen (Trend, Momentum, Volumen …). Je mehr gleichzeitig zutreffen, desto verlässlicher das Setup.'
  },
  rr: {
    label: 'R:R',
    text: 'Chance-Risiko-Verhältnis: wie viel du gewinnen kannst im Verhältnis zu dem, was du riskierst. 2:1 heißt – möglicher Gewinn ist doppelt so groß wie der mögliche Verlust.'
  },
  atr: {
    label: 'ATR',
    text: 'Average True Range: ein Maß dafür, wie stark ein Kurs typischerweise schwankt. Daraus berechnet die App sinnvolle Stop- und Ziel-Abstände.'
  },
  market_regime: {
    label: 'Markt-Regime',
    text: 'Die übergeordnete Marktphase: Bull (steigend), Bear (fallend) oder Seitwärts. Sie bestimmt, wie aggressiv man handeln sollte.'
  },
  risk_off: {
    label: 'Risk-off',
    text: 'Risk-off heißt: die Mehrheit der Coins fällt, Anleger sind vorsichtig. In solchen Phasen laufen auch gute Setups oft schief — besser abwarten.'
  },
  drawdown: {
    label: 'Drawdown',
    text: 'Der größte Rückgang vom Höchststand deines Kapitals bis zum Tiefpunkt. Zeigt, wie schmerzhaft die schlimmste Phase war.'
  },
  sharpe: {
    label: 'Sharpe-Ratio',
    text: 'Rendite im Verhältnis zum Risiko (Schwankung). Höher ist besser — du wirst für das eingegangene Risiko fairer belohnt.'
  },
  expectancy: {
    label: 'Erwartungswert',
    text: 'Was du im Schnitt pro Trade gewinnst oder verlierst, über viele Trades. Positiv = das System trägt sich langfristig.'
  },
  funding: {
    label: 'Funding-Rate',
    text: 'Gebühr zwischen Long- und Short-Tradern an Terminbörsen. Hoch positiv = viele wetten auf steigende Kurse (überfüllte Long-Seite) — oft ein Warnsignal.'
  },
  fear_greed: {
    label: 'Angst & Gier',
    text: 'Angst-und-Gier-Index (0–100): misst die Marktstimmung. Niedrig = Angst (oft gute Einstiege), hoch = Gier (Vorsicht vor Übertreibung).'
  }
};

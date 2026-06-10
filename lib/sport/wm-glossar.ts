// WM-Glossar: jeder Fachbegriff in genau einem Satz erklaert.
// Wird vom GlossarCard angezeigt und vom Test gegen verbotene
// Woerter gepruft.

export interface GlossarEntry {
  term: string;
  category: 'pick' | 'lernen' | 'daten' | 'geld' | 'sicherheit';
  plain: string;
}

export const WM_GLOSSAR: GlossarEntry[] = [
  // Pick-Begriffe
  { term: 'Modell-Favorit', category: 'pick',
    plain: 'Ein Tipp, der alle 10 Profi-Pruefungen bestanden hat.' },
  { term: 'Hoechste Konfluenz', category: 'pick',
    plain: 'Die strengste Tipp-Stufe: ELO-Vorteil ueber 120 Punkte und alle Pruefungen perfekt.' },
  { term: 'ELO-Punkte', category: 'pick',
    plain: 'Eine Zahl, die die Spielstaerke jedes Teams beschreibt — je hoeher, desto staerker.' },
  { term: 'xG (erwartete Tore)', category: 'pick',
    plain: 'Wie viele Tore eine Mannschaft normalerweise schiessen wuerde — basierend auf ihrem Spielstil.' },
  { term: 'Poisson-Modell', category: 'pick',
    plain: 'Eine Mathe-Formel, die aus den erwarteten Toren die Wahrscheinlichkeit fuer jedes Ergebnis ausrechnet.' },
  { term: 'Profi-Tipper-Agent', category: 'pick',
    plain: 'Ein Pruefer, der 10 zusaetzliche Checks ueber dem Standard-Modell macht (Klarheit, Zeitrahmen, Konflikte zwischen Modellen ...).' },

  // Lern-Begriffe
  { term: 'Faktor', category: 'lernen',
    plain: 'Ein Umfeld-Einfluss auf das Spiel: Hitze, Hoehe, Reise, Publikum und so weiter.' },
  { term: 'Faktor-Gewichtung', category: 'lernen',
    plain: 'Wie stark ein Einfluss aktuell zaehlt — wird automatisch hoeher, wenn er Treffer bringt.' },
  { term: 'BESTAETIGT', category: 'lernen',
    plain: 'Der Einfluss hilft historisch — wird im naechsten Tipp staerker beruecksichtigt.' },
  { term: 'KONTRA', category: 'lernen',
    plain: 'Der Einfluss verschlechtert die Treffer — wird gedaempft oder ignoriert.' },
  { term: 'UNKLAR', category: 'lernen',
    plain: 'Noch zu wenig Daten, um eine Aussage zu treffen — Standard-Gewicht bleibt.' },
  { term: 'Kalibrierung', category: 'lernen',
    plain: 'Pruefung, ob unsere Prozent-Angaben passen: wenn wir 75 sagen, treffen wir auch ~75 % der Zeit?' },
  { term: 'UEBERSCHAETZT', category: 'lernen',
    plain: 'Unsere Prozent waren zu hoch — wir zeigen den Tipp mit einer Warnung an.' },
  { term: 'Dynamisches ELO', category: 'lernen',
    plain: 'Nach jedem Spiel werden die ELO-Werte aktualisiert: Gewinner steigen, Verlierer fallen.' },
  { term: 'Brier Score', category: 'lernen',
    plain: 'Eine Note fuer die Genauigkeit der Prozent-Angaben — kleiner ist besser, 0 waere perfekt.' },

  // Daten-Begriffe
  { term: 'Schedule-Confidence', category: 'daten',
    plain: 'Wie sicher wir bei einer Paarung sind — official (FIFA bestaetigt), auslosung (Auslosung sicher) oder placeholder (noch nicht verifiziert).' },
  { term: 'Schedule-Reconciler', category: 'daten',
    plain: 'Vergleicht unseren Spielplan mit dem offiziellen — bestaetigt oder warnt automatisch.' },
  { term: 'MATCH', category: 'daten',
    plain: 'Offizielle Quelle bestaetigt unsere Paarung — Tipp wird freigegeben.' },
  { term: 'MISMATCH', category: 'daten',
    plain: 'Offizielle Quelle widerspricht unserer Paarung — Tipp wird gesperrt, bis das geklaert ist.' },
  { term: 'Daten-Integritaets-Agent', category: 'daten',
    plain: 'Ein Waechter, der alle 30 Sekunden prueft, ob Teams, Stadien und Anstosszeiten in unseren Datenbanken vollstaendig sind.' },
  { term: 'placeholder', category: 'daten',
    plain: 'Paarung steht im Spielplan, aber wir konnten sie nicht offiziell bestaetigen — kein Tipp darauf.' },

  // Geld-Begriffe
  { term: 'Bankroll', category: 'geld',
    plain: 'Dein Tipp-Budget — der gesamte Geldtopf, den Du fuer Tipps zur Verfuegung hast.' },
  { term: 'Half-Kelly', category: 'geld',
    plain: 'Eine konservative Einsatz-Formel: halbiert die rechnerisch optimale Hoehe, damit Verluste nicht zu hart treffen.' },
  { term: 'Tier-Cap', category: 'geld',
    plain: 'Obergrenze pro Tipp: nie mehr als 4 % Deiner Bankroll fuer den staerksten Tipp, 2 % fuer Standard.' },
  { term: 'Decimal Odds', category: 'geld',
    plain: 'Die Quote im europaeischen Format: 2.00 bedeutet, Du bekommst Deinen Einsatz verdoppelt zurueck bei Treffer.' },
  { term: 'Expected Value (EV)', category: 'geld',
    plain: 'Der durchschnittlich erwartete Gewinn pro Euro Einsatz — positiv = lohnt sich auf lange Sicht, negativ = nicht.' },
  { term: 'ROI', category: 'geld',
    plain: 'Rendite: wie viel Prozent Gewinn auf Deine eingesetzten Euro — der wichtigste P&L-Wert.' },
  { term: 'Combo-Pick', category: 'geld',
    plain: 'Mehrere Tipps auf einem Schein — hoehere Quote, aber alle muessen treffen.' },
  { term: 'Joint-Probability', category: 'geld',
    plain: 'Die Trefferwahrscheinlichkeit einer Combo: alle Einzelwahrscheinlichkeiten multipliziert.' },

  // Sicherheits-Begriffe
  { term: 'Veto', category: 'sicherheit',
    plain: 'Hartes Stopp-Signal: der Tipp wird nicht angezeigt, egal wie gut er sonst aussieht.' },
  { term: 'Hard-Block', category: 'sicherheit',
    plain: 'Eine Pflicht-Pruefung schlaegt durch — kein Pick moeglich, auch wenn alle anderen Pruefungen passen.' },
  { term: 'TBD', category: 'sicherheit',
    plain: 'Mannschaft steht noch nicht fest (z. B. "Sieger Gruppe A") — automatisch kein Tipp.' },
  { term: 'Residual-Risiko', category: 'sicherheit',
    plain: 'Das Rest-Risiko, das nie verschwindet: auch der beste Tipp kann verlieren.' }
];

export function glossarByCategory(): Record<GlossarEntry['category'], GlossarEntry[]> {
  const groups: Record<GlossarEntry['category'], GlossarEntry[]> = {
    pick: [], lernen: [], daten: [], geld: [], sicherheit: []
  };
  for (const e of WM_GLOSSAR) groups[e.category].push(e);
  return groups;
}

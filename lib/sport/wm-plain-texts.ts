// Klartext-Erklaerungen fuer jede WM-Karte — eine Saetze in einfacher
// Sprache, ohne Fachbegriffe. Zentral gehalten, damit ein Test prueft,
// dass keine verbotenen Woerter drin sind.

export const PLAIN_HINTS: Record<string, string> = {
  'day-plan': 'Alle heutigen WM-Spiele auf einen Blick — und ob wir tippen oder nicht, mit Grund.',
  'winner-picks': 'Das sind die Spiele, bei denen alle unsere Pruefungen gruen sind. Mehr Punkte = mehr Pruefungen bestanden. Kein Ergebnis steht je fest.',
  'backtest': 'Wir haben das System an 78 echten Spielen von frueher getestet. Ungefaehr 8 von 10 freigegebenen Tipps waeren richtig gewesen — mit Ausreissern bei Ueberraschungen.',
  'reconciler': 'Wir vergleichen unseren Spielplan automatisch mit dem offiziellen. Nur bestaetigte Spiele bekommen Tipps.',
  'integrity': 'Ein Waechter prueft rund um die Uhr, ob unsere Daten vollstaendig sind. Fehlt etwas, wird das Spiel nicht getippt.',
  'bankroll': 'Rechnet aus, wie viel Geld pro Tipp vernuenftig ist — nie mehr als 4 % Deines Topfs, egal wie gut der Tipp aussieht.',
  'ledger': 'Dein Kontoauszug: jeder uebernommene Tipp mit Gewinn oder Verlust, ehrlich aufsummiert.',
  'combo': 'Mehrere Tipps auf einem Schein: die Quote wird hoeher, aber ALLE Tipps muessen stimmen.',
  'learning': 'Das System merkt sich, welche Einfluesse (Hitze, Reise, Publikum ...) wirklich Treffer bringen — und gewichtet sie automatisch um.',
  'elo-drift': 'Nach jedem Spiel passt das System seine Meinung ueber die Teams an: Gewinner steigen, Verlierer fallen.',
  'calibration': 'Wenn wir 75 von 100 sagen, pruefen wir hier, ob wir auch wirklich so oft treffen.',
  'result-input': 'Endstand kurz eintragen, falls er nicht von alleine reinkommt — das System lernt sofort daraus.'
};

// Block-Gruende in einfacher Sprache (fuer die Einfach-Zusammenfassung).
export const PLAIN_BLOCK_REASONS: Record<string, string> = {
  'blocked-tbd': 'Teams stehen noch nicht fest',
  'blocked-placeholder': 'Paarung noch nicht offiziell bestaetigt',
  'blocked-mismatch': 'Spielplan-Angaben widersprechen sich',
  'kein-pick-filter': 'Pruefungen nicht klar genug'
};

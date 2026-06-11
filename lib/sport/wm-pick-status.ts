// Status pro WM-Pick: was wurde schon eingetragen, was fehlt noch.
// Reine Funktion. Input wird vom UI aus localStorage gelesen.

export interface WmPickStatusInput {
  pickId: string;
  // true = User hat einen Stake-Eintrag mit dieser pickId im Ledger
  hasStake: boolean;
  // mind. eine Quote im Quoten-Vergleich-Slot eingetragen
  hasOddsEntered: boolean;
  // Notiz vorhanden (nicht leer)
  hasNote: boolean;
}

export interface WmPickStatusItem {
  id: 'quote' | 'stake' | 'notiz';
  label: string;
  done: boolean;
  hint: string;
}

export interface WmPickStatusResult {
  items: WmPickStatusItem[];
  doneCount: number;
  totalCount: number;
  // true wenn die beiden Pflicht-Schritte (Quote + Stake) erledigt sind
  pflichtErledigt: boolean;
  ampel: 'gruen' | 'gelb' | 'rot';
}

export function computeWmPickStatus(input: WmPickStatusInput): WmPickStatusResult {
  const items: WmPickStatusItem[] = [
    {
      id: 'quote',
      label: 'Quote',
      done: input.hasOddsEntered,
      hint: input.hasOddsEntered ? 'Quote eingetragen.' : 'Quote bei mind. einem Anbieter eintragen.'
    },
    {
      id: 'stake',
      label: 'Stake',
      done: input.hasStake,
      hint: input.hasStake ? 'Stake im Ledger.' : 'Stake uebernehmen (in der Bankroll-Karte).'
    },
    {
      id: 'notiz',
      label: 'Notiz',
      done: input.hasNote,
      hint: input.hasNote ? 'Notiz hinterlegt.' : 'Optional: kurze Notiz fuer spaeter.'
    }
  ];
  const doneCount = items.filter((i) => i.done).length;
  const pflichtErledigt = input.hasOddsEntered && input.hasStake;
  let ampel: 'gruen' | 'gelb' | 'rot';
  if (pflichtErledigt) ampel = 'gruen';
  else if (input.hasOddsEntered || input.hasStake) ampel = 'gelb';
  else ampel = 'rot';
  return { items, doneCount, totalCount: items.length, pflichtErledigt, ampel };
}

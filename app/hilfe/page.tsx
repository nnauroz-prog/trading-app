import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
export const metadata: Metadata = { title: 'Einfach erklärt', description: 'Kurze Antworten zu deinem Geldplan, deinen Angaben und den Preisen auf der Seite.' };
const questions = [
  ['Womit fange ich an?', 'Öffne „Mein Geld“ und gib den Betrag ein, den du verteilen möchtest. Wähle, wann du das Geld brauchst und wie viel Risiko für dich passt. Danach siehst du einen Vorschlag in Euro.'],
  ['Welchen Betrag soll ich eingeben?', 'Geld, das dir jetzt zur Verfügung steht. Rechnungen, teure Schulden und Geld für Notfälle sollten vorher geklärt sein. Solange du das nicht bestätigt hast, schlägt die Seite keine Anlageaufteilung vor.'],
  ['Warum soll ein Teil auf dem Konto bleiben?', 'Geld, das du bald brauchst, soll verfügbar bleiben. Bei Anlagen können die Preise zwischenzeitlich fallen. Vergleiche die Zinsen und Bedingungen eines passenden Kontos.'],
  ['Was bedeutet „Für später anlegen“?', 'Diesen Teil könntest du für längere Zeit anlegen. Ein Beispiel ist ein Fonds, der Geld in viele Unternehmen verteilt. Auch dabei sind Verluste möglich. Der Plan nennt noch kein bestimmtes Produkt.'],
  ['Muss ich den riskanten Anteil einsetzen?', 'Nein. Er ist freiwillig. Du kannst auch dieses Geld auf dem Konto lassen. Für riskante Anlagen solltest du nur einen Betrag verwenden, dessen vollständigen Verlust du tragen könntest.'],
  ['Kauft die Seite etwas für mich?', 'Nein. Die Seite zeigt dir einen Vorschlag. Du prüfst selbst die Kosten und Risiken und entscheidest, ob und wo du etwas kaufst.'],
  ['Wo werden meine Angaben gespeichert?', 'In diesem Browser. In den Einstellungen kannst du deine Daten als Datei sichern und auf einem anderen Gerät wiederherstellen. Eine automatische Übertragung zwischen Geräten gibt es derzeit nicht.'],
  ['Warum steht bei Krypto manchmal „Abwarten“?', 'Dann fehlen aktuelle Kurse oder die Kaufprüfung findet keinen passenden Coin. Die Seite zeigt in diesem Fall keinen Kaufvorschlag.'],
  ['Wofür ist der Sportbereich?', 'Dort siehst du Spiele, Startzeiten und Ergebnisse. Dieser Bereich ist unabhängig von deinem Geldplan.']
];
export default function HelpPage() {
  return <main className="mx-auto max-w-3xl space-y-6 p-4 md:p-6"><header className="terminal-custom-header"><h1 className="font-display text-4xl font-semibold text-white">Einfach erklärt</h1><p className="mt-4 text-base text-slate-400">Die wichtigsten Antworten – kurz und ohne Fachsprache.</p></header><Link href="/" className="terminal-button terminal-button-primary">Zu meinem Geldplan<ArrowRight size={16} /></Link><div className="space-y-3">{questions.map(([question, answer]) => <details key={question} className="terminal-panel"><summary className="cursor-pointer p-5 text-base font-medium text-slate-200">{question}</summary><p className="border-t border-slate-800 p-5 text-sm leading-relaxed text-slate-300">{answer}</p></details>)}</div></main>;
}

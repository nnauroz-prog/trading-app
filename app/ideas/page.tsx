import Link from 'next/link';
import { IdeaInbox } from '@/components/idea-inbox';

export const dynamic = 'force-dynamic';

export default function IdeasPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 md:space-y-6 md:p-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-emerald-300">
        ← zurück zum Trading Desk
      </Link>

      <header className="space-y-1">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          Idea Validation
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Trading-Ideen-Inbox</h1>
        <p className="max-w-2xl text-sm text-slate-400">
          Fremde Ideen (aus Chats, Newslettern, Foren, Screenshots) hier einfügen.
          Die App parst Basiswert, Instrumente, Risikostufen und Broker {`—`} und prüft die Idee unabhängig gegen eigene
          Logik (technische Lage, Instrument-Risiko, Broker-Verfügbarkeit, Profil-Fit). Ergebnis: klare Empfehlung
          mit Score 0-100 und Begründung. <span className="text-slate-500">Keine Finanzberatung.</span>
        </p>
      </header>

      <IdeaInbox />

      <footer className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 text-[11px] leading-relaxed text-slate-500">
        <strong className="text-slate-300">So liest die App eine Idee:</strong>
        <ol className="mt-2 ml-4 list-decimal space-y-1">
          <li>Parser extrahiert Titel, Basiswert, aktuellen Kurs, 52W-Spanne, Broker-Sektionen, WKNs/ISINs, Strikes, Laufzeiten und Risikostufen.</li>
          <li>Bei Optionsscheinen wird Moneyness (im/am/aus dem Geld) und Strike-Abstand zum aktuellen Kurs berechnet.</li>
          <li>Restlaufzeit wird in Monate umgerechnet; kurze Laufzeit (&lt;6 Mo) verschärft die Risiko-Klasse.</li>
          <li>Score in 8 Bausteinen: Thesis · Technical · Risk/Reward · Instrument · Market · Broker · Source · User-Fit.</li>
          <li>{`Empfehlung wird zusätzlich gegen das Profil gefiltert: Anfänger bekommen bei Hebelprodukten eine Warnung, nie ein „Buy Strong".`}</li>
        </ol>
        <p className="mt-3"><strong className="text-amber-300">Wichtig:</strong> Broker-Verfügbarkeit kommt aus einer manuell gepflegten Allowlist (keine Live-API). Vor jedem Kauf im Broker selbst nochmal prüfen.</p>
      </footer>
    </main>
  );
}

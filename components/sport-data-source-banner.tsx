import { Database, ShieldAlert } from 'lucide-react';
import { isUsingTestKey } from '@/lib/sport/sportsdb-config';

export function SportDataSourceBanner() {
  if (!isUsingTestKey()) return null;

  return (
    <section role="alert" className="relative overflow-hidden border border-amber-400/20 bg-amber-400/[0.035] p-4 sm:p-5">
      <div className="absolute bottom-0 left-0 top-0 w-0.5 bg-amber-400/70" />
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden />
        <div className="min-w-0 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-200">Prognosen / eingeschränkte Datenbasis</p>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-300">Die Prognosen nutzen den öffentlichen TheSportsDB-Testzugang. Er kann leere oder veraltete Spielpläne liefern. Die Live-Ergebnisse werden davon unabhängig über ESPN abgerufen.</p>
          <details className="text-xs text-slate-400">
            <summary className="cursor-pointer font-medium text-amber-200/80 hover:text-amber-100">Datenzugang verbessern</summary>
            <p className="mt-2 flex items-start gap-2 leading-relaxed"><Database className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /><span>Ein eigener TheSportsDB-Key kann die Spielplan- und Historienabdeckung verbessern. Er wird serverseitig als <code className="border border-amber-400/15 bg-black/15 px-1.5 py-0.5 font-mono text-amber-100">THESPORTSDB_KEY</code> hinterlegt. Ein Schlüssel allein bestätigt weder die Erreichbarkeit noch die Aktualität des Anbieters.</span></p>
          </details>
        </div>
      </div>
    </section>
  );
}

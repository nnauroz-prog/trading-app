// Daten-Integritaets-Karte: zeigt was der Audit-Agent gefunden hat.
//
// BLOCKIERT = rote Karte, Picks sind nicht voll-vertrauenswuerdig fuer
// die betroffenen Teams.
// WARNUNG  = gelb, Picks sind moeglich aber mit reduzierter Datenbasis.
// HINWEIS  = grau, fuer interne Pflege.
//
// Wenn keine Issues vorhanden: zeigt grueneres "alle Quellen sauber".
// Wording ohne verbotene Begriffe.

import type { IntegrityIssue } from '@/lib/sport/wm-data-integrity-agent';
import { summarizeIntegrity, totalVenues } from '@/lib/sport/wm-data-integrity-agent';

interface Props {
  issues: IntegrityIssue[];
}

const SEVERITY_CLASS: Record<IntegrityIssue['severity'], string> = {
  BLOCKIERT: 'border-rose-500/60 bg-rose-950/30 text-rose-100',
  WARNUNG: 'border-amber-500/40 bg-amber-950/20 text-amber-100',
  HINWEIS: 'border-slate-700 bg-slate-900/40 text-slate-300'
};

const KIND_LABEL: Record<IntegrityIssue['kind'], string> = {
  MISSING_TEAM_STRENGTH: 'ELO-Eintrag fehlt',
  MISSING_TEAM_ORIGIN: 'Heimat-Daten fehlen',
  MISSING_VENUE: 'Stadion nicht aufloesbar',
  IMPLAUSIBLE_ELO: 'ELO ausserhalb plausiblem Bereich',
  OVERLAPPING_ALIASES: 'Alias-Ueberlappung',
  PLACEHOLDER_TEAM: 'TBD-Platzhalter'
};

export function WmDataIntegrityCard({ issues }: Props) {
  const sum = summarizeIntegrity(issues);
  const venuesTotal = totalVenues();

  if (sum.blocked === 0 && sum.warnings === 0) {
    return (
      <section className="rounded-2xl border border-emerald-400/40 bg-emerald-950/15 p-3" aria-label="WM Datenintegritaet">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">Daten-Integritaet</h3>
          <span className="text-[10px] text-emerald-200/70">{venuesTotal} Stadien · sauber</span>
        </div>
        <p className="mt-1 text-[11px] text-emerald-100/90">
          Alle Fixture-Teams haben ELO + Heimat-Daten. Alle Spielorte aufloesbar.
        </p>
      </section>
    );
  }

  return (
    <section className={`space-y-2 rounded-2xl border-2 p-3 ${sum.blocked > 0 ? 'border-rose-500/60 bg-rose-950/20' : 'border-amber-500/40 bg-amber-950/15'}`} aria-label="WM Datenintegritaet">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-200">Daten-Integritaets-Agent</h3>
        <span className="text-[10px] text-slate-300">
          {sum.blocked > 0 && <span className="text-rose-300">{sum.blocked} BLOCKIERT</span>}
          {sum.blocked > 0 && sum.warnings > 0 && <span className="opacity-50"> · </span>}
          {sum.warnings > 0 && <span className="text-amber-300">{sum.warnings} WARNUNG</span>}
          {sum.hints > 0 && <span className="text-slate-400"> · {sum.hints} Hinweis</span>}
        </span>
      </div>

      <p className="text-[11px] leading-snug text-slate-200">
        Der Agent hat in der Profi-Datenbasis konkrete Luecken gefunden. Picks zu betroffenen Teams haben reduzierte Konfidenz oder werden blockiert.
      </p>

      <ul className="space-y-1">
        {issues.map((i, idx) => (
          <li key={idx} className={`rounded border px-2 py-1.5 text-[10.5px] leading-snug ${SEVERITY_CLASS[i.severity]}`}>
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-mono text-[9.5px] uppercase tracking-wider opacity-80">{i.severity}</span>
              <span className="font-semibold">{i.subject}</span>
              <span className="ml-auto text-[9.5px] opacity-70">{KIND_LABEL[i.kind]}</span>
            </div>
            <p className="mt-0.5 opacity-90">{i.detail}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

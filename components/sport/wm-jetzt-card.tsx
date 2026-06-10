// "Was passiert jetzt?" — die simpelste Karte fuer Leute, die nicht
// das ganze System verstehen wollen. Genau ein Satz: WM laeuft / startet
// morgen / ist vorbei + heutige Tipp-Zahl in einfacher Sprache.

import type { WmDayPlan } from '@/lib/sport/wm-day-plan';

interface Props {
  todayIso: string;
  plan: WmDayPlan;
  wmStartIso?: string;  // Default 2026-06-11
  wmEndIso?: string;    // Default 2026-07-19
}

function fmtDe(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit' });
}

function daysBetween(a: string, b: string): number {
  const da = new Date(`${a}T00:00:00`).getTime();
  const db = new Date(`${b}T00:00:00`).getTime();
  return Math.round((db - da) / (24 * 60 * 60 * 1000));
}

export function WmJetztCard({ todayIso, plan, wmStartIso = '2026-06-11', wmEndIso = '2026-07-19' }: Props) {
  const phase: 'vor' | 'live' | 'nach' = todayIso < wmStartIso ? 'vor' : todayIso > wmEndIso ? 'nach' : 'live';
  const tagBis = daysBetween(todayIso, wmStartIso);

  let headline = '';
  let sub = '';

  if (phase === 'vor') {
    headline = tagBis === 1
      ? 'Morgen geht die WM los!'
      : `Noch ${tagBis} Tage bis zur WM.`;
    sub = 'Ab dem 11. Juni 2026 zeigen wir hier jeden Tag die freigegebenen Tipps. Du musst nichts tun — die App holt sich alles automatisch.';
  } else if (phase === 'nach') {
    headline = 'Die WM ist vorbei.';
    sub = 'Im Ledger findest Du Deine komplette Bilanz vom Turnier.';
  } else {
    const heute = plan.rows.length;
    const picks = plan.pickCount;
    if (heute === 0) {
      headline = 'Heute kein WM-Spiel.';
      sub = `Naechste Partien stehen weiter unten im Spielplan. Die WM laeuft noch bis ${fmtDe(wmEndIso)}.`;
    } else if (picks === 0) {
      headline = `Heute ${heute} WM-Spiel${heute === 1 ? '' : 'e'} — aber kein freigegebener Tipp.`;
      sub = 'Das System hat alle gepruet und findet keinen klar genug. Lieber heute Pause als ein erzwungener Tipp.';
    } else {
      headline = `Heute ${picks} freigegebene${picks === 1 ? 'r' : ''} Tipp${picks === 1 ? '' : 's'} bei ${heute} WM-Spiel${heute === 1 ? '' : 'en'}.`;
      sub = 'Details siehst Du weiter unten. Anstosszeit, Sieger-Pick und Begruendung pro Spiel.';
    }
  }

  return (
    <section className="space-y-1.5 rounded-2xl border-2 border-yellow-400/50 bg-yellow-950/15 p-3 sm:p-4" aria-label="Was passiert jetzt?">
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-yellow-300">Was passiert jetzt?</div>
      <h2 className="text-base font-bold leading-tight text-yellow-100 sm:text-lg">{headline}</h2>
      <p className="text-[11.5px] leading-snug text-yellow-100/85">{sub}</p>
      <p className="text-[10px] text-yellow-200/60">Stand {fmtDe(todayIso)}</p>
    </section>
  );
}

// Eroeffnungs-Banner. Erscheint AM Eroeffnungstag der WM ganz oben mit
// Countdown zum ersten Anstoss + klarem Hinweis was als naechstes zu
// tun ist. Verschwindet sobald der Eroeffnungs-Tag vorbei ist — kein
// User-Klick noetig.

import { detectWmPhase } from '@/lib/sport/wm-opening-day';
import { WmKickoffBadge } from '@/components/sport/wm-kickoff-badge';

interface Props {
  todayIso: string;
}

export function WmOpeningBanner({ todayIso }: Props) {
  const info = detectWmPhase(todayIso);
  if (info.phase !== 'eroeffnungs-tag') return null;
  const fix = info.openingFixture;
  if (!fix) return null;

  return (
    <section
      className="space-y-2 rounded-2xl border-2 border-emerald-400/60 bg-gradient-to-r from-emerald-950/40 to-sky-950/30 p-3 sm:p-4"
      aria-label="WM-Eroeffnungstag"
    >
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="rounded border border-emerald-300/60 bg-emerald-500/20 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.2em] text-emerald-100">
          Heute startet die WM
        </span>
        <WmKickoffBadge dateIso={fix.date} time={fix.time} />
      </div>
      <h2 className="text-[15px] font-bold leading-tight text-emerald-50">
        Eroeffnungsspiel: {fix.homeTeam} gegen {fix.awayTeam}
      </h2>
      <p className="text-[11.5px] leading-snug text-emerald-100/90">
        {fix.venue}{fix.time ? ` · ${fix.time} Ortszeit` : ''} · Phase {fix.phase}
      </p>
      <ol className="space-y-1 text-[11px] text-emerald-100/90">
        <li>1. Schau in die <span className="font-semibold">Tagesplan</span>-Karte: welche Spiele heute laufen.</li>
        <li>2. Wenn freigegebene Tipps drinstehen, pruefe die <span className="font-semibold">Quote bei Deinem Anbieter</span> und sieh in der Quoten-Vergleich-Karte nach, ob ein anderer Anbieter besser ist.</li>
        <li>3. Stake uebernehmen, Notiz dazu schreiben — Endergebnis pflegst Du nach Spiel-Ende ein, das System lernt mit.</li>
      </ol>
      <p className="text-[9.5px] leading-snug text-emerald-200/70">
        Heute keine Garantie auf einen Tipp — die Konfluenz entscheidet. An vielen Tagen wird absichtlich nichts freigegeben.
      </p>
    </section>
  );
}

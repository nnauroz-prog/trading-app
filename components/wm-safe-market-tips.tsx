// „Sichere WM-Tipps" — zeigt die Markt-Empfehlungen, die ALLE die
// Mindest-Schwelle erfüllen (Default ≥70 % Wahrscheinlichkeit, Datenbasis ≥70).
// Anders als WmTopTips, das nur 1X2-Sieger zeigt, scannt das hier sämtliche
// Märkte (Über 1,5 / Doppelchance / BTTS / Clean Sheet) und liefert dadurch
// MEHR und SICHERERE Signale pro Tag.

import { rankSafeWmTips, type SafeWmTip } from '@/lib/sport/wm-safe-tips';

interface Props {
  todayIso: string;
  openingIso?: string;
  maxDays?: number;
  minProbability?: number;
  minDataConfidence?: number;
  limit?: number;
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime()) / (24 * 60 * 60 * 1000));
}

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'Europe/Berlin' });
}

const TIER_STYLE: Record<SafeWmTip['tier'], { label: string; chip: string; tone: string }> = {
  'maximal': {
    label: 'MAXIMAL SICHER',
    chip: 'border-emerald-300/70 bg-emerald-400/20 text-emerald-100',
    tone: 'border-emerald-400/60 bg-emerald-500/10'
  },
  'sehr-sicher': {
    label: 'SEHR SICHER',
    chip: 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200',
    tone: 'border-emerald-400/40 bg-emerald-500/5'
  },
  'sicher': {
    label: 'SICHER',
    chip: 'border-sky-400/40 bg-sky-500/10 text-sky-100',
    tone: 'border-sky-400/30 bg-sky-500/5'
  }
};

export function WmSafeMarketTips({
  todayIso,
  openingIso = '2026-06-11',
  maxDays = 14,
  minProbability = 0.70,
  minDataConfidence = 70,
  limit = 15
}: Props) {
  const days = daysBetween(todayIso, openingIso);
  if (days > 30 || days < -50) return null;

  const tips = rankSafeWmTips({ todayIso, maxDays, minProbability, minDataConfidence, limit });

  if (tips.length === 0) {
    return (
      <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">🛡️ Sichere WM-Tipps (nächste {maxDays} Tage)</h2>
        <p className="text-[11px] leading-relaxed text-slate-500">
          Kein anstehendes Spiel erreicht aktuell ≥{Math.round(minProbability * 100)} % Profi-Engine-Wahrscheinlichkeit.
          Lieber abwarten — kein Tipp ist auch ein Tipp.
        </p>
      </section>
    );
  }

  const maxTier = tips.filter((t) => t.tier === 'maximal');
  const sehrSicher = tips.filter((t) => t.tier === 'sehr-sicher');
  const sicher = tips.filter((t) => t.tier === 'sicher');

  return (
    <section className="space-y-3 rounded-2xl border border-emerald-400/50 bg-emerald-950/15 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">🛡️ Sichere WM-Tipps (nächste {maxDays} Tage)</h2>
        <span className="text-[10px] text-emerald-200/70">
          {tips.length} Tipps · {maxTier.length} maximal · {sehrSicher.length} sehr sicher
        </span>
      </div>
      <p className="text-[10.5px] leading-snug text-emerald-100/80">
        Scannt ALLE Märkte pro Spiel (1X2, Doppelchance, Über/Unter, BTTS, Clean Sheet) — zeigt nur die,
        die ≥{Math.round(minProbability * 100)} % Profi-Engine-Wahrscheinlichkeit erreichen UND auf einer Datenbasis ≥{minDataConfidence}/100 stehen.
        Mehrere Tipps pro Spieltag möglich. Vergangenheit ≠ Zukunft — keine Garantie.
      </p>

      {maxTier.length > 0 && <TipGroup heading="🏆 Maximal sicher (≥85 %)" tips={maxTier} />}
      {sehrSicher.length > 0 && <TipGroup heading="✓ Sehr sicher (78–84 %)" tips={sehrSicher} />}
      {sicher.length > 0 && <TipGroup heading="◇ Sicher (70–77 %)" tips={sicher} />}

      <p className="text-[9.5px] leading-snug text-emerald-100/55">
        Quelle: Profi-Engine aus ELO + Form + xG + Spielort. Wahrscheinlichkeiten sind Modell-Schätzungen, nicht Garantien.
      </p>
    </section>
  );
}

function TipGroup({ heading, tips }: { heading: string; tips: SafeWmTip[] }) {
  return (
    <div className="space-y-1.5">
      <h3 className="text-[10px] font-semibold uppercase tracking-wider text-emerald-200/80">{heading}</h3>
      <ul className="space-y-1">
        {tips.map((t, i) => {
          const tone = TIER_STYLE[t.tier];
          return (
            <li
              key={`${t.fixture.id}-${t.market.market}`}
              className={`grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-md border px-2.5 py-1.5 text-[11px] ${tone.tone}`}
            >
              <span className="font-mono text-[10px] text-emerald-300">#{i + 1}</span>
              <span className="min-w-0">
                <span className="block truncate text-slate-100">
                  <span className="font-semibold">{t.fixture.homeTeam}</span>
                  <span className="mx-1 text-slate-500">–</span>
                  <span className="font-semibold">{t.fixture.awayTeam}</span>
                </span>
                <span className="block truncate text-[9.5px] text-slate-500">
                  {fmtDate(t.fixture.date)}{t.fixture.time && ` · ${t.fixture.time}`} · {t.fixture.phase}{t.fixture.group ? ` ${t.fixture.group}` : ''}
                </span>
                <span className="block truncate text-[10.5px] text-emerald-200">
                  → {t.market.market}
                </span>
                <span className="block truncate text-[9.5px] text-slate-500/90 italic">{t.market.rationale}</span>
              </span>
              <span className={`shrink-0 rounded border px-1.5 py-0.5 text-center font-mono text-[10px] font-bold ${tone.chip}`}>
                {Math.round(t.market.probability * 100)} %
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

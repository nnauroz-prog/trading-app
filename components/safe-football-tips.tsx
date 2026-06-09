// „Sichere Fußball-Tipps" — quer durch alle Ligen, alle Märkte. Zeigt die
// Profi-Engine-Tipps oberhalb einer Mindest-Schwelle. Drei Sicherheits-Stufen:
// maximal (≥85 % + gute Datenbasis), sehr-sicher (78–84 %), sicher (70–77 %).

import { rankSafeFootballTips, type SafeFootballTip } from '@/lib/sport/safe-football-tips';
import { groupByDayBucket } from '@/lib/sport/day-bucket';
import type { LeagueFixtures } from '@/lib/sport/fetcher';

interface Props {
  leagues: LeagueFixtures[];
  todayIso: string;
  horizonDays?: number;
  minProbability?: number;
  limit?: number;
}

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'Europe/Berlin' });
}

const TIER_STYLE: Record<SafeFootballTip['tier'], { label: string; chip: string; tone: string }> = {
  'maximal': {
    label: 'HÖCHSTE MODELL-KONFLUENZ',
    chip: 'border-emerald-300/70 bg-emerald-400/20 text-emerald-100',
    tone: 'border-emerald-400/60 bg-emerald-500/10'
  },
  'sehr-sicher': {
    label: 'STARKE KONFLUENZ',
    chip: 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200',
    tone: 'border-emerald-400/40 bg-emerald-500/5'
  },
  'sicher': {
    label: 'SOLIDE KONFLUENZ',
    chip: 'border-sky-400/40 bg-sky-500/10 text-sky-100',
    tone: 'border-sky-400/30 bg-sky-500/5'
  }
};

export function SafeFootballTips({
  leagues,
  todayIso,
  horizonDays = 14,
  minProbability = 0.70,
  limit = 20
}: Props) {
  const tips = rankSafeFootballTips(leagues, { todayIso, horizonDays, minProbability, limit });
  if (tips.length === 0) return null;

  const maxTier = tips.filter((t) => t.tier === 'maximal');
  const sehrSicher = tips.filter((t) => t.tier === 'sehr-sicher');
  const sicher = tips.filter((t) => t.tier === 'sicher');

  return (
    <section className="space-y-3 rounded-2xl border border-emerald-400/40 bg-emerald-950/15 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">🛡️ Streng gefilterte Fußball-Modell-Picks (alle Ligen)</h2>
        <span className="text-[10px] text-emerald-200/70">
          {tips.length} Picks · {maxTier.length} höchste · {sehrSicher.length} starke Konfluenz
        </span>
      </div>
      <p className="text-[10.5px] leading-snug text-emerald-100/80">
        Scannt jedes anstehende Spiel der nächsten {horizonDays} Tage durch ALLE Märkte (1X2, Doppelchance, Über/Unter, BTTS) —
        zeigt nur Modell-Picks ab {Math.round(minProbability * 100)} % Wahrscheinlichkeit auf mindestens mittlerer Datenqualität.
        Diese Liste ersetzt nicht die FREIGABE-Logik des Precision Desk oben — sie ist eine Rohdaten-Übersicht.
      </p>

      {(() => {
        const dayGroups = groupByDayBucket(tips, (t) => t.fixture.date, todayIso);
        const todayGroup = dayGroups.find((g) => g.key === 'heute');
        return todayGroup && todayGroup.items.length > 0 ? (
          <TipGroup heading={`📅 Heute · ${todayGroup.items.length}`} tips={todayGroup.items} />
        ) : null;
      })()}

      {maxTier.length > 0 && <TipGroup heading="🏆 Höchste Modell-Konfluenz (≥85 %, beste Datenbasis)" tips={maxTier} />}
      {sehrSicher.length > 0 && <TipGroup heading="✓ Starke Konfluenz (78–84 %)" tips={sehrSicher} />}
      {sicher.length > 0 && <TipGroup heading="◇ Solide Konfluenz (70–77 %)" tips={sicher} />}

      <p className="text-[9.5px] leading-snug text-emerald-100/55">
        Datenbasis: TheSportsDB-Form pro Liga (Tore-Pro/Gegen) + Poisson-Modell. Modell-Tendenzen, keine Garantien. Für eine echte Freigabe siehe Precision Desk oben.
      </p>
    </section>
  );
}

function TipGroup({ heading, tips }: { heading: string; tips: SafeFootballTip[] }) {
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
                  {fmtDate(t.fixture.date)}{t.fixture.time && ` · ${t.fixture.time}`} · {t.leagueName}
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

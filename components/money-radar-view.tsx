// Geld-Radar-Ansicht. Server-Component. Zeigt die geld-relevantesten
// News zuerst, dann nach Asset-Klasse gruppiert. Jede Meldung mit
// Klartext-Hinweis, warum sie relevant ist.

import type { MoneyRadarResult, RadarItem } from '@/lib/news/money-radar';

function freshLabel(h: number): string {
  if (h <= 0) return 'gerade eben';
  if (h === 1) return 'vor 1 Std.';
  if (h < 24) return `vor ${h} Std.`;
  const d = Math.round(h / 24);
  return d === 1 ? 'vor 1 Tag' : `vor ${d} Tagen`;
}

const DIR_STYLE: Record<RadarItem['direction'], { chip: string; label: string }> = {
  chance: { chip: 'text-emerald-200 border-emerald-400/40 bg-emerald-500/10', label: 'Chance' },
  risiko: { chip: 'text-rose-200 border-rose-400/40 bg-rose-500/10', label: 'Risiko' },
  neutral: { chip: 'text-slate-300 border-slate-600/50 bg-slate-500/10', label: 'Neutral' }
};

function ItemRow({ item }: { item: RadarItem }) {
  const d = DIR_STYLE[item.direction];
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-2xl border border-white/10 bg-white/[0.03] p-3 transition duration-200 hover:-translate-y-0.5 hover:border-emerald-400/40 hover:bg-white/[0.06]"
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${d.chip}`}>{d.label}</span>
        <span className="text-[9.5px] text-slate-500">{item.source} · {freshLabel(item.freshnessHours)}</span>
      </div>
      <h3 className="mt-1.5 text-[13px] font-semibold leading-snug text-slate-100 group-hover:text-white">{item.title}</h3>
      <p className="mt-1 text-[11px] leading-snug text-slate-400">{item.whyRelevant}</p>
      {item.signals.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {item.signals.slice(0, 4).map((s) => (
            <span key={s} className="rounded border border-slate-700 bg-slate-900/60 px-1.5 py-0.5 text-[9px] text-slate-300">{s}</span>
          ))}
        </div>
      )}
    </a>
  );
}

export function MoneyRadarView({ radar }: { radar: MoneyRadarResult }) {
  if (radar.note) {
    return (
      <section className="rounded-2xl border border-slate-700/60 bg-slate-900/40 p-4 text-[12px] text-slate-400">
        {radar.note}
      </section>
    );
  }

  return (
    <div className="space-y-5">
      {/* Top-Chancen */}
      <section className="space-y-3 rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/70 to-slate-950/70 p-4 backdrop-blur-sm md:p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-300">
            <span aria-hidden>🛰️</span> Top heute · geld-relevant
          </div>
          <span className="text-[9.5px] uppercase tracking-wider text-slate-500">{radar.sourceCount} Quellen</span>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {radar.top.map((it) => <ItemRow key={it.id} item={it} />)}
        </div>
      </section>

      {/* Nach Kategorie */}
      {radar.groups.map((g) => (
        <section key={g.category} className="space-y-2">
          <h2 className="flex items-center gap-2 text-[13px] font-bold tracking-tight text-white">
            <span aria-hidden className="text-base">{g.emoji}</span> {g.label}
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {g.items.map((it) => <ItemRow key={it.id} item={it} />)}
          </div>
        </section>
      ))}
    </div>
  );
}

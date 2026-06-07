import type { HotCommodityGroup } from '@/lib/market/commodity-group-summary';

export function HotCommodityGroupBanner({ hotGroups }: { hotGroups: HotCommodityGroup[] }) {
  if (hotGroups.length === 0) return null;
  return (
    <section className="space-y-2 rounded-2xl border border-emerald-400/50 bg-emerald-950/15 p-3">
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">🔥 Heiße Rohstoff-Gruppen heute</h2>
      <ul className="flex flex-wrap gap-1.5">
        {hotGroups.map((s) => (
          <li key={s.group} className="inline-flex items-baseline gap-1.5 rounded-md border border-emerald-400/40 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-100">
            <span className="font-semibold">{s.group}</span>
            <span className="font-mono text-[10px] text-emerald-200/80">
              {s.gradeACount}/{s.total} · {Math.round(s.gradeARatio * 100)} %
            </span>
          </li>
        ))}
      </ul>
      <p className="text-[10px] leading-snug text-emerald-100/60">
        Gruppen mit ≥40 % Grade-A-Rohstoffen — Markt-Momentum konzentriert sich hier.
      </p>
    </section>
  );
}

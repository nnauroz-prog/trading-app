interface ExtraTipsChipsProps {
  btts: number | null;
  over25: number | null;
}

// Kompakte Zusatz-Tipps für ein Spiel: BTTS und Über/Unter 2.5 Tore.
// Picks the side the model leans toward, so the UI shows a concrete tip and
// the confidence behind it.
export function ExtraTipsChips({ btts, over25 }: ExtraTipsChipsProps) {
  const chips: { label: string; tone: string }[] = [];
  if (btts !== null) {
    const yes = btts >= 0.5;
    const pct = Math.round((yes ? btts : 1 - btts) * 100);
    chips.push({
      label: yes ? `Beide treffen · ${pct}%` : `Mindestens 1 Team trifft NICHT · ${pct}%`,
      tone: pct >= 65 ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200' : 'border-slate-700 bg-slate-900/40 text-slate-300'
    });
  }
  if (over25 !== null) {
    const over = over25 >= 0.5;
    const pct = Math.round((over ? over25 : 1 - over25) * 100);
    chips.push({
      label: over ? `Über 2.5 Tore · ${pct}%` : `Unter 2.5 Tore · ${pct}%`,
      tone: pct >= 65 ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200' : 'border-slate-700 bg-slate-900/40 text-slate-300'
    });
  }
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((c, i) => (
        <span key={i} className={`rounded-md border px-2 py-0.5 text-[10px] font-mono ${c.tone}`}>{c.label}</span>
      ))}
    </div>
  );
}

export type FormResult = 'W' | 'D' | 'L';

interface Props {
  sequence: FormResult[];
  size?: 'sm' | 'md';
}

// Reine Anzeige-Komponente, die eine W/D/L-Folge als farbige Mini-Chips
// rendert. Wiederverwendet von Team-Watchlist, Detail-Seite und DaySection.
export function FormSparkline({ sequence, size = 'sm' }: Props) {
  if (sequence.length === 0) return <span className="text-[10px] text-slate-600">keine Form</span>;
  const dim = size === 'md' ? 'h-4 w-4 text-[9px] leading-4' : 'h-3 w-3 text-[8.5px] leading-3';
  return (
    <span className="inline-flex gap-0.5" aria-label="Form der letzten Spiele">
      {sequence.map((r, i) => {
        const color =
          r === 'W' ? 'bg-emerald-500/80 text-emerald-50' : r === 'L' ? 'bg-rose-500/80 text-rose-50' : 'bg-slate-600 text-slate-100';
        const label = r === 'W' ? 'Sieg' : r === 'L' ? 'Niederlage' : 'Unentschieden';
        return (
          <span
            key={i}
            title={label}
            className={`inline-block rounded-sm text-center font-bold ${color} ${dim}`}
          >
            {r === 'W' ? 'S' : r === 'L' ? 'N' : 'U'}
          </span>
        );
      })}
    </span>
  );
}

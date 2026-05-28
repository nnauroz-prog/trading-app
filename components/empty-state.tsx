'use client';

interface EmptyStateProps {
  title: string;
  description: string;
  steps?: string[];
  actionLabel?: string;
  onAction?: () => void;
  hint?: string;
}

export function EmptyState({ title, description, steps, actionLabel, onAction, hint }: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/40 p-5 text-center">
      <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-slate-500">{description}</p>

      {steps && steps.length > 0 && (
        <ol className="mx-auto mt-3 max-w-sm space-y-1.5 text-left">
          {steps.map((step, i) => (
            <li key={i} className="flex items-start gap-2 text-[11px] text-slate-400">
              <span className="mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-[9px] font-semibold text-emerald-300">
                {i + 1}
              </span>
              <span className="leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
      )}

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 rounded-md border border-emerald-400/50 bg-emerald-500/20 px-4 py-1.5 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/30"
        >
          {actionLabel}
        </button>
      )}

      {hint && <p className="mt-3 text-[10px] text-slate-600">{hint}</p>}
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-slate-800/60 ${className}`} aria-hidden="true" />;
}

export function PanelSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <section
      role="status"
      aria-busy="true"
      className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5"
    >
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-2.5 w-48" />
        </div>
        <Skeleton className="h-7 w-20" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
      <span className="sr-only">Lädt…</span>
    </section>
  );
}

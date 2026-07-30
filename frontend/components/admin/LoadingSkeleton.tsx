function Shimmer({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-bg-800 ${className}`} />;
}

export function AdminDashboardSkeleton() {
  return (
    <div className="space-y-8" role="status" aria-label="Loading dashboard">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <Shimmer className="h-3 w-40" />
          <Shimmer className="h-8 w-64" />
          <Shimmer className="h-3 w-72" />
        </div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Shimmer key={i} className="h-7 w-28 rounded-full" />
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card space-y-3">
            <div className="flex items-start justify-between">
              <Shimmer className="h-3 w-24" />
              <Shimmer className="h-9 w-9 rounded-lg" />
            </div>
            <Shimmer className="h-8 w-20" />
            <Shimmer className="h-3 w-32" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="card space-y-4">
          <Shimmer className="h-5 w-40" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Shimmer key={i} className="h-10 w-full" />
          ))}
        </div>
        <div className="space-y-4">
          <div className="card space-y-3">
            <Shimmer className="h-5 w-32" />
            {Array.from({ length: 3 }).map((_, i) => (
              <Shimmer key={i} className="h-8 w-full" />
            ))}
          </div>
          <div className="card space-y-2">
            <Shimmer className="h-5 w-32" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Shimmer key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
      </div>

      <span className="sr-only">Loading dashboard data…</span>
    </div>
  );
}

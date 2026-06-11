function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200/80 ${className ?? ""}`} />;
}

export default function DashboardLoading() {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-64" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <Skeleton className="h-44 xl:col-span-8" />
        <Skeleton className="h-44 xl:col-span-4" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <Skeleton className="h-80 lg:col-span-4" />
        <Skeleton className="h-80 lg:col-span-5" />
        <Skeleton className="h-80 lg:col-span-3" />
      </div>
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200/60 ${className ?? ""}`} />;
}

export default function DashboardLoading() {
  return (
    <div className="-m-2 bg-[#f6f7f9] p-2 lg:-m-4 lg:p-4">
      <div className="mx-auto max-w-[1320px] space-y-6">
        <Skeleton className="h-16 rounded-xl" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-56 rounded-xl" />
        <div className="grid gap-3 lg:grid-cols-12">
          <Skeleton className="h-64 rounded-xl lg:col-span-4" />
          <Skeleton className="h-64 rounded-xl lg:col-span-5" />
          <Skeleton className="h-64 rounded-xl lg:col-span-3" />
        </div>
      </div>
    </div>
  );
}

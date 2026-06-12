import { PageContainer } from "@/components/layout";

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200/60 ${className ?? ""}`} />;
}

export default function DashboardLoading() {
  return (
    <PageContainer>
      <Skeleton className="h-16" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[7.5rem]" />
        ))}
      </div>
      <Skeleton className="h-56" />
      <div className="grid gap-4 lg:grid-cols-12">
        <Skeleton className="h-64 lg:col-span-4" />
        <Skeleton className="h-64 lg:col-span-5" />
        <Skeleton className="h-64 lg:col-span-3" />
      </div>
    </PageContainer>
  );
}

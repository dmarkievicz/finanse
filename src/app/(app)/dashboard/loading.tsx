import { PageContainer } from "@/components/layout";

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200/60 ${className ?? ""}`} />;
}

export default function DashboardLoading() {
  return (
    <PageContainer>
      <Skeleton className="h-16" />
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-12">
        <Skeleton className="h-[32rem] xl:col-span-7" />
        <Skeleton className="h-[32rem] xl:col-span-5" />
      </div>
    </PageContainer>
  );
}

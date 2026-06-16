import Link from "next/link";
import { AlertTriangle, Info } from "lucide-react";
import type { BudgetStatusNotice } from "@/lib/queries/fetch-budget-dashboard";
import { cn } from "@/lib/utils";

interface BudgetStatusNoticeProps {
  notice: BudgetStatusNotice;
}

export function BudgetStatusNoticeCard({ notice }: BudgetStatusNoticeProps) {
  const isWarning = Boolean(notice.actionHref);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between",
        isWarning
          ? "border-amber-200/90 bg-amber-50/90"
          : "border-border bg-card"
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
            isWarning ? "bg-amber-100 text-amber-700" : "bg-primary/10 text-primary"
          )}
        >
          {isWarning ? <AlertTriangle className="h-4 w-4" /> : <Info className="h-4 w-4" />}
        </div>
        <div className="min-w-0">
          <p
            className={cn(
              "text-xs font-medium uppercase tracking-wide",
              isWarning ? "text-amber-800" : "text-muted"
            )}
          >
            {notice.title}
          </p>
          <p
            className={cn(
              "mt-0.5 text-sm leading-snug",
              isWarning ? "text-amber-900" : "text-foreground"
            )}
          >
            {notice.message}
          </p>
        </div>
      </div>
      {notice.actionLabel && notice.actionHref && (
        <Link
          href={notice.actionHref}
          className="shrink-0 self-start rounded-md border border-amber-300/80 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 shadow-sm transition hover:bg-amber-50 sm:self-center"
        >
          {notice.actionLabel}
        </Link>
      )}
    </div>
  );
}

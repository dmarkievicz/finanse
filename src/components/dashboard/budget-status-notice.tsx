import Link from "next/link";
import { Info } from "lucide-react";
import type { BudgetStatusNotice } from "@/lib/queries/fetch-budget-dashboard";

interface BudgetStatusNoticeProps {
  notice: BudgetStatusNotice;
}

export function BudgetStatusNoticeCard({ notice }: BudgetStatusNoticeProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200/80 bg-slate-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white shadow-sm ring-1 ring-slate-200/80">
          <Info className="h-4 w-4 text-slate-500" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {notice.title}
          </p>
          <p className="mt-0.5 text-sm leading-snug text-slate-700">{notice.message}</p>
        </div>
      </div>
      {notice.actionLabel && notice.actionHref && (
        <Link
          href={notice.actionHref}
          className="shrink-0 self-start rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 sm:self-center"
        >
          {notice.actionLabel}
        </Link>
      )}
    </div>
  );
}

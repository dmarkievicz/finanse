import Link from "next/link";
import { formatPln } from "@/lib/format";
import { cn } from "@/lib/utils";

interface CategoryBudgetBarProps {
  spent: number;
  limit: number | null;
  categoryId: string;
  budgetYear: number;
  budgetMonth: number;
  compact?: boolean;
}

export function CategoryBudgetBar({
  spent,
  limit,
  budgetYear,
  budgetMonth,
  compact = false,
}: CategoryBudgetBarProps) {
  if (!limit || limit <= 0) {
    return (
      <Link
        href={`/budgets?month=${budgetYear}-${String(budgetMonth).padStart(2, "0")}`}
        className="text-xs text-slate-400 hover:text-primary hover:underline"
      >
        Ustaw budżet
      </Link>
    );
  }

  const pct = Math.min(Math.round((spent / limit) * 100), 999);
  const over = spent > limit;

  return (
    <div className={cn("min-w-[120px]", compact && "min-w-[100px]")}>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className={cn("font-medium", over ? "text-rose-600" : "text-slate-700")}>
          {formatPln(spent)}
        </span>
        <span className="text-slate-400">/ {formatPln(limit)}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            over ? "bg-rose-500" : pct > 80 ? "bg-amber-400" : "bg-emerald-500"
          )}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <p className={cn("mt-0.5 text-[10px]", over ? "text-rose-600" : "text-slate-400")}>
        {pct}% budżetu
        {over && ` · +${formatPln(spent - limit)}`}
      </p>
    </div>
  );
}

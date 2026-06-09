import Link from "next/link";
import { cn } from "@/lib/utils";

interface TransactionsFiltersProps {
  currentType: string;
  reviewOnly: boolean;
  needsReviewCount: number;
}

const types = [
  { value: "all", label: "Wszystkie" },
  { value: "expense", label: "Wydatki" },
  { value: "income", label: "Przychody" },
  { value: "transfer", label: "Transfery" },
];

function buildUrl(type: string, reviewOnly: boolean) {
  const params = new URLSearchParams();
  if (type !== "all") params.set("type", type);
  if (reviewOnly) params.set("review", "1");
  const qs = params.toString();
  return `/transactions${qs ? `?${qs}` : ""}`;
}

export function TransactionsFilters({
  currentType,
  reviewOnly,
  needsReviewCount,
}: TransactionsFiltersProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {types.map((t) => (
        <Link
          key={t.value}
          href={buildUrl(t.value, reviewOnly)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition",
            currentType === t.value
              ? "bg-primary text-white"
              : "border border-border bg-card text-muted hover:text-foreground"
          )}
        >
          {t.label}
        </Link>
      ))}
      <span className="mx-1 text-border">|</span>
      <Link
        href={buildUrl(currentType, !reviewOnly)}
        className={cn(
          "rounded-lg px-3 py-1.5 text-sm font-medium transition",
          reviewOnly
            ? "bg-red-600 text-white"
            : "border border-border bg-card text-muted hover:text-foreground"
        )}
      >
        Do poprawy
        {needsReviewCount > 0 && (
          <span
            className={cn(
              "ml-1.5 rounded-full px-1.5 py-0.5 text-xs",
              reviewOnly ? "bg-red-500" : "bg-red-100 text-red-700"
            )}
          >
            {needsReviewCount}
          </span>
        )}
      </Link>
    </div>
  );
}

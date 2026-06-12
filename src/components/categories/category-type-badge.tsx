import type { CategoryType } from "@/types/database";
import { categoryTypeBadgeClass, categoryTypeLabel } from "@/lib/categories/labels";
import { cn } from "@/lib/utils";

export function CategoryTypeBadge({ type }: { type: CategoryType }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        categoryTypeBadgeClass(type)
      )}
    >
      {categoryTypeLabel(type)}
    </span>
  );
}

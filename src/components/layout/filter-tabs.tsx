import Link from "next/link";
import { filterChipBase, filterChipActive, filterChipIdle } from "@/components/layout/filter-chips";
import { cn } from "@/lib/utils";

export interface FilterTabItem {
  value: string;
  label: string;
  href: string;
}

interface FilterTabsProps {
  items: FilterTabItem[];
  active: string;
  label?: string;
  className?: string;
}

/** Zakładki filtrów — ten sam układ co chipy okresu/typu w Transakcjach. */
export function FilterTabs({ items, active, label, className }: FilterTabsProps) {
  return (
    <div className={className}>
      {label && <p className="mb-2 text-xs font-medium text-muted">{label}</p>}
      <div className="-mx-1 flex flex-wrap gap-1.5 overflow-x-auto px-1 pb-0.5" role="tablist">
        {items.map((item) => (
          <Link
            key={item.value}
            href={item.href}
            role="tab"
            aria-selected={active === item.value}
            className={cn(
              filterChipBase,
              active === item.value ? filterChipActive : filterChipIdle
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

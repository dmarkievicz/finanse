import Link from "next/link";
import { cn } from "@/lib/utils";

export interface FilterTabItem {
  value: string;
  label: string;
  href: string;
}

interface FilterTabsProps {
  items: FilterTabItem[];
  active: string;
  className?: string;
}

/** Spójne zakładki / filtry typu (Wszystkie, Wydatki, …). */
export function FilterTabs({ items, active, className }: FilterTabsProps) {
  return (
    <div
      className={cn(
        "flex gap-1 overflow-x-auto rounded-xl border border-border bg-slate-50/80 p-1",
        className
      )}
      role="tablist"
    >
      {items.map((item) => (
        <Link
          key={item.value}
          href={item.href}
          role="tab"
          aria-selected={active === item.value}
          className={cn(
            "shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition",
            active === item.value
              ? "bg-card text-foreground shadow-sm"
              : "text-muted hover:text-foreground"
          )}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}

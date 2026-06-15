import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DashboardSectionHeaderProps {
  title: string;
  className?: string;
  action?: ReactNode;
}

export function DashboardSectionHeader({ title, className, action }: DashboardSectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border-b border-white/10 bg-sidebar px-4 py-3",
        className
      )}
    >
      <h2 className="text-sm font-semibold tracking-tight text-sidebar-foreground">{title}</h2>
      {action}
    </div>
  );
}

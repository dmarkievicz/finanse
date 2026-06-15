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
        "flex items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-900 px-4 py-3",
        className
      )}
    >
      <h2 className="text-sm font-semibold tracking-tight text-white">{title}</h2>
      {action}
    </div>
  );
}

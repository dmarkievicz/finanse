import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Wspólny kontener sekcji dashboardu — jasne tło, delikatna obwódka. */
export function DashboardPanel({
  children,
  className,
  padding = "default",
}: {
  children: ReactNode;
  className?: string;
  padding?: "default" | "compact" | "none";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200/90 bg-white",
        padding === "default" && "p-5",
        padding === "compact" && "p-4",
        padding === "none" && "p-0",
        className
      )}
    >
      {children}
    </div>
  );
}

export function DashboardPanelHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 className="text-[15px] font-semibold tracking-tight text-slate-800">{title}</h3>
        {subtitle && <p className="mt-0.5 text-[13px] text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function DashboardSection({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      {title && (
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</h2>
      )}
      {children}
    </section>
  );
}

export function DashboardEmpty({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[120px] items-center justify-center rounded-lg bg-slate-50/80 text-[13px] text-slate-500">
      {children}
    </div>
  );
}

export const dashboardLink =
  "text-[13px] font-medium text-slate-600 hover:text-slate-900 transition-colors";

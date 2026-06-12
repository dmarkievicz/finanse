import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  children: ReactNode;
  className?: string;
  padding?: "default" | "compact" | "none";
}

/** Karta sekcji — tabela, wykres, panel szczegółów. */
export function SectionCard({
  children,
  className,
  padding = "default",
}: SectionCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card shadow-sm",
        padding === "default" && "p-5",
        padding === "compact" && "p-4",
        padding === "none" && "overflow-hidden p-0",
        className
      )}
    >
      {children}
    </div>
  );
}

export function SectionCardHeader({
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
        <h3 className="text-base font-semibold tracking-tight text-foreground">{title}</h3>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

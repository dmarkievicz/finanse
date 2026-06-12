import type { ReactNode } from "react";
import { SectionCard, SectionCardHeader } from "@/components/layout";

/** @deprecated Użyj SectionCard z @/components/layout */
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
    <SectionCard className={className} padding={padding}>
      {children}
    </SectionCard>
  );
}

/** @deprecated Użyj SectionCardHeader z @/components/layout */
export function DashboardPanelHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return <SectionCardHeader title={title} subtitle={subtitle} action={action} />;
}

export function DashboardSection({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      {title && (
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">{title}</h2>
      )}
      {children}
    </section>
  );
}

export function DashboardEmpty({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[7.5rem] items-center justify-center rounded-lg bg-slate-50/80 text-sm text-muted">
      {children}
    </div>
  );
}

export const dashboardLink =
  "text-sm font-medium text-muted hover:text-foreground transition-colors";

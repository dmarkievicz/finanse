import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { DashboardSectionHeader } from "@/components/dashboard/dashboard-section-header";
import { SectionCard } from "@/components/layout";

interface SummaryPanelProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function SummaryPanel({ title, children, className }: SummaryPanelProps) {
  return (
    <SectionCard
      padding="none"
      className={cn("flex h-full flex-col overflow-hidden", className)}
    >
      <DashboardSectionHeader title={title} />
      <div className="flex min-h-0 flex-1 flex-col p-4">{children}</div>
    </SectionCard>
  );
}

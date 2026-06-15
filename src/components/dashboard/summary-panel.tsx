import type { ReactNode } from "react";
import { DashboardSectionHeader } from "@/components/dashboard/dashboard-section-header";
import { SectionCard } from "@/components/layout";

interface SummaryPanelProps {
  title: string;
  children: ReactNode;
}

export function SummaryPanel({ title, children }: SummaryPanelProps) {
  return (
    <SectionCard padding="none" className="overflow-hidden">
      <DashboardSectionHeader title={title} />
      <div className="p-5">{children}</div>
    </SectionCard>
  );
}

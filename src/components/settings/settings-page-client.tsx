"use client";

import { useEffect, useState } from "react";
import type { AuditLogRow } from "@/lib/queries/audit";
import { SettingsSidebar, type SettingsTab } from "@/components/settings/settings-sidebar";
import { AccountSection } from "@/components/settings/sections/account-section";
import { AnalyticsSection } from "@/components/settings/sections/analytics-section";
import { AutomationSection } from "@/components/settings/sections/automation-section";
import { ExportSection } from "@/components/settings/sections/export-section";
import { DataSection } from "@/components/settings/sections/data-section";
import { AuditLogTable } from "@/components/settings/audit-log-table";

interface RuleRow {
  id: string;
  pattern: string;
  category_id: string;
  priority: number;
  categories: { name: string } | null;
}

export interface SettingsPageClientProps {
  email?: string | null;
  userId?: string | null;
  analysisStartDate: string | null;
  goal: {
    id: string | null;
    name: string;
    goal_type: string;
    target_amount: number;
    target_date: string;
  };
  currentNetWorth: number;
  rules: RuleRow[];
  categories: { id: string; name: string }[];
  transactionCount: number;
  reviewCount: number;
  lastNbpSyncDate: string | null;
  auditRows: AuditLogRow[];
}

export function SettingsPageClient(props: SettingsPageClientProps) {
  const [tab, setTab] = useState<SettingsTab>("account");

  useEffect(() => {
    if (window.location.hash === "#cel") setTab("analytics");
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Ustawienia</h1>
        <p className="mt-1 text-sm text-muted">
          Konfiguracja konta, analiz, eksportu danych i narzędzi administracyjnych.
        </p>
      </header>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
        <SettingsSidebar active={tab} onChange={setTab} />

        <div className="min-w-0 flex-1 pb-8">
          {tab === "account" && (
            <AccountSection email={props.email} userId={props.userId} />
          )}
          {tab === "analytics" && (
            <AnalyticsSection
              analysisStartDate={props.analysisStartDate}
              goal={props.goal}
              currentNetWorth={props.currentNetWorth}
            />
          )}
          {tab === "automation" && (
            <AutomationSection rules={props.rules} categories={props.categories} />
          )}
          {tab === "export" && <ExportSection lastNbpSyncDate={props.lastNbpSyncDate} />}
          {tab === "data" && (
            <DataSection
              transactionCount={props.transactionCount}
              reviewCount={props.reviewCount}
            />
          )}
          {tab === "audit" && <AuditLogTable rows={props.auditRows} />}
        </div>
      </div>
    </div>
  );
}

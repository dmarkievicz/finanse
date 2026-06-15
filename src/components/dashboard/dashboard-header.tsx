import Link from "next/link";
import { PiggyBank } from "lucide-react";
import type { BudgetDashboardSelection } from "@/lib/dashboard/budget-period";
import { DashboardPeriodSelector } from "@/components/dashboard/dashboard-period-selector";
import { btnSecondary } from "@/components/layout/buttons";

interface DashboardHeaderProps {
  selection: BudgetDashboardSelection;
  yearOptions: number[];
}

export function DashboardHeader({ selection, yearOptions }: DashboardHeaderProps) {
  return (
    <header className="flex flex-col gap-4 border-b border-border/60 pb-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          Pulpit finansowy
        </h1>
        <p className="mt-0.5 text-sm text-muted">
          Analiza budżetu, przychodów i wydatków · PLN
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <DashboardPeriodSelector selection={selection} yearOptions={yearOptions} />
        <Link href="/budgets" className={btnSecondary}>
          <PiggyBank className="h-4 w-4" />
          Budżety
        </Link>
      </div>
    </header>
  );
}

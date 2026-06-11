import Link from "next/link";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { CashflowChart } from "@/components/dashboard/cashflow-chart";
import { CategoryDonut } from "@/components/dashboard/category-donut";
import { AccountBalances } from "@/components/dashboard/account-balances";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { InvestmentsPanel } from "@/components/dashboard/investments-panel";
import { GoalProgress } from "@/components/dashboard/goal-progress";
import { CurrencyExposure } from "@/components/dashboard/currency-exposure";
import { createClient } from "@/lib/supabase/server";
import { greetingPl, formatMonthYear, formatPln, formatPercent } from "@/lib/format";
import { fetchDashboardData, calcTrendPercent } from "@/lib/queries/dashboard";
import { fetchLookupData } from "@/lib/queries/transaction-detail";
import { QuickTransactionForm } from "@/components/transactions/quick-transaction-form";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const now = new Date();
  const hour = now.getHours();
  const name = user?.email?.split("@")[0] ?? "Damian";

  const [data, lookup] = await Promise.all([
    fetchDashboardData(supabase, now),
    fetchLookupData(supabase),
  ]);
  const activeAccounts = lookup.accounts
    .filter((a) => a.lifecycle_status === "active")
    .map((a) => ({ id: a.id, name: a.name }));
  const { currentCashflow, previousCashflow } = data;

  const savingsRate =
    currentCashflow.income_pln > 0
      ? (currentCashflow.surplus_pln / currentCashflow.income_pln) * 100
      : 0;
  const prevSavingsRate =
    previousCashflow.income_pln > 0
      ? (previousCashflow.surplus_pln / previousCashflow.income_pln) * 100
      : 0;

  const incomeTrend = calcTrendPercent(currentCashflow.income_pln, previousCashflow.income_pln);
  const expenseTrend = calcTrendPercent(currentCashflow.expense_pln, previousCashflow.expense_pln);
  const savingsTrend =
    prevSavingsRate > 0
      ? `${savingsRate - prevSavingsRate >= 0 ? "+" : ""}${(savingsRate - prevSavingsRate).toFixed(1)} p.p.`
      : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-accent">
            {greetingPl(hour)}, {name}
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">
            Pulpit finansowy
          </h1>
          <p className="mt-1 text-sm text-muted">
            Podsumowanie za {formatMonthYear(now)} · waluta bazowa: PLN
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm shadow-sm">
          <Calendar className="h-4 w-4 text-muted" />
          <span className="font-medium text-foreground">{formatMonthYear(now)}</span>
        </div>
      </div>

      {data.needsReviewCount > 0 && (
        <Link
          href="/transactions?review=1"
          className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm transition hover:bg-red-100/80"
        >
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          <span className="text-red-800">
            <strong>{data.needsReviewCount}</strong> transakcji wymaga poprawy — kliknij, aby przejrzeć
          </span>
        </Link>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <GoalProgress
            name={data.goal.name}
            current={data.goal.current}
            target={data.goal.target}
            targetDate={data.goal.targetDate}
          />
        </div>
        <QuickTransactionForm accounts={activeAccounts} categories={lookup.categories} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Majątek netto"
          value={formatPln(data.netWorth)}
          sub="suma sald wszystkich kont"
          icon={Wallet}
          accent="default"
          href="/accounts"
        />
        <KpiCard
          label="Przychody w miesiącu"
          value={formatPln(currentCashflow.income_pln)}
          sub="bez transferów wewnętrznych"
          icon={TrendingUp}
          trend={incomeTrend ? { value: incomeTrend, positive: currentCashflow.income_pln >= previousCashflow.income_pln } : undefined}
          accent="green"
          href={`/transactions?type=income&month=${data.currentMonth}`}
        />
        <KpiCard
          label="Wydatki w miesiącu"
          value={formatPln(currentCashflow.expense_pln)}
          sub="wydatki konsumpcyjne"
          icon={TrendingDown}
          trend={
            expenseTrend
              ? {
                  value: expenseTrend,
                  positive: currentCashflow.expense_pln <= previousCashflow.expense_pln,
                }
              : undefined
          }
          accent="red"
          href={`/transactions?type=expense&month=${data.currentMonth}`}
        />
        <KpiCard
          label="Stopa oszczędności"
          value={formatPercent(savingsRate)}
          sub="nadwyżka / przychody"
          icon={PiggyBank}
          trend={
            savingsTrend
              ? { value: savingsTrend, positive: savingsRate >= prevSavingsRate }
              : undefined
          }
          accent="gold"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CashflowChart data={data.cashflowHistory} />
        <CategoryDonut
          categories={data.categoryBreakdown}
          total={data.categoryTotal}
          month={data.currentMonth}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <AccountBalances accounts={data.accountBalances} />
        </div>
        <div className="lg:col-span-2">
          <RecentTransactions transactions={data.recentTransactions} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <InvestmentsPanel
          totalPln={data.investmentsTotal}
          allocation={data.investmentsAllocation}
        />
        <CurrencyExposure currencies={data.currencyExposure} />
      </div>
    </div>
  );
}

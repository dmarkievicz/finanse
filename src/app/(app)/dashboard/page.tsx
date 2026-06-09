import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Calendar,
} from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { CashflowChart } from "@/components/dashboard/cashflow-chart";
import { CategoryDonut } from "@/components/dashboard/category-donut";
import { AccountBalances } from "@/components/dashboard/account-balances";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { InvestmentsPanel } from "@/components/dashboard/investments-panel";
import { GoalProgress } from "@/components/dashboard/goal-progress";
import { createClient } from "@/lib/supabase/server";
import { greetingPl, formatMonthYear } from "@/lib/format";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const now = new Date();
  const hour = now.getHours();
  const name = user?.email?.split("@")[0] ?? "Damian";

  return (
    <div className="space-y-6">
      {/* Nagłówek */}
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
          <span className="text-muted">Sty 2025 — </span>
          <span className="font-medium text-foreground">{formatMonthYear(now)}</span>
        </div>
      </div>

      {/* Cel */}
      <GoalProgress />

      {/* KPI */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Majątek netto"
          value="847 320 zł"
          sub="wszystkie aktywa − zobowiązania"
          icon={Wallet}
          trend={{ value: "+2,4%", positive: true }}
          accent="default"
        />
        <KpiCard
          label="Przychody w miesiącu"
          value="18 450 zł"
          sub="bez transferów wewnętrznych"
          icon={TrendingUp}
          trend={{ value: "+5,1%", positive: true }}
          accent="green"
        />
        <KpiCard
          label="Wydatki w miesiącu"
          value="12 870 zł"
          sub="wydatki konsumpcyjne"
          icon={TrendingDown}
          trend={{ value: "−3,2%", positive: true }}
          accent="red"
        />
        <KpiCard
          label="Stopa oszczędności"
          value="30,2%"
          sub="nadwyżka / przychody"
          icon={PiggyBank}
          trend={{ value: "+1,8 p.p.", positive: true }}
          accent="gold"
        />
      </div>

      {/* Wykresy */}
      <div className="grid gap-4 lg:grid-cols-2">
        <CashflowChart />
        <CategoryDonut />
      </div>

      {/* Dół */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <AccountBalances />
        </div>
        <div className="lg:col-span-2">
          <RecentTransactions />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <InvestmentsPanel />
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-6">
          <h3 className="font-semibold text-foreground">Waluty</h3>
          <p className="mt-1 text-xs text-muted">Ekspozycja na PLN, EUR, USD</p>
          <div className="mt-4 space-y-3">
            {[
              { code: "PLN", pct: 72, color: "#1e3a5f" },
              { code: "EUR", pct: 22, color: "#0d9488" },
              { code: "USD", pct: 6, color: "#3b82f6" },
            ].map((c) => (
              <div key={c.code}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium">{c.code}</span>
                  <span className="text-muted">{c.pct}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${c.pct}%`, background: c.color }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted">
            Po imporcie danych z Excela (22 442 transakcje) wszystkie liczby będą
            rzeczywiste i klikalne.
          </p>
        </div>
      </div>
    </div>
  );
}

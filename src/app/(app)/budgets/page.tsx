import { PageHeader } from "@/components/page-header";
import { BudgetsPanel } from "@/components/budgets/budgets-panel";
import { createClient } from "@/lib/supabase/server";
import { fetchBudgetsForMonth } from "@/lib/queries/budgets";
import { parseBudgetMonthParam } from "@/lib/budgets/month-nav";
import { formatMonthLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

interface BudgetsPageProps {
  searchParams: Promise<{ month?: string }>;
}

export default async function BudgetsPage({ searchParams }: BudgetsPageProps) {
  const { month: monthParam } = await searchParams;
  const { year, month } = parseBudgetMonthParam(monthParam);

  const supabase = await createClient();
  const [budgets, catsRes] = await Promise.all([
    fetchBudgetsForMonth(supabase, year, month),
    supabase.from("categories").select("id, name").is("deleted_at", null).order("name"),
  ]);

  if (catsRes.error) throw catsRes.error;

  const monthLabel = formatMonthLabel(`${year}-${String(month).padStart(2, "0")}`);

  return (
    <div>
      <PageHeader
        title="Budżety"
        description={`Limity miesięczne · ${monthLabel}`}
      />
      <BudgetsPanel
        budgets={budgets}
        categories={(catsRes.data ?? []) as { id: string; name: string }[]}
        year={year}
        month={month}
      />
    </div>
  );
}

import { CategoriesToolbar } from "@/components/categories/categories-toolbar";
import { CategoriesKpiGrid } from "@/components/categories/categories-kpi-grid";
import { CategoriesAnalyticsTable } from "@/components/categories/categories-analytics-table";
import { CategoriesTidyPanel } from "@/components/categories/categories-tidy-panel";
import type { CategoriesAnalyticsData } from "@/lib/queries/category-analytics";

interface CategoriesWorkspaceProps {
  data: CategoriesAnalyticsData;
  allCategories: { id: string; name: string }[];
  baseParams: Record<string, string | undefined>;
}

export function CategoriesWorkspace({
  data,
  allCategories,
  baseParams,
}: CategoriesWorkspaceProps) {
  return (
    <>
      <CategoriesToolbar
        periodLabel={data.period.label}
        periodPreset={data.period.preset}
        dateFrom={data.period.current.from}
        dateTo={data.period.current.to}
        tab={data.tab}
        showEmpty={data.showEmpty}
        search={data.search}
        baseParams={baseParams}
      />

      {data.tab !== "tidy" && (
        <CategoriesKpiGrid kpis={data.kpis} periodLabel={data.period.label} />
      )}

      {data.tab === "tidy" ? (
        <CategoriesTidyPanel data={data} allCategories={allCategories} />
      ) : (
        <CategoriesAnalyticsTable
          data={data}
          allCategories={allCategories}
          baseParams={baseParams}
        />
      )}
    </>
  );
}

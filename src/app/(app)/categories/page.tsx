import { PageHeader } from "@/components/page-header";
import { CategoriesTable } from "@/components/categories/categories-table";
import { createClient } from "@/lib/supabase/server";
import { fetchCategoriesList } from "@/lib/queries/categories";
import { formatMonthLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ month?: string }>;
}

export default async function CategoriesPage({ searchParams }: Props) {
  const params = await searchParams;
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth() + 1;

  if (params.month && /^\d{4}-\d{2}$/.test(params.month)) {
    const [y, m] = params.month.split("-").map(Number);
    year = y;
    month = m;
  }

  const supabase = await createClient();
  const items = await fetchCategoriesList(supabase, year, month);
  const monthLabel = formatMonthLabel(`${year}-${String(month).padStart(2, "0")}`);

  return (
    <div>
      <PageHeader
        title="Kategorie"
        description={`${items.length} kategorii · wydatki: ${monthLabel}`}
      />
      <CategoriesTable items={items} monthLabel={monthLabel} />
    </div>
  );
}

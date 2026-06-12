import { createClient } from "@/lib/supabase/server";
import { parseCategoriesPeriod } from "@/lib/categories/period";
import { fetchCategoriesAnalytics } from "@/lib/queries/category-analytics";
import { PageContainer } from "@/components/layout";
import { CategoriesWorkspace } from "@/components/categories/categories-workspace";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function CategoriesPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createClient();
  const period = parseCategoriesPeriod(params);

  const [data, catsRes] = await Promise.all([
    fetchCategoriesAnalytics(supabase, period, params),
    supabase.from("categories").select("id, name").is("deleted_at", null).order("name"),
  ]);

  if (catsRes.error) throw catsRes.error;

  const allCategories = (catsRes.data ?? []) as { id: string; name: string }[];

  return (
    <PageContainer>
      <CategoriesWorkspace
        data={data}
        allCategories={allCategories}
        baseParams={params}
      />
    </PageContainer>
  );
}

import type { CategoryAnalyticsRow } from "@/lib/queries/category-analytics";

export interface DuplicateGroup {
  normalizedName: string;
  categories: { id: string; name: string; txCount: number; totalPln: number }[];
}

export interface TidyUpIssues {
  duplicates: DuplicateGroup[];
  emptyCategories: CategoryAnalyticsRow[];
  uncategorizedExpense: { count: number; totalPln: number };
  uncategorizedIncome: { count: number; totalPln: number };
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function detectTidyUpIssues(
  rows: CategoryAnalyticsRow[],
  uncategorized: { tx_type: string; tx_count: number; total_pln: number }[]
): TidyUpIssues {
  const byNorm = new Map<string, DuplicateGroup["categories"]>();

  for (const row of rows) {
    const norm = normalizeName(row.name);
    const list = byNorm.get(norm) ?? [];
    list.push({
      id: row.id,
      name: row.name,
      txCount: row.txCount,
      totalPln: row.totalPln,
    });
    byNorm.set(norm, list);
  }

  const duplicates = [...byNorm.entries()]
    .filter(([, cats]) => cats.length > 1)
    .map(([normalizedName, categories]) => ({ normalizedName, categories }))
    .sort((a, b) => b.categories.length - a.categories.length);

  const emptyCategories = rows.filter((r) => r.txCount === 0);

  const uncatExp = uncategorized.find((u) => u.tx_type === "expense");
  const uncatInc = uncategorized.find((u) => u.tx_type === "income");

  return {
    duplicates,
    emptyCategories,
    uncategorizedExpense: {
      count: Number(uncatExp?.tx_count ?? 0),
      totalPln: Number(uncatExp?.total_pln ?? 0),
    },
    uncategorizedIncome: {
      count: Number(uncatInc?.tx_count ?? 0),
      totalPln: Number(uncatInc?.total_pln ?? 0),
    },
  };
}

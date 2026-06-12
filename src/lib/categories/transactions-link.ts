import type { CategoriesPeriod } from "@/lib/categories/period";

export function buildCategoryTransactionsUrl(opts: {
  categoryId: string;
  period: CategoriesPeriod;
  txType?: "expense" | "income";
  subcategoryId?: string;
}): string {
  const params = new URLSearchParams();
  params.set("category", opts.categoryId);
  if (opts.subcategoryId) params.set("subcategory", opts.subcategoryId);
  if (opts.txType) params.set("type", opts.txType);
  params.set("from", opts.period.current.from);
  params.set("to", opts.period.current.to);
  params.set("period", "custom");
  return `/transactions?${params.toString()}`;
}

import type { TransactionFilterState } from "@/lib/transactions/filter-state";
import { resolveDateRange } from "@/lib/transactions/filter-state";

export function rpcFilterParams(filters: TransactionFilterState) {
  const range = resolveDateRange(filters);
  return {
    p_date_from: range?.from ?? null,
    p_date_to: range?.to ?? null,
    p_type: filters.type === "all" ? null : filters.type,
    p_category_id: filters.categoryId ?? null,
    p_subcategory_id: filters.subcategoryId ?? null,
    p_account_id: filters.accountId ?? null,
    p_source_account_id: filters.sourceAccountId ?? null,
    p_target_account_id: filters.targetAccountId ?? null,
    p_search: filters.search?.trim() || null,
    p_currency: filters.currency || null,
    p_amount_min: filters.amountMin ?? null,
    p_amount_max: filters.amountMax ?? null,
    p_import_only: filters.importOnly ?? false,
    p_manual_only: filters.manualOnly ?? false,
    p_include_reconciled: filters.includeReconciled ?? false,
  };
}

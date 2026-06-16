import type { ServerSupabaseClient } from "@/lib/supabase/server";
import type { CategoryBreakdown } from "@/types/database";
import { splitTransactionFlow } from "@/lib/transactions/cashflow-amounts";
import {
  resolveDateRange,
  type TransactionFilterState,
} from "@/lib/transactions/filter-state";
import { rpcFilterParams } from "@/lib/transactions/rpc-filters";

type BalanceMode = "current" | "full";

export interface PeriodCashflowResult {
  income_pln: number;
  expense_pln: number;
  surplus_pln: number;
}

export interface FilteredCashflowSummary extends PeriodCashflowResult {
  tx_count: number;
  max_income: number;
  max_expense: number;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function accumulateNet(type: string, net: number, totals: { income: number; expense: number }) {
  const part = splitTransactionFlow(type, net);
  totals.income += part.income;
  totals.expense += part.expense;
}

async function getAnalysisStartDate(supabase: ServerSupabaseClient): Promise<string | null> {
  const { data, error } = await supabase
    .from("user_settings")
    .select("analysis_start_date")
    .maybeSingle();
  if (error) throw error;
  return (data as { analysis_start_date?: string | null } | null)?.analysis_start_date ?? null;
}

function clampFromToAnalysisStart(from: string, analysisStartDate: string | null, mode: BalanceMode) {
  if (mode === "full" || !analysisStartDate) return from;
  return analysisStartDate > from ? analysisStartDate : from;
}

async function loadEntriesByTxId(
  supabase: ServerSupabaseClient,
  ids: string[]
): Promise<Map<string, number>> {
  const netByTx = new Map<string, number>();
  if (!ids.length) return netByTx;

  const chunkSize = 200;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const { data: entries, error } = await supabase
      .from("transaction_entries")
      .select("transaction_id, amount_pln")
      .in("transaction_id", chunk);

    if (error) throw error;

    for (const e of (entries ?? []) as { transaction_id: string; amount_pln: number | null }[]) {
      const tid = e.transaction_id;
      const amt = Number(e.amount_pln ?? 0);
      netByTx.set(tid, (netByTx.get(tid) ?? 0) + amt);
    }
  }

  return netByTx;
}

async function fetchTransactionIdsPage(
  supabase: ServerSupabaseClient,
  filters: TransactionFilterState,
  offset: number,
  limit: number
): Promise<{ ids: string[]; total: number } | null> {
  const { data, error } = await supabase.rpc(
    "get_transaction_page_ids",
    {
      ...rpcFilterParams(filters),
      p_sort: filters.sort,
      p_sort_dir: filters.sortDir,
      p_limit: limit,
      p_offset: offset,
    } as never
  );

  if (error) return null;

  const rows = (data ?? []) as { id: string; total_count: number }[];
  if (!rows.length) return { ids: [], total: rows[0]?.total_count ?? 0 };

  return {
    ids: rows.map((r) => r.id),
    total: Number(rows[0]?.total_count ?? 0),
  };
}

async function fetchTransactionsByIds(
  supabase: ServerSupabaseClient,
  ids: string[]
): Promise<{ id: string; type: string; date: string }[]> {
  if (!ids.length) return [];

  const { data, error } = await supabase
    .from("transactions")
    .select("id, type, date")
    .in("id", ids)
    .in("type", ["income", "expense"]);

  if (error) throw error;
  return (data ?? []) as { id: string; type: string; date: string }[];
}

/** Refund-aware cashflow dla zakresu dat (dashboard, wykresy). */
export async function computeRefundAwareCashflow(
  supabase: ServerSupabaseClient,
  from: string,
  to: string,
  mode: BalanceMode = "current"
): Promise<PeriodCashflowResult> {
  const analysisStartDate = await getAnalysisStartDate(supabase);
  const clampedFrom = clampFromToAnalysisStart(from, analysisStartDate, mode);

  let income = 0;
  let expense = 0;
  const pageSize = 500;
  let offset = 0;

  while (true) {
    const { data: txPage, error: txError } = await supabase
      .from("transactions")
      .select("id, type, status, date, created_at")
      .is("deleted_at", null)
      .in("type", ["income", "expense"])
      .neq("status", "needs_review")
      .gte("date", clampedFrom)
      .lte("date", to)
      .order("date", { ascending: true })
      .order("created_at", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (txError) throw txError;

    const txs = (txPage ?? []) as { id: string; type: string }[];
    if (!txs.length) break;

    const netByTx = await loadEntriesByTxId(
      supabase,
      txs.map((t) => t.id)
    );

    const totals = { income: 0, expense: 0 };
    for (const t of txs) {
      accumulateNet(t.type, netByTx.get(t.id) ?? 0, totals);
    }
    income += totals.income;
    expense += totals.expense;

    if (txs.length < pageSize) break;
    offset += pageSize;
  }

  return {
    income_pln: round2(income),
    expense_pln: round2(expense),
    surplus_pln: round2(income - expense),
  };
}

/** Breakdown kategorii — ta sama logika co refund-aware cashflow. */
export async function computeRefundAwareCategoryBreakdown(
  supabase: ServerSupabaseClient,
  from: string,
  to: string,
  mode: BalanceMode = "current",
  section: "income" | "expense"
): Promise<CategoryBreakdown[]> {
  const analysisStartDate = await getAnalysisStartDate(supabase);
  const clampedFrom = clampFromToAnalysisStart(from, analysisStartDate, mode);

  const { data: cats, error: catsError } = await supabase
    .from("categories")
    .select("id, name")
    .is("deleted_at", null);
  if (catsError) throw catsError;

  const catName = new Map(
    ((cats ?? []) as { id: string; name: string }[]).map((c) => [c.id, c.name])
  );

  const byCat = new Map<string | null, { total: number; count: number }>();

  const add = (categoryId: string | null, amount: number) => {
    if (amount === 0) return;
    const row = byCat.get(categoryId) ?? { total: 0, count: 0 };
    row.total += amount;
    row.count += 1;
    byCat.set(categoryId, row);
  };

  const pageSize = 500;
  let offset = 0;

  while (true) {
    const { data: txPage, error: txError } = await supabase
      .from("transactions")
      .select("id, type, category_id, status, date, created_at")
      .is("deleted_at", null)
      .in("type", ["income", "expense"])
      .neq("status", "needs_review")
      .gte("date", clampedFrom)
      .lte("date", to)
      .order("date", { ascending: true })
      .order("created_at", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (txError) throw txError;

    const txs = (txPage ?? []) as { id: string; type: string; category_id: string | null }[];
    if (!txs.length) break;

    const netByTx = await loadEntriesByTxId(
      supabase,
      txs.map((t) => t.id)
    );

    for (const t of txs) {
      const part = splitTransactionFlow(t.type, netByTx.get(t.id) ?? 0);
      if (section === "income") {
        if (part.income !== 0) add(t.category_id, part.income);
      } else if (part.expense !== 0) {
        add(t.category_id, part.expense);
      }
    }

    if (txs.length < pageSize) break;
    offset += pageSize;
  }

  return [...byCat.entries()]
    .map(([category_id, row]) => ({
      category_id,
      category_name: category_id ? (catName.get(category_id) ?? null) : "Bez kategorii",
      total_pln: round2(row.total),
      tx_count: row.count,
    }))
    .filter((r) => r.total_pln !== 0)
    .sort((a, b) => b.total_pln - a.total_pln);
}

/** Refund-aware podsumowanie z filtrami listy transakcji. */
export async function computeFilteredCashflowSummary(
  supabase: ServerSupabaseClient,
  filters: TransactionFilterState
): Promise<FilteredCashflowSummary> {
  const range = resolveDateRange(filters);
  const pageSize = 500;
  let offset = 0;
  let totalCount = 0;

  let income = 0;
  let expense = 0;
  let maxIncome = 0;
  let maxExpense = 0;
  let txCount = 0;

  while (true) {
    const page = await fetchTransactionIdsPage(supabase, filters, offset, pageSize);
    if (!page) {
      return computeFilteredCashflowSummaryFallback(supabase, filters, range);
    }

    if (offset === 0) totalCount = page.total;
    if (!page.ids.length) break;

    const txs = await fetchTransactionsByIds(supabase, page.ids);
    const netByTx = await loadEntriesByTxId(
      supabase,
      txs.map((t) => t.id)
    );

    for (const t of txs) {
      const net = netByTx.get(t.id) ?? 0;
      const part = splitTransactionFlow(t.type, net);
      income += part.income;
      expense += part.expense;
      if (part.income > maxIncome) maxIncome = part.income;
      if (part.expense > maxExpense) maxExpense = part.expense;
      txCount += 1;
    }

    if (page.ids.length < pageSize) break;
    offset += pageSize;
  }

  return {
    income_pln: round2(income),
    expense_pln: round2(expense),
    surplus_pln: round2(income - expense),
    tx_count: totalCount || txCount,
    max_income: round2(maxIncome),
    max_expense: round2(maxExpense),
  };
}

async function computeFilteredCashflowSummaryFallback(
  supabase: ServerSupabaseClient,
  filters: TransactionFilterState,
  range: { from: string; to: string }
): Promise<FilteredCashflowSummary> {
  const cf = await computeRefundAwareCashflow(supabase, range.from, range.to, "current");
  return {
    ...cf,
    tx_count: 0,
    max_income: 0,
    max_expense: 0,
  };
}

export interface DailyCashflowRow {
  day: string;
  income_pln: number;
  expense_pln: number;
  tx_count: number;
}

/** Dzienne podsumowanie (widok miesięczny transakcji) — refund-aware. */
export async function computeFilteredDailyBreakdown(
  supabase: ServerSupabaseClient,
  filters: TransactionFilterState
): Promise<DailyCashflowRow[]> {
  const pageSize = 500;
  let offset = 0;
  const byDay = new Map<string, { income: number; expense: number; txCount: number }>();

  while (true) {
    const page = await fetchTransactionIdsPage(supabase, filters, offset, pageSize);
    if (!page || !page.ids.length) break;

    const txs = await fetchTransactionsByIds(supabase, page.ids);
    const netByTx = await loadEntriesByTxId(
      supabase,
      txs.map((t) => t.id)
    );

    for (const t of txs) {
      const net = netByTx.get(t.id) ?? 0;
      const part = splitTransactionFlow(t.type, net);
      const day = t.date.slice(0, 10);
      const row = byDay.get(day) ?? { income: 0, expense: 0, txCount: 0 };
      row.income += part.income;
      row.expense += part.expense;
      row.txCount += 1;
      byDay.set(day, row);
    }

    if (page.ids.length < pageSize) break;
    offset += pageSize;
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([day, row]) => ({
      day,
      income_pln: round2(row.income),
      expense_pln: round2(row.expense),
      tx_count: row.txCount,
    }));
}

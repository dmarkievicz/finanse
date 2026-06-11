import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { parseTransactionFilters } from "@/lib/transactions/filter-state";
import {
  fetchAllTransactionIdsForExport,
  fetchTransactionsByIds,
} from "@/lib/queries/transactions";

export async function GET(request: Request) {
  try {
    const auth = await requireUser();
    if (auth instanceof NextResponse) return auth;
    const { user, supabase } = auth;
    const limited = checkRateLimit(`export-tx:${user.id}`, 30, 3600);
    if (!limited.ok) {
      return rateLimitResponse(limited.retryAfterSec ?? 60);
    }

    const url = new URL(request.url);
    const params: Record<string, string | undefined> = {};
    url.searchParams.forEach((v, k) => {
      params[k] = v;
    });

    const filters = parseTransactionFilters(params);
    const ids = await fetchAllTransactionIdsForExport(supabase, filters);
    const items = await fetchTransactionsByIds(supabase, ids);

    const header = [
      "id",
      "date",
      "type",
      "category",
      "subcategory",
      "source_account",
      "target_account",
      "details",
      "amount_original",
      "currency",
      "exchange_rate",
      "amount_pln",
    ].join(",");

    const lines = items.map((t) => {
      const cols = [
        t.id,
        t.date,
        t.type,
        t.category ?? "",
        t.subcategory ?? "",
        t.sourceAccount ?? "",
        t.targetAccount ?? "",
        (t.details ?? "").replace(/"/g, '""'),
        t.originalAmount ?? "",
        t.currency ?? "",
        t.exchangeRate ?? "",
        t.amountPln ?? "",
      ];
      return cols.map((c) => `"${String(c)}"`).join(",");
    });

    const csv = [header, ...lines].join("\n");
    const filename = `transakcje-${filters.period}-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Błąd eksportu";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

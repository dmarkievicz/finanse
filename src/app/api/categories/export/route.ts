import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseCategoriesPeriod } from "@/lib/categories/period";
import { fetchCategoriesAnalytics } from "@/lib/queries/category-analytics";
import { categoryTypeLabel } from "@/lib/categories/labels";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nie zalogowano" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());
    const period = parseCategoriesPeriod(params);
    const data = await fetchCategoriesAnalytics(supabase, period, params);

    const header = [
      "Kategoria",
      "Typ",
      "Transakcje",
      "Suma PLN",
      "Udział %",
      "Zmiana PLN",
      "Budżet PLN",
    ];
    const lines = data.rows.map((r) =>
      [
        `"${r.name.replace(/"/g, '""')}"`,
        categoryTypeLabel(r.type),
        r.txCount,
        r.totalPln.toFixed(2),
        r.sharePct.toFixed(1),
        r.trendDelta?.toFixed(2) ?? "",
        r.budgetLimit?.toFixed(2) ?? "",
      ].join(";")
    );

    const bom = "\uFEFF";
    const csv = bom + [header.join(";"), ...lines].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="kategorie-${period.monthKey}.csv"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Błąd eksportu";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchAccountDetail } from "@/lib/queries/accounts";
import { fetchTransactions } from "@/lib/queries/transactions";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const page = Number(new URL(request.url).searchParams.get("page") ?? "1");

  const supabase = await createClient();
  const account = await fetchAccountDetail(supabase, id);
  if (!account) {
    return NextResponse.json({ error: "Nie znaleziono konta" }, { status: 404 });
  }

  const data = await fetchTransactions(supabase, {
    filters: {
      type: "all",
      period: "custom",
      accountId: id,
      accountName: account.name,
      view: "list",
      sort: "date",
      sortDir: "desc",
      page,
      includeReconciled: true,
    },
  });

  return NextResponse.json(data);
}

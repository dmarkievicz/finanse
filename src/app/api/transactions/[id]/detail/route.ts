import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchTransactionDetail } from "@/lib/queries/transaction-detail";
import { fetchAuditForTransaction } from "@/lib/queries/audit";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nie zalogowano" }, { status: 401 });
    }

    const detail = await fetchTransactionDetail(supabase, id);
    if (!detail) {
      return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
    }

    const audit = await fetchAuditForTransaction(
      supabase,
      id,
      detail.entries.map((e) => e.id)
    );

    return NextResponse.json({ ...detail, audit });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Błąd";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

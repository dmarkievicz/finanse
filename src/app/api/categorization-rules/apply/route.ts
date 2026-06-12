import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { applyCategorizationRulesToTransactions } from "@/lib/categorization/apply-rules-to-transactions";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nie zalogowano" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      only_uncategorized?: boolean;
    };

    const result = await applyCategorizationRulesToTransactions(supabase, user.id, {
      onlyUncategorized: body.only_uncategorized ?? true,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Błąd stosowania reguł";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

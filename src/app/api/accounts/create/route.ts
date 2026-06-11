import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildAccountUpdate } from "@/lib/accounts/patch-fields";
import { ACTIVE_ACCOUNT_DEFAULTS } from "@/lib/import/account-defaults";
import type { AccountType } from "@/types/database";
import { ACCOUNT_TYPE_ORDER } from "@/lib/queries/accounts";

interface CreateBody {
  name: string;
  account_number?: string | null;
  account_type: AccountType;
  default_currency?: string;
  notes?: string | null;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nie zalogowano" }, { status: 401 });
    }

    const body = (await request.json()) as CreateBody;
    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ error: "Podaj nazwę konta" }, { status: 400 });
    }
    if (!ACCOUNT_TYPE_ORDER.includes(body.account_type)) {
      return NextResponse.json({ error: "Niepoprawny typ konta" }, { status: 400 });
    }

    const currencyPatch = buildAccountUpdate({
      default_currency: body.default_currency ?? "PLN",
    });
    if (currencyPatch.error) {
      return NextResponse.json({ error: currencyPatch.error }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("accounts")
      .insert({
        user_id: user.id,
        name,
        account_number: body.account_number?.trim() || null,
        account_type: body.account_type,
        default_currency: currencyPatch.fields.default_currency,
        notes: body.notes?.trim() || null,
        ...ACTIVE_ACCOUNT_DEFAULTS,
      } as never)
      .select("id, name, account_number, account_type, default_currency")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Konto o tej nazwie już istnieje" }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ ok: true, account: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Błąd tworzenia konta";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

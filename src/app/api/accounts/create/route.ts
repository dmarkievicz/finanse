import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_ACCOUNT_DEFAULTS } from "@/lib/import/account-defaults";
import type { AccountType } from "@/types/database";

const VALID_TYPES: AccountType[] = [
  "bank",
  "cash",
  "broker",
  "deposit",
  "investment",
  "loan",
  "real_estate",
  "other",
];

interface CreateBody {
  name: string;
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
    if (!VALID_TYPES.includes(body.account_type)) {
      return NextResponse.json({ error: "Niepoprawny typ konta" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("accounts")
      .insert({
        user_id: user.id,
        name,
        account_type: body.account_type,
        default_currency: body.default_currency?.trim() || "PLN",
        notes: body.notes?.trim() || null,
        ...ACTIVE_ACCOUNT_DEFAULTS,
      } as never)
      .select("id, name, account_type, default_currency")
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

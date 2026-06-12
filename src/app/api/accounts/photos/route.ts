import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchAccountPhotoUrls } from "@/lib/queries/account-photos";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nie zalogowano" }, { status: 401 });

    const idsParam = new URL(request.url).searchParams.get("ids") ?? "";
    const ids = idsParam.split(",").map((s) => s.trim()).filter(Boolean);
    if (!ids.length) {
      return NextResponse.json({ urls: {} });
    }

    const map = await fetchAccountPhotoUrls(supabase, ids);
    const urls = Object.fromEntries(map.entries());
    return NextResponse.json({ urls });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Błąd";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

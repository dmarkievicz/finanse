import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { clearUserImportData } from "@/lib/import/clear-data";
import { requireUser, isAuthError } from "@/lib/api/auth";
import { parseJsonBody } from "@/lib/api/parse-json";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";

export const maxDuration = 120;

interface ClearBody {
  confirm?: string;
  backup_acknowledged?: boolean;
}

export async function POST(request: Request) {
  try {
    const auth = await requireUser();
    if (isAuthError(auth)) return auth;
    const { user } = auth;

    const limited = checkRateLimit(`clear:${user.id}`, 3, 3600);
    if (!limited.ok) {
      return rateLimitResponse(limited.retryAfterSec ?? 60);
    }

    const parsed = await parseJsonBody<ClearBody>(request, 4096);
    if (parsed instanceof NextResponse) return parsed;
    const body = parsed.data;

    if (body.confirm !== "WYCZYŚĆ") {
      return NextResponse.json(
        { error: 'Wpisz dokładnie "WYCZYŚĆ" aby potwierdzić' },
        { status: 400 }
      );
    }

    if (!body.backup_acknowledged) {
      return NextResponse.json(
        { error: "Potwierdź pobranie kopii zapasowej przed czyszczeniem" },
        { status: 400 }
      );
    }

    const admin = createServiceClient();

    await admin.rpc("log_system_audit", {
      p_user_id: user.id,
      p_event: "clear_import_data_requested",
      p_details: { backup_acknowledged: true },
    } as never);

    const result = await clearUserImportData(admin, user.id);

    await admin.rpc("log_system_audit", {
      p_user_id: user.id,
      p_event: "clear_import_data_completed",
      p_details: result,
    } as never);

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Błąd czyszczenia";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

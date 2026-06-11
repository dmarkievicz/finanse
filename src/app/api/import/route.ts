import { NextResponse } from "next/server";
import { requireUser, isAuthError } from "@/lib/api/auth";

/**
 * Import Excel wyłączony w aplikacji web — użyj CLI (bez SERVICE_ROLE na serwerze Next).
 * npm run import:excel
 */
export async function POST() {
  const auth = await requireUser();
  if (isAuthError(auth)) return auth;

  return NextResponse.json(
    {
      error:
        "Import przez przeglądarkę jest wyłączony ze względów bezpieczeństwa. Uruchom lokalnie: npm run import:excel",
      cli: "npm run import:excel",
    },
    { status: 503 }
  );
}

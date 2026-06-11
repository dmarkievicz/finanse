import { NextResponse } from "next/server";
import { requireUser, isAuthError } from "@/lib/api/auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import {
  auditLogToCsv,
  buildExportBundle,
  bundleToZipEntries,
  transactionsToCsv,
} from "@/lib/export/build-export";
import { buildZipBuffer } from "@/lib/export/build-zip";

export const maxDuration = 120;

export async function GET(request: Request) {
  try {
    const auth = await requireUser();
    if (isAuthError(auth)) return auth;
    const { user, supabase } = auth;

    const limited = checkRateLimit(`export:${user.id}`, 20, 3600);
    if (!limited.ok) {
      return rateLimitResponse(limited.retryAfterSec ?? 60);
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") ?? "json";
    const bundle = await buildExportBundle(supabase, user.id);
    const date = new Date().toISOString().slice(0, 10);

    if (format === "csv") {
      const csv = transactionsToCsv(
        bundle.transactions as Record<string, unknown>[],
        bundle.transaction_entries as Record<string, unknown>[]
      );
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="finanse-transakcje-${date}.csv"`,
        },
      });
    }

    if (format === "csv-audit") {
      const csv = auditLogToCsv(bundle.audit_log as Record<string, unknown>[]);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="finanse-audit-${date}.csv"`,
        },
      });
    }

    if (format === "zip") {
      const zipFiles = bundleToZipEntries(bundle);
      zipFiles.push({
        name: "transactions.csv",
        content: transactionsToCsv(
          bundle.transactions as Record<string, unknown>[],
          bundle.transaction_entries as Record<string, unknown>[]
        ),
      });
      zipFiles.push({
        name: "audit_log.csv",
        content: auditLogToCsv(bundle.audit_log as Record<string, unknown>[]),
      });

      const buffer = buildZipBuffer(zipFiles);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="finanse-backup-${date}.zip"`,
        },
      });
    }

    return new NextResponse(JSON.stringify(bundle, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="finanse-backup-${date}.json"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Błąd eksportu";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

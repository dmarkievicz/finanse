import { NextResponse } from "next/server";
import { requireUser, isAuthError } from "@/lib/api/auth";
import { WEB_IMPORT_MAX_BYTES } from "@/lib/import/constants";
import { previewImportFromBuffer } from "@/lib/import/engine";

export async function POST(request: Request) {
  try {
    const auth = await requireUser();
    if (isAuthError(auth)) return auth;

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Brak pliku (pole file)" }, { status: 400 });
    }

    if (!file.name.match(/\.xlsx?$/i)) {
      return NextResponse.json({ error: "Dozwolony format: .xlsx" }, { status: 400 });
    }

    if (file.size > WEB_IMPORT_MAX_BYTES) {
      return NextResponse.json(
        { error: `Plik za duży (max ${Math.round(WEB_IMPORT_MAX_BYTES / 1024 / 1024)} MB)` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const preview = await previewImportFromBuffer(
      auth.supabase,
      auth.user.id,
      buffer,
      file.name
    );

    return NextResponse.json(preview);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Błąd podglądu importu";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

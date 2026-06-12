import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { bullionPhotoPath } from "@/lib/gold/bullion-metadata";

const BUCKET = "bullion-photos";
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: instrumentId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nie zalogowano" }, { status: 401 });

    const { data: inst, error: instErr } = await supabase
      .from("instruments")
      .select("id, metadata, instrument_type")
      .eq("id", instrumentId)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .single();

    if (instErr || !inst) {
      return NextResponse.json({ error: "Nie znaleziono instrumentu" }, { status: 404 });
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Brak pliku (pole file)" }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Dozwolone są tylko obrazy" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Maks. rozmiar pliku: 5 MB" }, { status: 400 });
    }

    const storagePath = bullionPhotoPath(user.id, instrumentId, file.name);
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadErr) throw uploadErr;

    const row = inst as { metadata: Record<string, unknown> };
    const metadata = {
      ...(row.metadata ?? {}),
      photo_storage_path: storagePath,
    };

    const { error: patchErr } = await supabase
      .from("instruments")
      .update({ metadata } as never)
      .eq("id", instrumentId)
      .eq("user_id", user.id);

    if (patchErr) throw patchErr;

    return NextResponse.json({ ok: true, path: storagePath });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Błąd uploadu";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: instrumentId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nie zalogowano" }, { status: 401 });

    const { data: inst, error: instErr } = await supabase
      .from("instruments")
      .select("metadata")
      .eq("id", instrumentId)
      .eq("user_id", user.id)
      .single();

    if (instErr || !inst) {
      return NextResponse.json({ error: "Nie znaleziono instrumentu" }, { status: 404 });
    }

    const path = (inst as { metadata?: { photo_storage_path?: string } }).metadata
      ?.photo_storage_path;
    if (!path) {
      return NextResponse.json({ url: null });
    }

    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
    if (error) throw error;

    return NextResponse.json({ url: data.signedUrl, path });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Błąd";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

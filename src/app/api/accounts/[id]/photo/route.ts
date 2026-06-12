import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { accountCardPhotoPath, parseAccountMetadata } from "@/lib/accounts/account-metadata";

const BUCKET = "account-photos";
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: accountId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nie zalogowano" }, { status: 401 });

    const { data: account, error: accErr } = await supabase
      .from("accounts")
      .select("id, metadata")
      .eq("id", accountId)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .single();

    if (accErr || !account) {
      return NextResponse.json({ error: "Nie znaleziono konta" }, { status: 404 });
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

    const storagePath = accountCardPhotoPath(user.id, accountId, file.name);
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadErr) throw uploadErr;

    const row = account as { metadata: Record<string, unknown> | null };
    const metadata = {
      ...(row.metadata ?? {}),
      card_photo_storage_path: storagePath,
    };

    const { error: patchErr } = await supabase
      .from("accounts")
      .update({ metadata } as never)
      .eq("id", accountId)
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
    const { id: accountId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nie zalogowano" }, { status: 401 });

    const { data: account, error: accErr } = await supabase
      .from("accounts")
      .select("metadata")
      .eq("id", accountId)
      .eq("user_id", user.id)
      .single();

    if (accErr || !account) {
      return NextResponse.json({ error: "Nie znaleziono konta" }, { status: 404 });
    }

    const path = parseAccountMetadata(
      (account as { metadata?: Record<string, unknown> }).metadata
    ).card_photo_storage_path;

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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: accountId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nie zalogowano" }, { status: 401 });

    const { data: account, error: accErr } = await supabase
      .from("accounts")
      .select("metadata")
      .eq("id", accountId)
      .eq("user_id", user.id)
      .single();

    if (accErr || !account) {
      return NextResponse.json({ error: "Nie znaleziono konta" }, { status: 404 });
    }

    const meta = parseAccountMetadata(
      (account as { metadata?: Record<string, unknown> }).metadata
    );
    const path = meta.card_photo_storage_path;

    if (path) {
      await supabase.storage.from(BUCKET).remove([path]);
    }

    const metadata = { ...((account as { metadata?: Record<string, unknown> }).metadata ?? {}) };
    delete metadata.card_photo_storage_path;

    const { error: patchErr } = await supabase
      .from("accounts")
      .update({ metadata } as never)
      .eq("id", accountId)
      .eq("user_id", user.id);

    if (patchErr) throw patchErr;

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Błąd";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

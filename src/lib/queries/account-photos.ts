import type { ServerSupabaseClient } from "@/lib/supabase/server";
import { parseAccountMetadata } from "@/lib/accounts/account-metadata";

const BUCKET = "account-photos";
const SIGNED_TTL = 3600;

export async function fetchAccountPhotoUrls(
  supabase: ServerSupabaseClient,
  accountIds: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (accountIds.length === 0) return map;

  const { data, error } = await supabase
    .from("accounts")
    .select("id, metadata")
    .in("id", accountIds);

  if (error) {
    if (/metadata/i.test(error.message ?? "")) return map;
    throw error;
  }

  const paths: { id: string; path: string }[] = [];
  for (const row of data ?? []) {
    const r = row as { id: string; metadata: Record<string, unknown> | null };
    const path = parseAccountMetadata(r.metadata).card_photo_storage_path;
    if (path) paths.push({ id: r.id, path });
  }

  await Promise.all(
    paths.map(async ({ id, path }) => {
      const { data: signed, error: signErr } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, SIGNED_TTL);
      if (!signErr && signed?.signedUrl) {
        map.set(id, signed.signedUrl);
      }
    })
  );

  return map;
}

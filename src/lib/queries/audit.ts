import type { ServerSupabaseClient } from "@/lib/supabase/server";

export interface AuditLogRow {
  id: string;
  table_name: string;
  record_id: string;
  action: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
}

export async function fetchAuditForTransaction(
  supabase: ServerSupabaseClient,
  transactionId: string,
  entryIds: string[]
): Promise<AuditLogRow[]> {
  const queries = [
    supabase
      .from("audit_log")
      .select("id, table_name, record_id, action, old_data, new_data, created_at")
      .eq("table_name", "transactions")
      .eq("record_id", transactionId)
      .order("created_at", { ascending: false })
      .limit(50),
  ];

  if (entryIds.length > 0) {
    queries.push(
      supabase
        .from("audit_log")
        .select("id, table_name, record_id, action, old_data, new_data, created_at")
        .eq("table_name", "transaction_entries")
        .in("record_id", entryIds)
        .order("created_at", { ascending: false })
        .limit(50)
    );
  }

  const results = await Promise.all(queries);
  for (const r of results) {
    if (r.error) throw r.error;
  }

  const merged = results.flatMap((r) => (r.data ?? []) as AuditLogRow[]);
  merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const seen = new Set<string>();
  return merged.filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}

export async function fetchRecentAudit(
  supabase: ServerSupabaseClient,
  limit = 100
): Promise<AuditLogRow[]> {
  const { data, error } = await supabase
    .from("audit_log")
    .select("id, table_name, record_id, action, old_data, new_data, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as AuditLogRow[];
}

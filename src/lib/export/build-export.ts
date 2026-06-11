import type { ServerSupabaseClient } from "@/lib/supabase/server";

export interface ExportBundle {
  exported_at: string;
  version: string;
  accounts: unknown[];
  categories: unknown[];
  subcategories: unknown[];
  transactions: unknown[];
  transaction_entries: unknown[];
  imports: unknown[];
  import_rows: unknown[];
  audit_log: unknown[];
  goals: unknown[];
  user_settings: unknown[];
  budgets: unknown[];
  categorization_rules: unknown[];
  instruments: unknown[];
  investment_transactions: unknown[];
  instrument_prices: unknown[];
}

async function fetchAllRows(
  supabase: ServerSupabaseClient,
  table: string,
  userId: string,
  softDelete = false
): Promise<unknown[]> {
  const pageSize = 1000;
  const all: unknown[] = [];
  let from = 0;

  while (true) {
    let query = supabase.from(table).select("*").eq("user_id", userId);
    if (softDelete) {
      query = query.is("deleted_at", null);
    }
    const { data, error } = await query.range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data?.length) break;
    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return all;
}

export async function buildExportBundle(
  supabase: ServerSupabaseClient,
  userId: string
): Promise<ExportBundle> {
  const [
    accounts,
    categories,
    subcategories,
    transactions,
    transaction_entries,
    imports,
    import_rows,
    audit_log,
    goals,
    user_settings,
    budgets,
    categorization_rules,
    instruments,
    investment_transactions,
    instrument_prices,
  ] = await Promise.all([
    fetchAllRows(supabase, "accounts", userId, true),
    fetchAllRows(supabase, "categories", userId, true),
    fetchAllRows(supabase, "subcategories", userId),
    fetchAllRows(supabase, "transactions", userId, true),
    fetchAllRows(supabase, "transaction_entries", userId),
    fetchAllRows(supabase, "imports", userId),
    fetchAllRows(supabase, "import_rows", userId),
    fetchAllRows(supabase, "audit_log", userId),
    fetchAllRows(supabase, "goals", userId),
    fetchAllRows(supabase, "user_settings", userId),
    fetchAllRows(supabase, "budgets", userId),
    fetchAllRows(supabase, "categorization_rules", userId),
    fetchAllRows(supabase, "instruments", userId, true),
    fetchAllRows(supabase, "investment_transactions", userId, true),
    fetchAllRows(supabase, "instrument_prices", userId),
  ]);

  return {
    exported_at: new Date().toISOString(),
    version: "2.0",
    accounts,
    categories,
    subcategories,
    transactions,
    transaction_entries,
    imports,
    import_rows,
    audit_log,
    goals,
    user_settings,
    budgets,
    categorization_rules,
    instruments,
    investment_transactions,
    instrument_prices,
  };
}

export function bundleToZipEntries(bundle: ExportBundle): { name: string; content: string }[] {
  const readme = `Finanse Damian — backup ${bundle.exported_at}
Wersja formatu: ${bundle.version}

Pliki JSON można otworzyć w edytorze tekstu lub zaimportować przy odtwarzaniu.
`;

  const files: { name: string; content: string }[] = [
    { name: "README.txt", content: readme },
    {
      name: "manifest.json",
      content: JSON.stringify(
        { exported_at: bundle.exported_at, version: bundle.version },
        null,
        2
      ),
    },
  ];

  const tables: (keyof ExportBundle)[] = [
    "accounts",
    "categories",
    "subcategories",
    "transactions",
    "transaction_entries",
    "imports",
    "import_rows",
    "audit_log",
    "goals",
    "user_settings",
    "budgets",
    "categorization_rules",
    "instruments",
    "investment_transactions",
    "instrument_prices",
  ];

  for (const key of tables) {
    const data = bundle[key];
    if (Array.isArray(data)) {
      files.push({ name: `${key}.json`, content: JSON.stringify(data, null, 2) });
    }
  }

  return files;
}

export function transactionsToCsv(
  transactions: Record<string, unknown>[],
  entries: Record<string, unknown>[]
): string {
  const entriesByTx = new Map<string, Record<string, unknown>[]>();
  for (const e of entries) {
    const tid = String(e.transaction_id);
    if (!entriesByTx.has(tid)) entriesByTx.set(tid, []);
    entriesByTx.get(tid)!.push(e);
  }

  const header = "id,date,type,status,details,amount_pln,account_ids\n";
  const rows = transactions.map((t) => {
    const txEntries = entriesByTx.get(String(t.id)) ?? [];
    const amountPln = txEntries.reduce((s, e) => s + Number(e.amount_pln ?? 0), 0);
    const accountIds = txEntries.map((e) => e.account_id).join("|");
    const escape = (v: unknown) => {
      const s = String(v ?? "");
      return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    return [t.id, t.date, t.type, t.status, escape(t.details), amountPln.toFixed(2), accountIds].join(
      ","
    );
  });

  return header + rows.join("\n");
}

export function auditLogToCsv(rows: Record<string, unknown>[]): string {
  const header = "id,created_at,table_name,action,record_id\n";
  const escape = (v: unknown) => {
    const s = String(v ?? "");
    return s.includes(",") ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return (
    header +
    rows
      .map((r) =>
        [r.id, r.created_at, r.table_name, r.action, r.record_id].map(escape).join(",")
      )
      .join("\n")
  );
}

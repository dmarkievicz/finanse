import { createHash } from "crypto";
import readXlsxFile from "read-excel-file/node";
import type { SupabaseClient } from "@supabase/supabase-js";
import { inferAccountTypeFromName } from "@/lib/accounts/classification";
import {
  matchCategoryFromRules,
  type CategorizationRule,
} from "@/lib/categorization/match-rule";
import { loadActiveCategorizationRules } from "@/lib/categorization/load-rules";
import type { ServerSupabaseClient } from "@/lib/supabase/server";
import { IMPORTED_ACCOUNT_DEFAULTS } from "@/lib/import/account-defaults";
import { rpcImportTransactionBatch, type ImportBatchItem } from "@/lib/import/batch-rpc";

const BATCH_SIZE = 500;
const CASH_ACCOUNT = "Gotówka PLN";

const TYPE_MAP: Record<string, string> = {
  expenses: "expense",
  income: "income",
  transfer: "transfer",
  exchange: "exchange",
  adjustment: "adjustment",
  przewalutowanie: "exchange",
  korekta: "adjustment",
};

export interface ImportReport {
  import_id: string;
  filename: string;
  total_rows: number;
  imported: number;
  skipped_duplicates: number;
  errors: number;
  warnings: number;
  needs_review: number;
}

function normalizeKey(key: string) {
  return key.trim().toLowerCase().replace(/\s+/g, " ");
}

function getField(row: Record<string, unknown>, ...names: string[]) {
  for (const [key, val] of Object.entries(row)) {
    const nk = normalizeKey(key);
    for (const name of names) {
      if (nk === normalizeKey(name)) return val ?? "";
    }
  }
  return "";
}

function asString(val: unknown) {
  if (val == null) return "";
  return String(val).trim();
}

function parseNumber(val: unknown) {
  if (val === "" || val == null) return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

function excelDateToISO(val: unknown): string | null {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  if (typeof val === "number") {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(epoch.getTime() + val * 86400000);
    return d.toISOString().slice(0, 10);
  }
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}

function normalizeAccount(name: string) {
  if (!name) return "";
  const lower = name.trim().toLowerCase();
  const canonical: Record<string, string> = {
    "portfel pln": "Portfel PLN",
    portfel: "Portfel PLN",
    "portfel euro": "Portfel EURO",
    "permanent euro": "Permanent EURO",
    "pożyczone [od]": "Pożyczone [od]",
    "pożyczone [do]": "Pożyczone [do]",
    mbank: "mBank PLN",
  };
  return canonical[lower] || name.trim();
}

function normalizeRow(raw: Record<string, unknown>, rowNumber: number) {
  const amount = parseNumber(getField(raw, "amount", " Amount "));
  const rate = parseNumber(getField(raw, "exchange rate", " Exchange Rate ")) ?? 1;
  const currencyRaw = asString(getField(raw, "currency of amount", "currency")).toUpperCase();
  const currency =
    !currencyRaw ? "PLN" : currencyRaw === "EURO" || currencyRaw === "EUR" ? "EUR" : currencyRaw;
  const type = asString(getField(raw, "type"));
  return {
    row_number: rowNumber,
    raw_data: raw,
    date: excelDateToISO(getField(raw, "date")),
    type,
    type_lower: type.toLowerCase(),
    category: asString(getField(raw, "category")),
    subcategory: asString(getField(raw, "subcategory")),
    amount,
    currency,
    source_account: normalizeAccount(asString(getField(raw, "source account"))),
    target_account: normalizeAccount(asString(getField(raw, "target account"))),
    exchange_rate: rate,
    details: asString(getField(raw, "details")),
  };
}

function computeHash(row: ReturnType<typeof normalizeRow>) {
  const norm = (v: unknown) => asString(v).toLowerCase().replace(/\s+/g, " ").trim();
  const payload = [row.date, row.type, row.amount, row.currency, row.source_account, row.target_account, row.details]
    .map(norm)
    .join("|");
  return createHash("sha256").update(payload).digest("hex");
}

function validateRow(row: ReturnType<typeof normalizeRow>) {
  const issues: { code: string; message: string }[] = [];
  const warnings: { code: string; message: string }[] = [];
  const txType = TYPE_MAP[row.type_lower];

  if (!row.date) issues.push({ code: "E001", message: "Brak daty" });
  if (!row.type) issues.push({ code: "E003", message: "Brak typu" });
  if (row.type && !txType) issues.push({ code: "E004", message: `Nieznany typ: ${row.type}` });
  if (row.amount === null) issues.push({ code: "E005", message: "Brak kwoty" });
  if (row.amount === 0) issues.push({ code: "E006", message: "Kwota zero" });
  if (!["PLN", "EUR", "USD"].includes(row.currency)) {
    issues.push({ code: "E008", message: `Waluta: ${row.currency}` });
  }

  let needsReview = false;
  let useCashAccount = false;

  if (txType === "expense" && !row.source_account) {
    warnings.push({ code: "W006", message: "Gotówka PLN" });
    useCashAccount = true;
  }
  if (txType === "income" && !row.target_account) {
    warnings.push({ code: "R001", message: "Brak konta docelowego" });
    needsReview = true;
  }
  if (txType === "transfer") {
    if (!row.source_account && !row.target_account) {
      warnings.push({ code: "R003", message: "Transfer bez kont" });
      needsReview = true;
    } else if (!row.source_account || !row.target_account) {
      warnings.push({ code: "R002", message: "Transfer niekompletny" });
      needsReview = true;
    }
  }
  if (txType === "exchange") {
    if (!row.source_account || !row.target_account) {
      warnings.push({ code: "R004", message: "Przewalutowanie niekompletne" });
      needsReview = true;
    }
  }
  if (txType === "adjustment") {
    if (!row.source_account && !row.target_account) {
      warnings.push({ code: "R005", message: "Korekta bez konta" });
      needsReview = true;
    }
  }

  return {
    txType,
    issues,
    warnings,
    hasErrors: issues.length > 0,
    needsReview,
    useCashAccount,
    canCreateEntries: issues.length === 0 && !needsReview,
  };
}

async function ensureAccounts(supabase: SupabaseClient, userId: string, names: string[]) {
  const { data: existing } = await supabase
    .from("accounts")
    .select("id, name")
    .eq("user_id", userId)
    .is("deleted_at", null);
  const map = new Map((existing ?? []).map((a) => [a.name, a.id]));
  const toCreate = names
    .filter((n) => n && !map.has(n))
    .map((name) => ({
      user_id: userId,
      name,
      account_type: inferAccountTypeFromName(name),
      default_currency: /euro|eur/i.test(name) ? "EUR" : /usd/i.test(name) ? "USD" : "PLN",
      imported_at: new Date().toISOString(),
      ...IMPORTED_ACCOUNT_DEFAULTS,
    }));
  if (toCreate.length) {
    const { data: created, error } = await supabase.from("accounts").insert(toCreate).select("id, name");
    if (error) throw error;
    for (const a of created ?? []) map.set(a.name, a.id);
  }
  return map;
}

async function ensureCategories(
  supabase: SupabaseClient,
  userId: string,
  categories: { name: string; type: string }[],
  subcategories: { category: string; subcategory: string }[]
) {
  const { data: cats } = await supabase
    .from("categories")
    .select("id, name")
    .eq("user_id", userId)
    .is("deleted_at", null);
  const catMap = new Map((cats ?? []).map((c) => [c.name, c.id]));

  const newCats = categories.filter((c) => !catMap.has(c.name));
  if (newCats.length) {
    const { data: created, error } = await supabase
      .from("categories")
      .insert(newCats.map((c) => ({ user_id: userId, name: c.name, type: c.type, sort_order: 0 })))
      .select("id, name");
    if (error) throw error;
    for (const c of created ?? []) catMap.set(c.name, c.id);
  }

  const { data: subs } = await supabase
    .from("subcategories")
    .select("id, name, category_id")
    .eq("user_id", userId);
  const subMap = new Map((subs ?? []).map((s) => [`${s.category_id}|${s.name}`, s.id]));

  const newSubs = subcategories
    .map((s) => ({ category_id: catMap.get(s.category), name: s.subcategory }))
    .filter((s) => s.category_id && !subMap.has(`${s.category_id}|${s.name}`));

  if (newSubs.length) {
    const { data: created, error } = await supabase
      .from("subcategories")
      .insert(newSubs.map((s) => ({ user_id: userId, category_id: s.category_id!, name: s.name })))
      .select("id, name, category_id");
    if (error) throw error;
    for (const s of created ?? []) subMap.set(`${s.category_id}|${s.name}`, s.id);
  }

  return { catMap, subMap };
}

async function loadHashes(supabase: SupabaseClient, userId: string) {
  const hashes = new Set<string>();
  let from = 0;
  while (true) {
    const { data } = await supabase
      .from("import_rows")
      .select("import_hash")
      .eq("user_id", userId)
      .range(from, from + 999);
    if (!data?.length) break;
    for (const r of data) hashes.add(r.import_hash);
    if (data.length < 1000) break;
    from += 1000;
  }
  return hashes;
}

function resolveImportCategory(
  row: ReturnType<typeof normalizeRow>,
  txType: string | undefined,
  catMap: Map<string, string>,
  subMap: Map<string, string>,
  rules: CategorizationRule[]
): { categoryId: string | null; subcategoryId: string | null } {
  const isTransfer = txType === "transfer";
  if (isTransfer) return { categoryId: null, subcategoryId: null };

  let categoryId = row.category ? catMap.get(row.category) ?? null : null;
  let subcategoryId: string | null = null;

  if (categoryId && row.subcategory) {
    subcategoryId = subMap.get(`${categoryId}|${row.subcategory}`) ?? null;
  }

  if (!categoryId && rules.length > 0) {
    const matchText = [row.details, row.category].filter(Boolean).join(" ");
    const autoMatch = matchCategoryFromRules(matchText, rules);
    if (autoMatch) {
      categoryId = autoMatch.category_id;
      subcategoryId = autoMatch.subcategory_id;
    }
  }

  return { categoryId, subcategoryId };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processBatch(supabase: SupabaseClient, userId: string, importId: string, batch: any[], accountMap: Map<string, string>, catMap: Map<string, string>, subMap: Map<string, string>, hashes: Set<string>, rules: CategorizationRule[]) {
  const stats = { imported: 0, skipped: 0, errors: 0, warnings: 0, needsReview: 0 };
  const rpcItems: ImportBatchItem[] = [];

  for (const item of batch) {
    const { row, validation, importHash, duplicateInFile } = item;
    if (duplicateInFile || hashes.has(importHash)) {
      stats.skipped++;
      continue;
    }
    if (validation.hasErrors) {
      rpcItems.push({
        import_row: {
          row_number: row.row_number,
          raw_data: row.raw_data as Record<string, unknown>,
          import_hash: importHash,
          status: "error",
          validation_errors: validation.issues,
        },
        transaction: null,
        entries: [],
      });
      continue;
    }

    if (validation.warnings.length) stats.warnings++;
    if (validation.needsReview) stats.needsReview++;

    const { categoryId, subcategoryId } = resolveImportCategory(
      row,
      validation.txType,
      catMap,
      subMap,
      rules
    );

    const abs = Math.abs(row.amount);
    const pln = Math.round(abs * row.exchange_rate * 100) / 100;
    const entries: Record<string, unknown>[] = [];

    if (validation.canCreateEntries) {
      if (validation.txType === "income") {
        entries.push({ account_id: accountMap.get(row.target_account), amount: abs, currency: row.currency, exchange_rate: row.exchange_rate, amount_pln: pln, sort_order: 0 });
      } else if (validation.txType === "expense") {
        const acc = validation.useCashAccount ? CASH_ACCOUNT : row.source_account;
        entries.push({ account_id: accountMap.get(acc), amount: -abs, currency: row.currency, exchange_rate: row.exchange_rate, amount_pln: -pln, sort_order: 0 });
      } else if (validation.txType === "transfer") {
        entries.push({ account_id: accountMap.get(row.source_account), amount: -abs, currency: row.currency, exchange_rate: row.exchange_rate, amount_pln: -pln, sort_order: 0 });
        entries.push({ account_id: accountMap.get(row.target_account), amount: abs, currency: row.currency, exchange_rate: row.exchange_rate, amount_pln: pln, sort_order: 1 });
      } else if (validation.txType === "exchange") {
        entries.push({ account_id: accountMap.get(row.source_account), amount: -abs, currency: row.currency, exchange_rate: row.exchange_rate, amount_pln: -pln, sort_order: 0 });
        entries.push({ account_id: accountMap.get(row.target_account), amount: abs, currency: row.currency, exchange_rate: row.exchange_rate, amount_pln: pln, sort_order: 1 });
      } else if (validation.txType === "adjustment") {
        const acc = row.target_account || row.source_account;
        const signed = row.amount! < 0 ? -pln : pln;
        entries.push({ account_id: accountMap.get(acc), amount: row.amount!, currency: row.currency, exchange_rate: row.exchange_rate, amount_pln: signed, sort_order: 0 });
      }
    }

    const filteredEntries = entries
      .filter((e) => e.account_id)
      .map((e, idx) => ({
        account_id: e.account_id as string,
        amount: Number(e.amount),
        currency: e.currency as string,
        exchange_rate: Number(e.exchange_rate),
        amount_pln: Number(e.amount_pln),
        sort_order: (e.sort_order as number) ?? idx,
      }));

    const allIssues = [...validation.issues, ...validation.warnings];

    rpcItems.push({
      import_row: {
        row_number: row.row_number,
        raw_data: row.raw_data as Record<string, unknown>,
        import_hash: importHash,
        status: "valid",
        validation_errors: allIssues.length ? allIssues : null,
      },
      transaction: {
        date: row.date!,
        type: validation.txType!,
        description: row.category || row.details?.slice(0, 80) || null,
        details: row.details || null,
        category_id: categoryId,
        subcategory_id: subcategoryId,
        status: validation.needsReview ? "needs_review" : "confirmed",
        validation_issues: allIssues,
      },
      entries: filteredEntries,
    });
    hashes.add(importHash);
  }

  if (!rpcItems.length) return stats;

  const result = await rpcImportTransactionBatch(supabase, userId, importId, rpcItems);
  stats.imported = result.imported;
  stats.errors = result.errors;

  return stats;
}

async function excelBufferToRows(buffer: Buffer): Promise<Record<string, unknown>[]> {
  const matrix = await readXlsxFile(buffer);
  if (!matrix?.length) return [];

  const [headerRow, ...dataRows] = matrix;
  const headers = headerRow.map((cell) =>
    String(cell ?? "")
      .trim()
      .replace(/\s+/g, " ")
  );

  return dataRows
    .filter((row) => row.some((cell) => cell != null && String(cell).trim() !== ""))
    .map((row) => {
      const obj: Record<string, unknown> = {};
      for (let i = 0; i < headers.length; i++) {
        const key = headers[i] || `col_${i}`;
        obj[key] = row[i] ?? "";
      }
      return obj;
    });
}

export async function runImportFromBuffer(
  supabase: SupabaseClient,
  userId: string,
  buffer: Buffer,
  filename: string,
  force = false,
  options?: { maxRows?: number }
): Promise<ImportReport> {
  const fileHash = createHash("sha256").update(buffer).digest("hex");
  const rawRows = await excelBufferToRows(buffer);

  if (options?.maxRows != null && rawRows.length > options.maxRows) {
    throw new Error(
      `Za dużo wierszy (${rawRows.length}) — limit importu web: ${options.maxRows}. Użyj: npm run import:excel`
    );
  }

  const parsed = rawRows.map((raw, i) => {
    const row = normalizeRow(raw, i + 2);
    const validation = validateRow(row);
    const importHash = computeHash(row);
    return { row, validation, importHash, duplicateInFile: false };
  });

  const seen = new Set<string>();
  for (const item of parsed) {
    if (seen.has(item.importHash)) item.duplicateInFile = true;
    else seen.add(item.importHash);
  }

  if (!force) {
    const { data: prior } = await supabase
      .from("imports")
      .select("id")
      .eq("user_id", userId)
      .eq("file_hash", fileHash)
      .eq("status", "imported")
      .maybeSingle();
    if (prior) throw new Error("Ten plik był już importowany. Wyczyść dane lub użyj opcji wymuś.");
  }

  const accountNames = new Set([CASH_ACCOUNT]);
  const categoryMap = new Map<string, string>();
  const subSet = new Set<string>();

  for (const { row, validation } of parsed) {
    if (validation.hasErrors) continue;
    if (validation.txType === "income" && row.target_account) accountNames.add(row.target_account);
    if (validation.txType === "expense") {
      accountNames.add(validation.useCashAccount ? CASH_ACCOUNT : row.source_account);
    }
    if (
      (validation.txType === "transfer" ||
        validation.txType === "exchange" ||
        validation.txType === "adjustment") &&
      validation.canCreateEntries
    ) {
      if (row.source_account) accountNames.add(row.source_account);
      if (row.target_account) accountNames.add(row.target_account);
    }
    if (row.category && validation.txType !== "transfer") {
      categoryMap.set(row.category, validation.txType === "income" ? "income" : "expense");
      if (row.subcategory) subSet.add(`${row.category}\0${row.subcategory}`);
    }
  }

  const hashes = await loadHashes(supabase, userId);
  const rules = await loadActiveCategorizationRules(
    supabase as unknown as ServerSupabaseClient,
    userId
  );
  const accountMap = await ensureAccounts(supabase, userId, [...accountNames]);
  const { catMap, subMap } = await ensureCategories(
    supabase,
    userId,
    [...categoryMap.entries()].map(([name, type]) => ({ name, type })),
    [...subSet].map((k) => {
      const [category, subcategory] = k.split("\0");
      return { category, subcategory };
    })
  );

  const { data: imp, error: impErr } = await supabase
    .from("imports")
    .insert({
      user_id: userId,
      filename,
      file_hash: fileHash,
      status: "staged",
      total_rows: rawRows.length,
    })
    .select("id")
    .single();
  if (impErr) throw impErr;

  const totals = { imported: 0, skipped: 0, errors: 0, warnings: 0, needsReview: 0 };

  for (let i = 0; i < parsed.length; i += BATCH_SIZE) {
    const batch = parsed.slice(i, i + BATCH_SIZE);
    const s = await processBatch(supabase, userId, imp.id, batch, accountMap, catMap, subMap, hashes, rules);
    totals.imported += s.imported;
    totals.skipped += s.skipped;
    totals.errors += s.errors;
    totals.warnings += s.warnings;
    totals.needsReview += s.needsReview;
  }

  await supabase
    .from("imports")
    .update({
      status: "imported",
      imported_rows: totals.imported,
      skipped_rows: totals.skipped,
      error_rows: totals.errors,
      completed_at: new Date().toISOString(),
      error_log: { needs_review: totals.needsReview, warnings: totals.warnings },
    })
    .eq("id", imp.id);

  return {
    import_id: imp.id,
    filename,
    total_rows: rawRows.length,
    imported: totals.imported,
    skipped_duplicates: totals.skipped,
    errors: totals.errors,
    warnings: totals.warnings,
    needs_review: totals.needsReview,
  };
}

import { createHash } from "crypto";
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
import {
  buildImportIncomeExpenseEntry,
  buildTransferLegs,
} from "@/lib/import/signed-amounts";
import { signedAmountPln } from "@/lib/balances/invariants";
import { WEB_IMPORT_MAX_ROWS } from "@/lib/import/constants";
import { readExcelRowsFromBuffer } from "@/lib/import/excel-rows";

/** Klient Supabase w silniku importu (luźniejsze typy niż ServerSupabaseClient). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- import engine używa tabel spoza wygenerowanego schematu
type ImportSupabase = SupabaseClient<any, "public", any>;

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
  const payload = [
    row.date,
    row.type,
    row.amount,
    row.currency,
    row.source_account,
    row.target_account,
    row.details,
    row.category,
    row.subcategory,
  ]
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
    warnings.push({
      code: "W007",
      message: "Przychód bez konta docelowego — przypisano do Gotówka PLN",
    });
    useCashAccount = true;
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

async function ensureAccounts(supabase: ImportSupabase, userId: string, names: string[]) {
  const { data: existing } = await supabase
    .from("accounts")
    .select("id, name, default_currency")
    .eq("user_id", userId)
    .is("deleted_at", null);
  const map = new Map((existing ?? []).map((a) => [a.name, a.id]));
  const currencyMap = new Map(
    (existing ?? []).map((a) => [a.name, a.default_currency as string])
  );
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
    const { data: created, error } = await supabase
      .from("accounts")
      .insert(toCreate)
      .select("id, name, default_currency");
    if (error) throw error;
    for (const a of created ?? []) {
      map.set(a.name, a.id);
      currencyMap.set(a.name, a.default_currency as string);
    }
  }
  return { accountMap: map, currencyMap };
}

async function ensureCategories(
  supabase: ImportSupabase,
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

async function loadHashes(supabase: ImportSupabase, userId: string) {
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
async function processBatch(supabase: ImportSupabase, userId: string, importId: string, batch: any[], accountMap: Map<string, string>, accountCurrencyMap: Map<string, string>, catMap: Map<string, string>, subMap: Map<string, string>, hashes: Set<string>, rules: CategorizationRule[]) {
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

    const entries: Record<string, unknown>[] = [];

    if (validation.canCreateEntries) {
      if (validation.txType === "income" || validation.txType === "expense") {
        const signed = buildImportIncomeExpenseEntry(
          validation.txType,
          row.amount!,
          row.exchange_rate,
          row.currency
        );
        const accountKey = validation.useCashAccount
          ? CASH_ACCOUNT
          : validation.txType === "income"
            ? row.target_account
            : row.source_account;
        entries.push({
          account_id: accountMap.get(accountKey),
          amount: signed.amount,
          currency: row.currency,
          exchange_rate: row.exchange_rate,
          amount_pln: signed.amount_pln,
          sort_order: 0,
        });
      } else if (
        validation.txType === "transfer" ||
        validation.txType === "exchange"
      ) {
        const srcCur =
          accountCurrencyMap.get(row.source_account) ?? row.currency ?? "PLN";
        const tgtCur =
          accountCurrencyMap.get(row.target_account) ?? row.currency ?? "PLN";
        const legs = buildTransferLegs(
          row.amount!,
          row.currency,
          row.exchange_rate,
          srcCur,
          tgtCur
        );
        entries.push({
          account_id: accountMap.get(row.source_account),
          amount: legs.source.amount,
          currency: legs.source.currency,
          exchange_rate: legs.source.exchangeRate,
          amount_pln: legs.source.amountPln,
          sort_order: 0,
        });
        entries.push({
          account_id: accountMap.get(row.target_account),
          amount: legs.target.amount,
          currency: legs.target.currency,
          exchange_rate: legs.target.exchangeRate,
          amount_pln: legs.target.amountPln,
          sort_order: 1,
        });
      } else if (validation.txType === "adjustment") {
        const acc = row.target_account || row.source_account;
        entries.push({
          account_id: accountMap.get(acc),
          amount: row.amount!,
          currency: row.currency,
          exchange_rate: row.exchange_rate,
          amount_pln: signedAmountPln(row.amount!, row.exchange_rate, row.currency),
          sort_order: 0,
        });
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

export interface ImportPreview {
  filename: string;
  file_hash: string;
  total_rows: number;
  importable: number;
  errors: number;
  needs_review: number;
  duplicates_in_file: number;
  warnings: number;
  accounts: string[];
  categories: string[];
  already_imported: boolean;
  over_limit: boolean;
  max_rows: number;
}

type ParsedImportItem = {
  row: ReturnType<typeof normalizeRow>;
  validation: ReturnType<typeof validateRow>;
  importHash: string;
  duplicateInFile: boolean;
};

async function parseImportFile(
  buffer: Buffer,
  filename: string,
  maxRows?: number
): Promise<{
  fileHash: string;
  rawRows: Record<string, unknown>[];
  parsed: ParsedImportItem[];
  overLimit: boolean;
}> {
  const fileHash = createHash("sha256").update(buffer).digest("hex");
  const rawRows = await readExcelRowsFromBuffer(buffer);
  const limit = maxRows ?? WEB_IMPORT_MAX_ROWS;
  const overLimit = rawRows.length > limit;

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

  return { fileHash, rawRows, parsed, overLimit };
}

function collectPreviewMeta(parsed: ParsedImportItem[]) {
  const accountNames = new Set<string>([CASH_ACCOUNT]);
  const categoryMap = new Map<string, string>();

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
    }
  }

  return {
    accounts: [...accountNames].filter(Boolean).sort(),
    categories: [...categoryMap.keys()].sort(),
  };
}

export async function previewImportFromBuffer(
  supabase: ServerSupabaseClient,
  userId: string,
  buffer: Buffer,
  filename: string,
  maxRows = WEB_IMPORT_MAX_ROWS
): Promise<ImportPreview> {
  const db = supabase as unknown as ImportSupabase;
  const { fileHash, rawRows, parsed, overLimit } = await parseImportFile(buffer, filename, maxRows);

  const { data: prior } = await db
    .from("imports")
    .select("id")
    .eq("user_id", userId)
    .eq("file_hash", fileHash)
    .eq("status", "imported")
    .maybeSingle();

  const importable = parsed.filter(
    (p) => !p.validation.hasErrors && !p.duplicateInFile
  ).length;

  return {
    filename,
    file_hash: fileHash,
    total_rows: rawRows.length,
    importable,
    errors: parsed.filter((p) => p.validation.hasErrors).length,
    needs_review: parsed.filter((p) => p.validation.needsReview && !p.validation.hasErrors).length,
    duplicates_in_file: parsed.filter((p) => p.duplicateInFile).length,
    warnings: parsed.reduce((s, p) => s + p.validation.warnings.length, 0),
    already_imported: Boolean(prior),
    over_limit: overLimit,
    max_rows: maxRows,
    ...collectPreviewMeta(parsed),
  };
}

export async function runImportFromBuffer(
  supabase: ServerSupabaseClient,
  userId: string,
  buffer: Buffer,
  filename: string,
  force = false,
  options?: { maxRows?: number }
): Promise<ImportReport> {
  const db = supabase as unknown as ImportSupabase;
  const maxRows = options?.maxRows ?? WEB_IMPORT_MAX_ROWS;
  const { fileHash, rawRows, parsed, overLimit } = await parseImportFile(buffer, filename, maxRows);

  if (overLimit) {
    throw new Error(
      `Za dużo wierszy (${rawRows.length}) — limit importu web: ${maxRows}. Użyj: npm run import:excel`
    );
  }

  if (!force) {
    const { data: prior } = await db
      .from("imports")
      .select("id")
      .eq("user_id", userId)
      .eq("file_hash", fileHash)
      .eq("status", "imported")
      .maybeSingle();
    if (prior) {
      throw new Error("Ten plik był już importowany. Zaznacz „Wymuś ponowny import” lub wyczyść dane.");
    }
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

  const hashes = await loadHashes(db, userId);
  const rules = await loadActiveCategorizationRules(supabase, userId);
  const { accountMap, currencyMap } = await ensureAccounts(db, userId, [...accountNames]);
  const { catMap, subMap } = await ensureCategories(
    db,
    userId,
    [...categoryMap.entries()].map(([name, type]) => ({ name, type })),
    [...subSet].map((k) => {
      const [category, subcategory] = k.split("\0");
      return { category, subcategory };
    })
  );

  const { data: imp, error: impErr } = await db
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
    const s = await processBatch(db, userId, imp.id, batch, accountMap, currencyMap, catMap, subMap, hashes, rules);
    totals.imported += s.imported;
    totals.skipped += s.skipped;
    totals.errors += s.errors;
    totals.warnings += s.warnings;
    totals.needsReview += s.needsReview;
  }

  await db
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

#!/usr/bin/env node
/**
 * Import transakcji z Excela do Supabase (Faza 3).
 * Użycie: node scripts/import-excel.mjs [ścieżka.xlsx] [--dry-run] [--force]
 */

import { createHash } from "crypto";
import { readFileSync, existsSync, readdirSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname, basename } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import { readExcelRows } from "./lib/excel-rows.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const BATCH_SIZE = 500;
const CASH_ACCOUNT = "Gotówka PLN";
const DEFAULT_USER_EMAIL = "dmarkiewicz@go2.pl";

const INVESTMENT_ACCOUNTS = new Set([
  "LOKATY PLN",
  "Obligacje",
  "PZU MISS",
  "PZU ZROWN.",
  "XTB",
  "Inwestycje PLN",
]);

/** Konto księgowe transferów — wartość złota w module Inwestycje (instrument GOLD). */
const GOLD_LEDGER_ACCOUNTS = new Set(["ZŁOTO"]);

const TYPE_MAP = {
  expenses: "expense",
  income: "income",
  transfer: "transfer",
  exchange: "exchange",
  adjustment: "adjustment",
  przewalutowanie: "exchange",
  korekta: "adjustment",
};

function loadEnvLocal() {
  const path = join(ROOT, ".env.local");
  if (!existsSync(path)) return {};
  const env = {};
  for (const line of readFileSync(path, "utf-8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const m = trimmed.match(/^([^=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim();
  }
  return env;
}

function findExcelFile(argPath) {
  if (argPath && !argPath.startsWith("--")) return argPath;
  const rawDir = join(ROOT, "data", "raw");
  if (!existsSync(rawDir)) return null;
  const files = readdirSync(rawDir).filter((f) => /\.xlsx?$/i.test(f));
  return files.length > 0 ? join(rawDir, files[0]) : null;
}

function normalizeKey(key) {
  return key.trim().toLowerCase().replace(/\s+/g, " ");
}

function getField(row, ...names) {
  for (const [key, val] of Object.entries(row)) {
    const nk = normalizeKey(key);
    for (const name of names) {
      if (nk === normalizeKey(name)) return val ?? "";
    }
  }
  return "";
}

function asString(val) {
  if (val == null) return "";
  return String(val).trim();
}

function parseNumber(val) {
  if (val === "" || val == null) return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

function excelDateToISO(val) {
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

function normalizeCurrency(val) {
  const c = (val || "").trim().toUpperCase();
  if (!c) return "PLN";
  if (c === "EURO" || c === "EUR") return "EUR";
  if (c === "USD") return "USD";
  if (c === "PLN") return "PLN";
  return c;
}

function normalizeAccount(name) {
  if (!name) return "";
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  const canonical = {
    "portfel pln": "Portfel PLN",
    portfel: "Portfel PLN",
    "portfel euro": "Portfel EURO",
    "permanent euro": "Permanent EURO",
    "pożyczone [od]": "Pożyczone [od]",
    "pożyczone [do]": "Pożyczone [do]",
    mbank: "mBank PLN",
  };
  return canonical[lower] || trimmed;
}

function normalizeForHash(val) {
  return asString(val).toLowerCase().replace(/\s+/g, " ").trim();
}

function computeImportHash(row) {
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
    .map(normalizeForHash)
    .join("|");
  return createHash("sha256").update(payload).digest("hex");
}

function normalizeRow(raw, rowNumber) {
  const amount = parseNumber(getField(raw, "amount", " Amount "));
  const rate = parseNumber(getField(raw, "exchange rate", " Exchange Rate ")) ?? 1;
  const currency = normalizeCurrency(getField(raw, "currency of amount", "currency"));
  const type = asString(getField(raw, "type"));
  const source = normalizeAccount(getField(raw, "source account"));
  const target = normalizeAccount(getField(raw, "target account"));

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
    source_account: source,
    target_account: target,
    exchange_rate: rate,
    amount_pln: amount != null ? Math.round(Math.abs(amount) * rate * 100) / 100 : null,
    details: asString(getField(raw, "details")),
  };
}

function inferAccountType(name) {
  if (INVESTMENT_ACCOUNTS.has(name)) return "investment";
  if (GOLD_LEDGER_ACCOUNTS.has(name)) return "other";
  if (/^gotówka/i.test(name) || /^portfel/i.test(name)) return "cash";
  if (/pożyczone|hipoteczny/i.test(name)) return "loan";
  if (/karta|visa|mastercard|amex|credit\s*card/i.test(name)) return "credit_card";
  if (/xtb|inwestycje|lokaty|obligacje|pzu|ikze|krypto|robo-doradca/i.test(name)) return "investment";
  if (/\bzłoto\b|\bzlot\b/i.test(name)) return "other";
  if (/bank|mbank|ing|alior|millennium|nest|revolut|n26|bnp|agricole|velo|bph|bos|lego|multibank/i.test(name)) {
    return "bank";
  }
  return "other";
}

function inferDefaultCurrency(name) {
  if (/\b(euro|eur)\b/i.test(name)) return "EUR";
  if (/\b(usd|dolar)\b/i.test(name)) return "USD";
  return "PLN";
}

function validateRow(row) {
  const issues = [];
  const warnings = [];

  if (!row.date) {
    issues.push({ code: "E001", message: "Brak daty transakcji" });
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date)) {
    issues.push({ code: "E002", message: `Nie można sparsować daty: ${row.date}` });
  }

  if (!row.type) {
    issues.push({ code: "E003", message: "Brak typu transakcji" });
  }

  const txType = TYPE_MAP[row.type_lower];
  if (row.type && !txType) {
    issues.push({ code: "E004", message: `Nieznany typ: ${row.type}` });
  }

  if (row.amount === null) {
    issues.push({ code: "E005", message: "Brak kwoty" });
  } else if (row.amount === 0) {
    issues.push({ code: "E006", message: "Kwota równa zero" });
  }

  const supportedCurrencies = new Set(["PLN", "EUR", "USD"]);
  if (!row.currency) {
    issues.push({ code: "E007", message: "Brak waluty" });
  } else if (!supportedCurrencies.has(row.currency)) {
    issues.push({ code: "E008", message: `Nieobsługiwana waluta: ${row.currency}` });
  }

  if (row.currency && row.currency !== "PLN" && row.exchange_rate === 1) {
    warnings.push({ code: "W002", message: "Brak kursu — użyto 1.0" });
  }

  let needsReview = false;
  let useCashAccount = false;

  if (txType === "expense") {
    if (!row.source_account) {
      warnings.push({ code: "W006", message: "Wydatek bez konta — przypisano do Gotówka PLN" });
      useCashAccount = true;
    }
    if (!row.category) {
      warnings.push({ code: "W001", message: "Brak kategorii" });
    }
  }

  if (txType === "income") {
    if (!row.target_account) {
      warnings.push({
        code: "W007",
        message: "Przychód bez konta docelowego — przypisano do Gotówka PLN",
      });
      useCashAccount = true;
    }
    if (!row.category) {
      warnings.push({ code: "W001", message: "Brak kategorii" });
    }
  }

  if (txType === "transfer") {
    if (!row.source_account && !row.target_account) {
      warnings.push({ code: "R003", message: "Transfer bez kont" });
      needsReview = true;
    } else if (!row.source_account || !row.target_account) {
      warnings.push({ code: "R002", message: "Transfer niekompletny" });
      needsReview = true;
    }
    if (row.category) {
      warnings.push({ code: "W005", message: "Transfer z kategorią — ignorowano kategorię" });
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

  const hasErrors = issues.length > 0;
  return {
    txType,
    issues,
    warnings,
    hasErrors,
    needsReview,
    useCashAccount,
    canCreateEntries: !hasErrors && !needsReview,
  };
}

function signedAmountPln(amount, exchangeRate) {
  const abs = Math.round(Math.abs(amount) * exchangeRate * 100) / 100;
  return amount < 0 ? -abs : abs;
}

function buildIncomeExpenseEntry(txType, excelAmount, exchangeRate) {
  const amountPln = signedAmountPln(excelAmount, exchangeRate);
  if (txType === "income") {
    return { amount: excelAmount, amount_pln: amountPln };
  }
  return { amount: -excelAmount, amount_pln: -amountPln };
}

function buildEntries(row, validation, accountMap) {
  if (!validation.canCreateEntries) return [];

  const entries = [];

  if (validation.txType === "income" || validation.txType === "expense") {
    const signed = buildIncomeExpenseEntry(
      validation.txType,
      row.amount,
      row.exchange_rate
    );
    const accountName = validation.useCashAccount
      ? CASH_ACCOUNT
      : validation.txType === "income"
        ? row.target_account
        : row.source_account;
    entries.push({
      account_id: accountMap.get(accountName),
      amount: signed.amount,
      currency: row.currency,
      exchange_rate: row.exchange_rate,
      amount_pln: signed.amount_pln,
      sort_order: 0,
    });
  } else if (validation.txType === "transfer") {
    const absAmount = Math.abs(row.amount);
    const amountPln = Math.round(absAmount * row.exchange_rate * 100) / 100;
    entries.push({
      account_id: accountMap.get(row.source_account),
      amount: -absAmount,
      currency: row.currency,
      exchange_rate: row.exchange_rate,
      amount_pln: -amountPln,
      sort_order: 0,
    });
    entries.push({
      account_id: accountMap.get(row.target_account),
      amount: absAmount,
      currency: row.currency,
      exchange_rate: row.exchange_rate,
      amount_pln: amountPln,
      sort_order: 1,
    });
  } else if (validation.txType === "exchange") {
    const absAmount = Math.abs(row.amount);
    const amountPln = Math.round(absAmount * row.exchange_rate * 100) / 100;
    entries.push({
      account_id: accountMap.get(row.source_account),
      amount: -absAmount,
      currency: row.currency,
      exchange_rate: row.exchange_rate,
      amount_pln: -amountPln,
      sort_order: 0,
    });
    entries.push({
      account_id: accountMap.get(row.target_account),
      amount: absAmount,
      currency: row.currency,
      exchange_rate: row.exchange_rate,
      amount_pln: amountPln,
      sort_order: 1,
    });
  } else if (validation.txType === "adjustment") {
    const acc = row.target_account || row.source_account;
    const signed = signedAmountPln(row.amount, row.exchange_rate);
    entries.push({
      account_id: accountMap.get(acc),
      amount: row.amount,
      currency: row.currency,
      exchange_rate: row.exchange_rate,
      amount_pln: signed,
      sort_order: 0,
    });
  }

  return entries.filter((e) => e.account_id);
}

async function resolveUserId(supabase, email) {
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw new Error(`Nie można pobrać użytkowników: ${error.message}`);
  const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) throw new Error(`Nie znaleziono użytkownika: ${email}`);
  return user.id;
}

async function loadExistingHashes(supabase, userId) {
  const hashes = new Set();
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("import_rows")
      .select("import_hash")
      .eq("user_id", userId)
      .range(from, from + pageSize - 1);

    if (error) throw new Error(`Błąd pobierania hashy: ${error.message}`);
    if (!data?.length) break;
    for (const row of data) hashes.add(row.import_hash);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return hashes;
}

async function loadExistingRowNumbers(supabase, userId) {
  const rowNumbers = new Set();
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("import_rows")
      .select("row_number")
      .eq("user_id", userId)
      .range(from, from + pageSize - 1);

    if (error) throw new Error(`Błąd pobierania numerów wierszy: ${error.message}`);
    if (!data?.length) break;
    for (const row of data) rowNumbers.add(row.row_number);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return rowNumbers;
}

function markDuplicateInFile(items) {
  const seen = new Set();
  for (const item of items) {
    if (seen.has(item.importHash)) {
      item.duplicateInFile = true;
    } else {
      item.duplicateInFile = false;
      seen.add(item.importHash);
    }
  }
}

async function ensureAccounts(supabase, userId, accountNames) {
  const { data: existing, error: loadError } = await supabase
    .from("accounts")
    .select("id, name")
    .eq("user_id", userId)
    .is("deleted_at", null);

  if (loadError) throw new Error(`Błąd ładowania kont: ${loadError.message}`);

  const map = new Map(existing.map((a) => [a.name, a.id]));
  const toCreate = [];

  for (const name of accountNames) {
    if (!name || map.has(name)) continue;
    toCreate.push({
      user_id: userId,
      name,
      account_type: inferAccountType(name),
      default_currency: inferDefaultCurrency(name),
      imported_at: new Date().toISOString(),
      is_active: false,
      lifecycle_status: "archived",
      show_on_dashboard: false,
      include_in_net_worth: false,
      needs_review: true,
    });
  }

  if (toCreate.length > 0) {
    const { data: created, error } = await supabase.from("accounts").insert(toCreate).select("id, name");
    if (error) throw new Error(`Błąd tworzenia kont: ${error.message}`);
    for (const acc of created) map.set(acc.name, acc.id);
  }

  return { map, created: toCreate.map((a) => a.name) };
}

async function ensureCategories(supabase, userId, categories, subcategories) {
  const { data: existingCats, error: catError } = await supabase
    .from("categories")
    .select("id, name")
    .eq("user_id", userId)
    .is("deleted_at", null);

  if (catError) throw new Error(`Błąd ładowania kategorii: ${catError.message}`);

  const catMap = new Map(existingCats.map((c) => [c.name, c.id]));
  const newCategories = [];

  for (const { name, type } of categories) {
    if (!name || catMap.has(name)) continue;
    newCategories.push({
      user_id: userId,
      name,
      type,
      sort_order: 0,
    });
  }

  if (newCategories.length > 0) {
    const { data: created, error } = await supabase
      .from("categories")
      .insert(newCategories)
      .select("id, name");
    if (error) throw new Error(`Błąd tworzenia kategorii: ${error.message}`);
    for (const cat of created) catMap.set(cat.name, cat.id);
  }

  const { data: existingSubs, error: subError } = await supabase
    .from("subcategories")
    .select("id, name, category_id")
    .eq("user_id", userId)
    .is("deleted_at", null);

  if (subError) throw new Error(`Błąd ładowania podkategorii: ${subError.message}`);

  const subMap = new Map(existingSubs.map((s) => [`${s.category_id}|${s.name}`, s.id]));
  const newSubs = [];

  for (const { category, subcategory } of subcategories) {
    if (!category || !subcategory) continue;
    const categoryId = catMap.get(category);
    if (!categoryId) continue;
    const key = `${categoryId}|${subcategory}`;
    if (subMap.has(key)) continue;
    newSubs.push({
      user_id: userId,
      category_id: categoryId,
      name: subcategory,
    });
    subMap.set(key, null);
  }

  if (newSubs.length > 0) {
    const { data: created, error } = await supabase
      .from("subcategories")
      .insert(newSubs)
      .select("id, name, category_id");
    if (error) throw new Error(`Błąd tworzenia podkategorii: ${error.message}`);
    for (const sub of created) subMap.set(`${sub.category_id}|${sub.name}`, sub.id);
  }

  return {
    catMap,
    subMap,
    newCategories: newCategories.map((c) => c.name),
    newSubs: newSubs.map((s) => s.name),
  };
}

function getSubcategoryId(subMap, categoryId, subcategory) {
  if (!categoryId || !subcategory) return null;
  return subMap.get(`${categoryId}|${subcategory}`) ?? null;
}

async function processBatch(supabase, userId, importId, batch, accountMap, catMap, subMap, existingHashes) {
  const stats = {
    imported: 0,
    skipped: 0,
    errors: 0,
    warnings: 0,
    needsReview: 0,
  };

  const rpcItems = [];

  for (const item of batch) {
    const { row, validation, importHash } = item;
    const allIssues = [...validation.issues, ...validation.warnings];

    if (item.duplicateInFile || existingHashes.has(importHash)) {
      stats.skipped++;
      continue;
    }

    if (validation.hasErrors) {
      rpcItems.push({
        import_row: {
          row_number: row.row_number,
          raw_data: row.raw_data,
          import_hash: importHash,
          status: "error",
          validation_errors: validation.issues,
        },
        transaction: null,
        entries: [],
      });
      continue;
    }

    if (validation.warnings.length > 0) stats.warnings++;

    const isTransfer = validation.txType === "transfer";
    const categoryId = !isTransfer && row.category ? catMap.get(row.category) ?? null : null;
    const subcategoryId = !isTransfer ? getSubcategoryId(subMap, categoryId, row.subcategory) : null;

    const txStatus = validation.needsReview ? "needs_review" : "confirmed";
    if (validation.needsReview) stats.needsReview++;

    const entries = buildEntries(row, validation, accountMap).map((e, idx) => ({
      ...e,
      sort_order: e.sort_order ?? idx,
    }));

    rpcItems.push({
      import_row: {
        row_number: row.row_number,
        raw_data: row.raw_data,
        import_hash: importHash,
        status: "valid",
        validation_errors: allIssues.length ? allIssues : null,
      },
      transaction: {
        date: row.date,
        type: validation.txType,
        description: row.category || row.details?.slice(0, 80) || null,
        details: row.details || null,
        category_id: categoryId,
        subcategory_id: subcategoryId,
        status: txStatus,
        validation_issues: allIssues,
      },
      entries,
    });

    existingHashes.add(importHash);
  }

  if (rpcItems.length === 0) return stats;

  const { data, error } = await supabase.rpc("import_transaction_batch", {
    p_user_id: userId,
    p_import_id: importId,
    p_items: rpcItems,
  });

  if (error) {
    throw new Error(
      `Błąd RPC import_transaction_batch: ${error.message}. Zastosuj migrację 10: npm run db:migrate:10`
    );
  }

  stats.imported = Number(data?.imported ?? 0);
  stats.errors = Number(data?.errors ?? 0);

  return stats;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const force = args.includes("--force");
  const backfill = args.includes("--backfill");
  const filePath = findExcelFile(args[0]);

  if (!filePath || !existsSync(filePath)) {
    console.error("❌ Nie znaleziono pliku Excel w data/raw/");
    process.exit(1);
  }

  const env = { ...loadEnvLocal(), ...process.env };
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const userEmail = env.IMPORT_USER_EMAIL || DEFAULT_USER_EMAIL;

  if (!url || !serviceKey) {
    console.error("❌ Brak NEXT_PUBLIC_SUPABASE_URL lub SUPABASE_SERVICE_ROLE_KEY w .env.local");
    process.exit(1);
  }

  console.log(`📂 Plik: ${filePath}`);
  console.log(`👤 Użytkownik: ${userEmail}`);
  if (dryRun) console.log("🔍 Tryb dry-run — bez zapisu do bazy\n");
  if (backfill) console.log("📥 Tryb backfill — tylko wiersze bez rekordu import_rows\n");

  const fileBuffer = readFileSync(filePath);
  const fileHash = createHash("sha256").update(fileBuffer).digest("hex");

  const rawRows = await readExcelRows(fileBuffer);
  const rows = rawRows.map((raw, i) => normalizeRow(raw, i + 2));

  console.log(`📊 Wierszy: ${rows.length}`);

  const parsed = rows.map((row) => {
    const validation = validateRow(row);
    const importHash = computeImportHash(row);
    return { row, validation, importHash };
  });

  markDuplicateInFile(parsed);

  let itemsToProcess = parsed;

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const userId = env.IMPORT_USER_ID || (await resolveUserId(supabase, userEmail));
  console.log(`\n🔑 user_id: ${userId}`);

  if (backfill) {
    const existingRowNumbers = await loadExistingRowNumbers(supabase, userId);
    itemsToProcess = parsed.filter((item) => !existingRowNumbers.has(item.row.row_number));
    markDuplicateInFile(itemsToProcess);
    console.log(
      `📥 Backfill: ${itemsToProcess.length} wierszy bez import_rows (z ${parsed.length} w pliku)`
    );
  }

  const accountNames = new Set([CASH_ACCOUNT]);
  const categoryMap = new Map();
  const subcategorySet = new Set();

  for (const { row, validation } of itemsToProcess) {
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
      const catType = validation.txType === "income" ? "income" : "expense";
      if (!categoryMap.has(row.category)) categoryMap.set(row.category, catType);
      if (row.subcategory) subcategorySet.add(`${row.category}\0${row.subcategory}`);
    }
  }

  const uniqueCategories = [...categoryMap.entries()].map(([name, type]) => ({ name, type }));
  const subcategoryDefs = [...subcategorySet].map((key) => {
    const [category, subcategory] = key.split("\0");
    return { category, subcategory };
  });

  const preview = {
    mode: backfill ? "backfill" : "full",
    accounts: [...accountNames].filter(Boolean).sort(),
    categories: uniqueCategories.map((c) => c.name).sort(),
    errors: itemsToProcess.filter((p) => p.validation.hasErrors).length,
    needsReview: itemsToProcess.filter((p) => p.validation.needsReview && !p.validation.hasErrors).length,
    importable: itemsToProcess.filter((p) => !p.validation.hasErrors && !p.duplicateInFile).length,
    duplicates_in_file: itemsToProcess.filter((p) => p.duplicateInFile).length,
  };

  console.log(`\n📋 Konta do utworzenia/użycia: ${preview.accounts.length}`);
  console.log(`📋 Kategorie: ${preview.categories.length}`);
  console.log(`✅ Do importu: ${preview.importable}`);
  console.log(`🔴 needs_review: ${preview.needsReview}`);
  console.log(`❌ Błędy (pominięte): ${preview.errors}`);
  console.log(`🔁 Duplikaty w pliku: ${preview.duplicates_in_file}`);

  if (dryRun) {
    const outDir = join(ROOT, "data", "processed");
    mkdirSync(outDir, { recursive: true });
    const reportPath = join(outDir, backfill ? "import-backfill-preview.json" : "import-preview.json");
    writeFileSync(
      reportPath,
      JSON.stringify({ filePath, fileHash, rowCount: rows.length, processed_rows: itemsToProcess.length, preview }, null, 2),
      "utf-8"
    );
    console.log(`\n✅ Podgląd zapisany: ${reportPath}`);
    return;
  }

  if (!force && !backfill) {
    const { data: prior } = await supabase
      .from("imports")
      .select("id, status, imported_rows")
      .eq("user_id", userId)
      .eq("file_hash", fileHash)
      .eq("status", "imported")
      .maybeSingle();

    if (prior) {
      console.log(`\n⚠️  Ten plik był już importowany (import_id: ${prior.id}, wierszy: ${prior.imported_rows})`);
      console.log("   Użyj --force aby powtórzyć (duplikaty wierszy i tak zostaną pominięte).");
      return;
    }
  }

  const existingHashes = await loadExistingHashes(supabase, userId);
  console.log(`🔁 Istniejące hashe: ${existingHashes.size}`);

  const { map: accountMap, created: newAccounts } = await ensureAccounts(supabase, userId, preview.accounts);
  console.log(`💳 Konta: ${accountMap.size} (${newAccounts.length} nowych)`);

  const { catMap, subMap, newCategories, newSubs } = await ensureCategories(
    supabase,
    userId,
    uniqueCategories,
    subcategoryDefs
  );
  console.log(`🏷️  Kategorie: ${catMap.size} (${newCategories.length} nowych), podkategorie: ${newSubs.length} nowych`);

  const { data: importRecord, error: importError } = await supabase
    .from("imports")
    .insert({
      user_id: userId,
      filename: basename(filePath),
      file_hash: fileHash,
      status: "staged",
      total_rows: rows.length,
    })
    .select("id")
    .single();

  if (importError) throw new Error(`Błąd tworzenia importu: ${importError.message}`);
  const importId = importRecord.id;
  console.log(`\n📥 import_id: ${importId}`);

  const totals = {
    imported: 0,
    skipped: 0,
    errors: 0,
    warnings: 0,
    needsReview: 0,
  };

  const batches = [];
  for (let i = 0; i < itemsToProcess.length; i += BATCH_SIZE) {
    batches.push(itemsToProcess.slice(i, i + BATCH_SIZE));
  }

  for (let i = 0; i < batches.length; i++) {
    const batchStats = await processBatch(
      supabase,
      userId,
      importId,
      batches[i],
      accountMap,
      catMap,
      subMap,
      existingHashes
    );
    totals.imported += batchStats.imported;
    totals.skipped += batchStats.skipped;
    totals.errors += batchStats.errors;
    totals.warnings += batchStats.warnings;
    totals.needsReview += batchStats.needsReview;
    process.stdout.write(`\r⏳ Batch ${i + 1}/${batches.length} — imported: ${totals.imported}`);
  }

  console.log("");

  const { error: finalizeError } = await supabase
    .from("imports")
    .update({
      status: "imported",
      imported_rows: totals.imported,
      skipped_rows: totals.skipped,
      error_rows: totals.errors,
      completed_at: new Date().toISOString(),
      error_log: { needs_review: totals.needsReview, warnings: totals.warnings },
    })
    .eq("id", importId);

  if (finalizeError) throw new Error(`Błąd finalizacji importu: ${finalizeError.message}`);

  const report = {
    import_id: importId,
    filename: basename(filePath),
    mode: backfill ? "backfill" : "full",
    total_rows: rows.length,
    processed_rows: itemsToProcess.length,
    imported: totals.imported,
    skipped_duplicates: totals.skipped,
    errors: totals.errors,
    warnings: totals.warnings,
    needs_review: totals.needsReview,
    new_accounts: newAccounts,
    new_categories: newCategories,
    date_range: {
      from: rows.reduce((m, r) => (r.date && (!m || r.date < m) ? r.date : m), null),
      to: rows.reduce((m, r) => (r.date && (!m || r.date > m) ? r.date : m), null),
    },
  };

  const outDir = join(ROOT, "data", "processed");
  mkdirSync(outDir, { recursive: true });
  const reportPath = join(outDir, backfill ? "import-backfill-report.json" : "import-report.json");
  writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf-8");

  console.log("\n✅ Import zakończony");
  console.log(`   Zaimportowano:     ${totals.imported}`);
  console.log(`   Pominięte (dupl.): ${totals.skipped}`);
  console.log(`   Błędy:             ${totals.errors}`);
  console.log(`   needs_review:      ${totals.needsReview}`);
  console.log(`   Ostrzeżenia:       ${totals.warnings}`);
  if (newAccounts.length > 0) {
    console.log(`\n📋 Nowe konta (${newAccounts.length}) — domyślnie archiwalne.`);
    console.log("   Aktywuj aktualne konta w aplikacji: /accounts/manage");
  }
  console.log(`\n📄 Raport: ${reportPath}`);
}

main().catch((err) => {
  console.error(`\n❌ ${err.message}`);
  process.exit(1);
});
